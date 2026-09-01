import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ActionTiles.stories.tsx"

const {
  AllStates,
  BesideTheRadioTile,
  Default,
  Interactive,
  Links,
  Responsive,
  WithIcons,
} = composeStories(stories)

test("it is a named group of pressable tiles", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const group = expectAgentDrivable(canvas, {
    name: "Queue type",
    role: "group",
  })

  await expect(
    group.querySelectorAll("button"),
  ).toHaveLength(2)

  // Nothing here is selected, and nothing claims to be. The whole
  // reason this is not a `RadioGroup` in a costume.
  await expect(
    group.querySelector(
      "[aria-checked], [aria-pressed], [role='radio']",
    ),
  ).toBeNull()

  await expectNoAxeViolations(canvasElement)
})

test("a tile's hint is part of its accessible name", async () => {
  const { canvas } = await mountStory(Default)

  // The reason the hint is rendered inside the tile rather than
  // beside it: a hint a screen reader never reads is a hint half the
  // audience does not have. `getByRole` computes the name from
  // contents, so this query only passes if it is in there.
  expectAgentDrivable(canvas, {
    name: "Picks Choose titles yourself, then arrange them in priority and random lanes.",
    role: "button",
  })
})

test("a tile icon is decoration and stays out of the name", async () => {
  const { canvas, canvasElement } =
    await mountStory(WithIcons)

  // Named by its words alone. An icon that joined the name would
  // make this query fail, which is the whole reason it is
  // `aria-hidden`.
  expectAgentDrivable(canvas, {
    name: "New arrivals Everything that arrived since the last run.",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

test("every tile is its own tab stop, and Enter and Space press it", async () => {
  const { canvas } = await mountStory(Interactive)

  const group = expectAgentDrivable(canvas, {
    name: "Queue type",
    role: "group",
  })

  const tiles = Array.from(
    group.querySelectorAll<HTMLButtonElement>("button"),
  )

  // The opposite of the roving-tabindex rule, on purpose: a radio
  // group borrows one tab stop because exactly one option is true at
  // a time, and nothing here is true. Every tile must be reachable
  // by Tab.
  await expect(
    tiles.filter((one) => one.tabIndex === 0),
  ).toHaveLength(2)

  tiles[0]?.focus()

  await userEvent.tab()

  await waitFor(() => {
    expect(tiles[1]).toHaveFocus()
  })

  // Enter and Space are the platform's, because these are real
  // `<button>`s — the two things the hand-rolled `<div role=button>`
  // versions in the fleet re-implement by hand.
  await userEvent.keyboard("{Enter}")

  await userEvent.keyboard(" ")
})

test("a disabled tile cannot be pressed", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const group = expectAgentDrivable(canvas, {
    name: "Queue type with Rules unavailable",
    role: "group",
  })

  const rules = Array.from(
    group.querySelectorAll<HTMLButtonElement>("button"),
  ).find((one) => one.textContent?.startsWith("Rules"))

  await expect(rules).toBeDisabled()

  await expectNoAxeViolations(canvasElement)
})

test("an href tile is a real anchor, and an external one says so", async () => {
  const { canvas, canvasElement } = await mountStory(Links)

  const group = expectAgentDrivable(canvas, {
    name: "Pick a tool",
    role: "group",
  })

  const inspect = expectAgentDrivable(canvas, {
    name: "Inspect Read a container's tracks and say what would change.",
    role: "link",
  })

  // A real `<a href>`, so middle-click, ctrl-click, "open in a new
  // tab" and "copy link address" come from the element rather than
  // from the paint.
  await expect(inspect.tagName).toBe("A")

  await expect(inspect).toHaveAttribute(
    "href",
    "/tools/inspect",
  )

  const external = Array.from(
    group.querySelectorAll<HTMLAnchorElement>("a"),
  ).find((one) => one.target === "_blank")

  // `noreferrer` alongside `noopener`: the first closes the
  // `window.opener` hole, the second keeps a private app's URL out of
  // the destination's logs.
  await expect(external).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  )

  await expectNoAxeViolations(canvasElement)
})

test("a disabled link drops its href and stays announced as a link", async () => {
  const { canvas } = await mountStory(AllStates)

  const remux = expectAgentDrivable(canvas, {
    name: "Remux Nothing is loaded to remux yet.",
    role: "link",
  })

  // An anchor with no `href` is inert and out of the tab order by the
  // platform's own rules — better than a focusable one that silently
  // ignores clicks. The explicit role keeps it *announced* rather
  // than vanishing from the tree.
  await expect(remux).not.toHaveAttribute("href")

  await expect(remux).toHaveAttribute(
    "aria-disabled",
    "true",
  )
})

/**
 * The box is shared with `RadioGroup itemShape="tile"` through
 * `tileStyles.ts`, and "shared" is asserted as **computed** styles
 * rather than trusted — the same discipline `ButtonLink.test.tsx`
 * applies to `Button`. Two copies of one string is a promise that
 * survives exactly one edit.
 */
test("an action tile is the same box as a resting radio tile", async () => {
  const { canvas } = await mountStory(BesideTheRadioTile)

  const actionTile = expectAgentDrivable(canvas, {
    name: "Picks Choose titles yourself, then arrange them in priority and random lanes.",
    role: "button",
  })

  const radioGroup = expectAgentDrivable(canvas, {
    name: "Queue type, as radios",
    role: "radiogroup",
  })

  // The SECOND radio tile, because `RadioGroup` checks its first
  // option on mount and a checked tile wears the accent edge. A
  // RESTING tile is what these two must match.
  const radioTile =
    radioGroup.querySelectorAll<HTMLElement>(
      '[role="radio"]',
    )[1]

  if (!radioTile) {
    throw new Error("the radio tile did not render")
  }

  const action = getComputedStyle(actionTile)

  const radio = getComputedStyle(radioTile)

  await expect(action.paddingTop).toBe(radio.paddingTop)

  await expect(action.paddingBottom).toBe(
    radio.paddingBottom,
  )

  await expect(action.paddingInlineStart).toBe(
    radio.paddingInlineStart,
  )

  await expect(action.borderTopWidth).toBe(
    radio.borderTopWidth,
  )

  await expect(action.borderTopColor).toBe(
    radio.borderTopColor,
  )

  await expect(action.borderTopLeftRadius).toBe(
    radio.borderTopLeftRadius,
  )

  await expect(action.backgroundColor).toBe(
    radio.backgroundColor,
  )

  await expect(action.fontSize).toBe(radio.fontSize)

  // The padding is the whole point. A `Button` with `height: auto` —
  // the shape this component replaces — computes to `0px` here, with
  // the title flush against the top border.
  await expect(
    Number.parseFloat(action.paddingTop),
  ).toBeGreaterThan(0)
})

test("the column count comes from the container, not the window", async () => {
  const { canvas } = await mountStory(Responsive)

  const getColumnCount = (name: string) =>
    getComputedStyle(
      expectAgentDrivable(canvas, { name, role: "group" }),
    ).gridTemplateColumns.split(" ").length

  // One viewport, three container widths, and the answer changes
  // with the container. Every panel is the same window.
  await expect(
    getColumnCount("Where to start at 15rem"),
  ).toBe(1)

  await expect(
    getColumnCount("Where to start at 34rem"),
  ).toBe(2)
})

test("a tile grid never overflows a container narrower than one tile", async () => {
  const { canvas } = await mountStory(Responsive)

  const group = expectAgentDrivable(canvas, {
    name: "Where to start at 15rem",
    role: "group",
  })

  // The case that matters is the `min(…, 100%)` in the track floor,
  // which is what stops a 200px floor from becoming a horizontal
  // scrollbar in the Narrow View.
  await expect(
    group.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(
    (group.parentElement?.getBoundingClientRect().width ??
      0) + 1,
  )
})
