import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./SortableTableHeader.stories.tsx"

const { AllVariants, Default, Interactive } =
  composeStories(stories)

/**
 * `aria-sort` exists **nowhere in the fleet** — not in mux-magic,
 * not in rip-deck, not in castkit. The one sortable table renders
 * the state as `{sortDirection === "asc" ? "▲" : "▼"}`, which a
 * screen reader announces as "black up-pointing triangle" if the
 * font has it at all, and this sandbox's headless Chromium does not.
 */
test("the cell announces the sort, not the glyph", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const title = expectAgentDrivable(canvas, {
    name: "Title",
    role: "columnheader",
  })

  await expect(title).toHaveAttribute(
    "aria-sort",
    "ascending",
  )

  await expectNoAxeViolations(canvasElement)
})

/**
 * `none`, not an omitted attribute. Absent means "this column is not
 * sortable"; `none` means "sortable, not currently sorted" — and a
 * table mixing the two tells a screen-reader user the other columns
 * cannot be sorted at all.
 */
test("an unsorted sortable column says `none`", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  await expect(
    expectAgentDrivable(canvas, {
      name: "Size",
      role: "columnheader",
    }),
  ).toHaveAttribute("aria-sort", "none")

  await expect(
    expectAgentDrivable(canvas, {
      name: "Year",
      role: "columnheader",
    }),
  ).toHaveAttribute("aria-sort", "descending")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The cell announces and the button acts. Putting the role on the
 * button instead is the common mistake, and it breaks the grid
 * semantics — a `<th>` that is a button is no longer a column header
 * to anything reading the table's structure.
 */
test("the header is a columnheader containing a button", async () => {
  const { canvas } = await mountStory(Default)

  const header = expectAgentDrivable(canvas, {
    name: "Title",
    role: "columnheader",
  })

  await expect(header.tagName).toBe("TH")

  await expect(header).toHaveAttribute("scope", "col")

  const button = expectAgentDrivable(canvas, {
    name: "Title",
    role: "button",
  })

  await expect(header).toContainElement(button)
})

test("clicking an unsorted column asks for ascending", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Year",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Year",
        role: "columnheader",
      }),
    ).toHaveAttribute("aria-sort", "ascending")
  })

  // Exactly one column ever holds a direction — the invariant a
  // hand-rolled `▲`/`▼` cannot express at all.
  await expect(
    expectAgentDrivable(canvas, {
      name: "Title",
      role: "columnheader",
    }),
  ).toHaveAttribute("aria-sort", "none")
})

test("clicking the sorted column reverses it", async () => {
  const { canvas } = await mountStory(Interactive)

  const title = expectAgentDrivable(canvas, {
    name: "Title",
    role: "button",
  })

  await userEvent.click(title)

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Title",
        role: "columnheader",
      }),
    ).toHaveAttribute("aria-sort", "descending")
  })

  await userEvent.click(title)

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Title",
        role: "columnheader",
      }),
    ).toHaveAttribute("aria-sort", "ascending")
  })
})

/**
 * The name stays the column's name. Appending the state —
 * "Title, sorted ascending" — duplicates what `aria-sort` already
 * says *and* breaks `getByRole("columnheader", { name: "Title" })`
 * the moment somebody sorts it.
 */
test("sorting does not rename the column", async () => {
  const { canvas } = await mountStory(Interactive)

  await userEvent.click(
    expectAgentDrivable(canvas, {
      name: "Title",
      role: "button",
    }),
  )

  await waitFor(() => {
    expect(
      expectAgentDrivable(canvas, {
        name: "Title",
        role: "columnheader",
      }),
    ).toHaveAttribute("aria-sort", "descending")
  })

  // Still exactly one match, and still under the same name.
  expectAgentDrivable(canvas, {
    name: "Title",
    role: "columnheader",
  })
})
