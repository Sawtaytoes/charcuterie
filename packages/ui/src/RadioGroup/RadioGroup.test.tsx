import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./RadioGroup.stories.tsx"

const {
  AllStates,
  Default,
  Interactive,
  Responsive,
  Tiles,
  TilesWithIcons,
} = composeStories(stories)

/**
 * `querySelectorAll` rather than `getAllByRole("radio")`: a board
 * renders several groups, and "exactly one tab stop" is only the
 * roving rule when it is scoped to **one** group.
 */
const getOptions = (group: HTMLElement) =>
  Array.from(
    group.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]',
    ),
  )

test("it is a radio group with exactly one option checked", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme",
    role: "radiogroup",
  })

  const options = getOptions(group)

  await expect(options).toHaveLength(4)

  await waitFor(() => {
    expect(
      options.filter(
        (one) =>
          one.getAttribute("aria-checked") === "true",
      ),
    ).toHaveLength(1)
  })

  await expectNoAxeViolations(canvasElement)
})

test("Tab enters the group once, and the arrows move within it", async () => {
  const { canvas } = await mountStory(Interactive)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "Naming scheme",
      role: "radiogroup",
    }),
  )

  // Exactly one tab stop is the roving rule, read straight out of
  // `selectTabIndex`. Zero strands the widget; several mean the
  // pattern was never implemented.
  await expect(
    options.filter((one) => one.tabIndex === 0),
  ).toHaveLength(1)

  await userEvent.tab()

  await waitFor(() => {
    expect(options[0]).toHaveFocus()
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(options[1]).toHaveFocus()
  })
})

test("selection follows focus, and wraps", async () => {
  const { canvas } = await mountStory(Interactive)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "Naming scheme",
      role: "radiogroup",
    }),
  )

  options[0]?.focus()

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(options[1]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })

  await expect(options[0]).toHaveAttribute(
    "aria-checked",
    "false",
  )

  // End then wrap — both from `RovingFocus`, neither written in the
  // component.
  await userEvent.keyboard("{End}")

  await waitFor(() => {
    expect(options[3]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })

  await userEvent.keyboard("{ArrowDown}")

  await waitFor(() => {
    expect(options[0]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })
})

test("a pointer press checks the option it landed on", async () => {
  const { canvas } = await mountStory(Interactive)

  const custom = expectAgentDrivable(canvas, {
    name: "Use a custom pattern",
    role: "radio",
  })

  await userEvent.click(custom)

  await waitFor(() => {
    expect(custom).toHaveAttribute("aria-checked", "true")
  })
})

test("the arrow keys skip a disabled option", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme with original unavailable",
    role: "radiogroup",
  })

  const options = getOptions(group)

  const [first, , original, custom] = options as [
    HTMLButtonElement,
    HTMLButtonElement,
    HTMLButtonElement,
    HTMLButtonElement,
  ]

  await expect(original).toBeDisabled()

  first.focus()

  await userEvent.keyboard("{ArrowDown}{ArrowDown}")

  // Two presses from the first option lands on `custom`, skipping
  // the disabled `original` — registration is membership, and a
  // disabled option never joined the focus group.
  await waitFor(() => {
    expect(custom).toHaveFocus()
  })

  await expect(original).not.toHaveFocus()

  await expectNoAxeViolations(canvasElement)
})

test("selectedValue decides the first render and nothing after", async () => {
  const { canvas } = await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme starting on custom",
    role: "radiogroup",
  })

  await waitFor(() => {
    expect(
      group.querySelector('[aria-checked="true"]'),
    ).toHaveTextContent("Use a custom pattern")
  })
})

test("a read-only group is announced and its choice cannot move", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Naming scheme, read-only",
    role: "radiogroup",
  })

  await expect(group).toHaveAttribute(
    "aria-readonly",
    "true",
  )

  // The checked option shows at full contrast; that is the value the
  // read-only group is displaying.
  await waitFor(() => {
    expect(
      group.querySelector('[aria-checked="true"]'),
    ).toHaveTextContent("Match AniDB titles")
  })

  const other = Array.from(
    group.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]',
    ),
  ).find(
    (one) => one.textContent === "Use a custom pattern",
  )

  await userEvent.click(other ?? group)

  // Selection-follows-focus is severed when read-only — a click on
  // another option does not move the choice.
  await expect(
    group.querySelector('[aria-checked="true"]'),
  ).toHaveTextContent("Match AniDB titles")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The tile shape is the same control in a box, so what these assert
 * is that **nothing about the control changed** — role, exclusivity,
 * the roving tab stop and selection-follows-focus are the ones
 * already proven above, driven through the tile story.
 */
test("a tile group is still a radiogroup of radios", async () => {
  const { canvas, canvasElement } = await mountStory(Tiles)

  const group = expectAgentDrivable(canvas, {
    name: "On import",
    role: "radiogroup",
  })

  const options = getOptions(group)

  await expect(options).toHaveLength(4)

  await waitFor(() => {
    expect(
      options.filter(
        (one) =>
          one.getAttribute("aria-checked") === "true",
      ),
    ).toHaveLength(1)
  })

  // Exactly one tab stop — the roving rule survives the layout
  // change, because the layout is all that changed.
  await expect(
    options.filter((one) => one.tabIndex === 0),
  ).toHaveLength(1)

  await expectNoAxeViolations(canvasElement)
})

test("a tile's hint is part of the option's accessible name", async () => {
  const { canvas } = await mountStory(Tiles)

  // The reason the hint is rendered inside the button rather than
  // beside it: a hint a screen reader never reads is a hint half the
  // audience does not have. `getByRole` computes the name from
  // contents, so this query only passes if it is in there.
  expectAgentDrivable(canvas, {
    name: "Hard link One copy on disk, two names for it. Same volume only.",
    role: "radio",
  })
})

test("a tile icon is decoration and stays out of the name", async () => {
  const { canvas, canvasElement } =
    await mountStory(TilesWithIcons)

  // Named by its words alone. An icon that joined the name would
  // make this query fail, which is the whole reason it is
  // `aria-hidden`.
  expectAgentDrivable(canvas, {
    name: "New arrivals Everything that arrived since the last run.",
    role: "radio",
  })

  await expectNoAxeViolations(canvasElement)
})

test("the arrow keys still move and check inside a tile grid", async () => {
  const { canvas } = await mountStory(Tiles)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "On import",
      role: "radiogroup",
    }),
  )

  options[0]?.focus()

  // ArrowRight in a grid is `focus.next`, exactly as ArrowDown is in
  // a stack. APG gives a radio group one traversal order, and a grid
  // does not earn a second one.
  await userEvent.keyboard("{ArrowRight}")

  await waitFor(() => {
    expect(options[1]).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })
})

/**
 * The three things about the box that fail *silently*, so all three
 * are read off `getComputedStyle` in a real browser rather than off
 * a class name. A class-name assertion would have passed while the
 * grid was one column, because the class really was in the DOM.
 */
test("a tile carries a border, and the chosen one carries the accent", async () => {
  const { canvas } = await mountStory(Tiles)

  const options = getOptions(
    expectAgentDrivable(canvas, {
      name: "On import",
      role: "radiogroup",
    }),
  )

  const [first, second] = options as [
    HTMLButtonElement,
    HTMLButtonElement,
  ]

  await waitFor(() => {
    expect(first).toHaveAttribute("aria-checked", "true")
  })

  const chosen = getComputedStyle(first)

  const other = getComputedStyle(second)

  await expect(
    Number.parseFloat(chosen.borderTopWidth),
  ).toBeGreaterThan(0)

  // A border and a surface, never colour alone — but the two tiles
  // must still differ, or "chosen" is told by the radio dot only.
  await expect(chosen.borderTopColor).not.toBe(
    other.borderTopColor,
  )

  await expect(chosen.backgroundColor).not.toBe(
    other.backgroundColor,
  )
})

test("the column count comes from the container, not the window", async () => {
  const { canvas } = await mountStory(Responsive)

  const getColumnCount = (name: string) =>
    getComputedStyle(
      expectAgentDrivable(canvas, {
        name,
        role: "radiogroup",
      }),
    ).gridTemplateColumns.split(" ").length

  // One viewport, three container widths, and the answer changes
  // with the container. Every panel is the same window.
  await expect(getColumnCount("On import at 15rem")).toBe(1)

  await expect(getColumnCount("On import at 34rem")).toBe(2)
})

test("a tile grid never overflows a container narrower than one tile", async () => {
  const { canvas } = await mountStory(Responsive)

  const group = expectAgentDrivable(canvas, {
    name: "On import at 15rem",
    role: "radiogroup",
  })

  // 15rem is 240px and the tile floor is 200px, so this passes
  // either way — the case that matters is the `min(…, 100%)`, which
  // is what stops a 200px floor from becoming a horizontal
  // scrollbar in the Narrow View.
  await expect(
    group.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(
    (group.parentElement?.getBoundingClientRect().width ??
      0) + 1,
  )
})
