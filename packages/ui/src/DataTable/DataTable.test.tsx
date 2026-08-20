import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import {
  DESKTOP,
  setViewport,
} from "../viewport.testHelpers.ts"
import * as stories from "./DataTable.stories.tsx"

const { AllVariants, Default, Interactive, Responsive } =
  composeStories(stories)

/**
 * The `<caption>` is the table's accessible name. Without one a
 * screen reader announces "table, 6 columns, 5 rows" and nothing a
 * reader could use to decide whether to enter it — and
 * `getByRole("table", { name })`, the query an agent writes, has
 * nothing to match on.
 */
test("the table is drivable by role and name", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const table = expectAgentDrivable(canvas, {
    name: "Tasks",
    role: "table",
  })

  await expect(table.tagName).toBe("TABLE")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The composition, asserted rather than assumed: a sortable column
 * is a `SortableTableHeader`, so it is a `<th>` carrying `aria-sort`
 * with a `<button>` inside it, and a non-sortable one has **no**
 * `aria-sort` at all — absent is how the attribute says "this column
 * cannot be sorted", where `"none"` would say the opposite.
 */
test("sortable columns announce, unsortable ones stay silent", async () => {
  const { canvas } = await mountStory(Default)

  const updated = expectAgentDrivable(canvas, {
    name: "Updated",
    role: "columnheader",
  })

  await expect(updated).toHaveAttribute(
    "aria-sort",
    "descending",
  )

  await expect(
    expectAgentDrivable(canvas, {
      name: "Task",
      role: "columnheader",
    }),
  ).toHaveAttribute("aria-sort", "none")

  const assignee = expectAgentDrivable(canvas, {
    name: "Assignee",
    role: "columnheader",
  })

  await expect(assignee).not.toHaveAttribute("aria-sort")

  await expect(
    canvas.queryAllByRole("button", { name: "Assignee" }),
  ).toHaveLength(0)
})

/**
 * The half the component does *not* own, proved by the half it does:
 * clicking a header changes `aria-sort` **and** the story's rows
 * come back in a different order, because the story sorted them.
 *
 * `priority` is the column that makes the split worth having. Its
 * order is high → medium → low and its alphabetical order is
 * high → low → medium, so a table that sorted its own rows would
 * have to be handed a comparator to get this right anyway.
 */
test("a sort request re-orders the consumer's rows", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Priority",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Priority",
        role: "columnheader",
      }),
    ).toHaveAttribute("aria-sort", "ascending")
  })

  const getFirstRowPriority = () =>
    canvas
      .getAllByRole("row")[1]
      ?.textContent?.includes("high")

  await expect(getFirstRowPriority()).toBe(true)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Priority",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Priority",
        role: "columnheader",
      }),
    ).toHaveAttribute("aria-sort", "descending")
  })

  await expect(getFirstRowPriority()).toBe(false)

  // Exactly one column ever holds a direction.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Task",
      role: "columnheader",
    }),
  ).toHaveAttribute("aria-sort", "none")
})

/**
 * A gate, not a nicety. The sort control is reachable with `Tab` in
 * document order and the ring is a **measured** outline — a class
 * assertion would pass on a component whose ring never paints.
 */
test("a sortable header takes keyboard focus with a visible ring", async () => {
  const { canvas } = await mountStory(Interactive)

  const sortButton = expectAgentDrivable(canvas, {
    name: "Task",
    role: "button",
  })

  // The selection column is first in document order, so the first
  // stop is its header box and the second is the first sortable
  // column. Asserting both is the tab order itself.
  await userEvent.tab()

  await waitFor(() => {
    expect(document.activeElement).toBe(
      expectAgentDrivable(canvas, {
        name: "Select every row",
        role: "checkbox",
      }),
    )
  })

  await userEvent.tab()

  await waitFor(() => {
    expect(document.activeElement).toBe(sortButton)
  })

  const { outlineStyle, outlineWidth } =
    globalThis.getComputedStyle(sortButton)

  await expect(outlineStyle).toBe("solid")

  await expect(
    Number.parseFloat(outlineWidth),
  ).toBeGreaterThan(0)

  await userEvent.keyboard("{Enter}")

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Task",
        role: "columnheader",
      }),
    ).toHaveAttribute("aria-sort", "descending")
  })
}, 15000)

/**
 * `indeterminate` is a **DOM property with no HTML attribute**, so
 * there is no markup that could have set it — which is the shortest
 * proof that the header box is written to rather than rendered.
 */
test("selecting some rows puts the header box in its third state", async () => {
  const { canvas, canvasElement } =
    await mountStory(Interactive)

  const firstRowBox = expectAgentDrivable(canvas, {
    name: "Book the chimney sweep",
    role: "checkbox",
  }) as HTMLInputElement

  await userEvent.click(firstRowBox)

  const selectAllBox = expectAgentDrivable(canvas, {
    name: "Select every row",
    role: "checkbox",
  }) as HTMLInputElement

  await waitFor(() => {
    expect(selectAllBox.indeterminate).toBe(true)
  })

  await expect(selectAllBox.checked).toBe(false)

  // …and it is *painted*. `Checkbox` renders an `appearance-none`
  // box, so before `indeterminate:` reached it the property was set,
  // a screen reader announced "mixed", and the box on screen was
  // indistinguishable from empty.
  const mixedMark =
    selectAllBox.parentElement?.querySelector(
      "svg:last-of-type",
    ) as SVGElement

  await expect(
    globalThis.getComputedStyle(mixedMark).visibility,
  ).toBe("visible")

  await userEvent.click(selectAllBox)

  await waitFor(() => {
    expect(selectAllBox.indeterminate).toBe(false)
  })

  await expect(selectAllBox.checked).toBe(true)

  for (const box of canvas.getAllByRole("checkbox")) {
    await expect((box as HTMLInputElement).checked).toBe(
      true,
    )
  }

  await expectNoAxeViolations(canvasElement)
})

/**
 * The falsifiable half of "the checkboxes are written to, not
 * re-mounted": a re-mount would take the focus with it, one row into
 * a keyboard pass down the column. This is the assertion that fails
 * if anyone ever swaps the effect for a state-bearing `key`.
 */
test("ticking a row keeps the focus on the box that was ticked", async () => {
  const { canvas } = await mountStory(Interactive)

  const rowBox = expectAgentDrivable(canvas, {
    name: "Label the spare keys",
    role: "checkbox",
  })

  rowBox.focus()

  await userEvent.keyboard(" ")

  await waitFor(() => {
    expect((rowBox as HTMLInputElement).checked).toBe(true)
  })

  await expect(document.activeElement).toBe(rowBox)

  // And the row says so to CSS, which is what paints it — not
  // `aria-selected`, which belongs to `grid` rows rather than
  // `table` rows.
  await waitFor(() => {
    expect(rowBox.closest("tr")).toHaveAttribute(
      "data-is-selected",
      "true",
    )
  })
}, 15000)

/**
 * The container query, measured — the claim the whole component
 * rests on.
 *
 * `Responsive` renders the same table into three fixed panels
 * inside **one** window, so nothing about the viewport changes
 * between these two assertions. At 15rem a cell is a `flex` block
 * carrying its own column label; at 34rem — past `--cq-md` (32rem)
 * — the same cell is a `table-cell` and the label is gone, because
 * the header row is back above it.
 *
 * A `@media` query cannot produce this result at all: both tables
 * are in the same window at the same zoom.
 */
test("the layout follows the container, not the window", async () => {
  // 1440px of window, so the three panels can be the widths they
  // claim — and so the wide table's own container is genuinely the
  // thing being measured. The first panel is 240px inside that same
  // 1440px window, which is the sentence a media query cannot say.
  await setViewport(DESKTOP)

  const { canvas, canvasElement } =
    await mountStory(Responsive)

  const narrowTable = expectAgentDrivable(canvas, {
    name: "Tasks at 15rem",
    role: "table",
  })

  const wideTable = expectAgentDrivable(canvas, {
    name: "Tasks at 34rem",
    role: "table",
  })

  const getFirstCell = (table: HTMLElement) =>
    table.querySelector("tbody td") as HTMLElement

  const narrowCell = getFirstCell(narrowTable)

  const wideCell = getFirstCell(wideTable)

  await expect(
    globalThis.getComputedStyle(narrowCell).display,
  ).toBe("flex")

  await expect(
    globalThis.getComputedStyle(wideCell).display,
  ).toBe("table-cell")

  // The in-cell column label: present and painted when narrow,
  // `display: none` when the header row is doing that job.
  const getLabel = (cell: HTMLElement) =>
    cell.querySelector(
      "[aria-hidden='true']",
    ) as HTMLElement

  await expect(
    globalThis.getComputedStyle(getFirstCell(narrowTable))
      .display,
  ).toBe("flex")

  await expect(
    globalThis.getComputedStyle(getLabel(narrowCell))
      .display,
  ).not.toBe("none")

  await expect(
    globalThis.getComputedStyle(getLabel(wideCell)).display,
  ).toBe("none")

  // Reflow, not a pan surface: nothing in the narrow panel is
  // wider than the panel.
  const panel = narrowTable.parentElement as HTMLElement

  await expect(narrowTable.scrollWidth).toBeLessThanOrEqual(
    panel.clientWidth + 1,
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * The rows go, the table stays. A filter that matches nothing
 * swapping the whole table for a message takes the sort the reader
 * just set — and every column header — away with it.
 */
test("an empty table keeps its headers", async () => {
  const { canvas } = await mountStory(AllVariants)

  const emptyHeading = canvas.getByRole("heading", {
    name: "No tasks",
  })

  await expect(emptyHeading.closest("table")).not.toBeNull()

  await expect(
    emptyHeading
      .closest("table")
      ?.querySelectorAll("thead th"),
  ).toHaveLength(5)
})
