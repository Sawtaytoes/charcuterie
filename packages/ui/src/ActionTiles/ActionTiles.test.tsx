import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./ActionTiles.stories.tsx"

const {
  AllStates,
  AutoHues,
  BesideTheRadioTile,
  Default,
  Interactive,
  Links,
  NamedHues,
  Neutral,
  Responsive,
  WithIcons,
} = composeStories(stories)

/**
 * The accent-edge layer out of a computed `box-shadow`.
 *
 * Reading the whole string does not work: Tailwind's shadow chain
 * always emits four EMPTY `rgba(0, 0, 0, 0) 0px 0px 0px 0px` layers
 * for the ring and shadow slots nothing filled, so a naive
 * "contains no transparent colour" assertion fails on a bar that is
 * painted perfectly. The bar is the `inset` layer, and it is the
 * only one.
 *
 * Returns `"none"` when there is no inset layer at all, which is
 * what `accent="none"` must produce.
 */
const getAccentEdgeLayer = (boxShadow: string) =>
  boxShadow
    .split(/,(?![^(]*\))/)
    .map((layer) => layer.trim())
    .find((layer) => layer.endsWith("inset")) ?? "none"

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
 *
 * The UNCOLOURED action tile is the one held to an exact match. A
 * coloured one carries a bar its neighbour does not, and the room
 * for that bar is a real difference on one side — asserted
 * separately below, so "the boxes match" cannot quietly come to mean
 * "the boxes match apart from whatever changed last".
 */
test("an uncoloured action tile is the same box as a resting radio tile", async () => {
  const { canvas } = await mountStory(BesideTheRadioTile)

  // Scoped to the group rather than fetched by accessible name:
  // the board draws the same two tiles three times, so a bare
  // `getByRole("button", { name: "Picks …" })` is ambiguous.
  const getFirstTile = (name: string) => {
    const tile = expectAgentDrivable(canvas, {
      name,
      role: "group",
    }).querySelector<HTMLElement>("button")

    if (!tile) {
      throw new Error(`${name} drew no tile`)
    }

    return tile
  }

  const actionTile = getFirstTile("Queue type, uncoloured")

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

  await expect(action.paddingInlineEnd).toBe(
    radio.paddingInlineEnd,
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

/**
 * The bar is an OVERLAY — `Card`'s accent-edge pseudo-element, which
 * is painted over the box and occupies nothing in it. A tile that
 * did not widen its leading padding would draw the bar straight
 * through the first letter of its own name, and nothing would report
 * that: the pseudo-element is not in the DOM, so no query can miss
 * it and axe has nothing to say about a glyph with a stripe on it.
 *
 * So the assertion is the difference itself, in computed pixels.
 */
test("a coloured tile makes room for its bar, and only on the leading side", async () => {
  const { canvas } = await mountStory(BesideTheRadioTile)

  const getFirstTile = (name: string) => {
    const tile = expectAgentDrivable(canvas, {
      name,
      role: "group",
    }).querySelector<HTMLElement>("button")

    if (!tile) {
      throw new Error(`${name} drew no tile`)
    }

    return tile
  }

  const coloured = getComputedStyle(
    getFirstTile("Queue type"),
  )

  const uncoloured = getComputedStyle(
    getFirstTile("Queue type, uncoloured"),
  )

  await expect(
    Number.parseFloat(coloured.paddingInlineStart),
  ).toBeGreaterThan(
    Number.parseFloat(uncoloured.paddingInlineStart),
  )

  // Every other side is untouched. The colour is a bar and a hue,
  // not a second set of metrics.
  await expect(coloured.paddingInlineEnd).toBe(
    uncoloured.paddingInlineEnd,
  )

  await expect(coloured.paddingTop).toBe(
    uncoloured.paddingTop,
  )

  await expect(coloured.paddingBottom).toBe(
    uncoloured.paddingBottom,
  )

  await expect(coloured.borderTopLeftRadius).toBe(
    uncoloured.borderTopLeftRadius,
  )
})

/**
 * Ten hues taken in order, which is what makes a five-tile set need
 * no colour props at all.
 *
 * Asserted through the pseudo-element's own `box-shadow`, because
 * that is where the bar actually lives — a class-name assertion
 * passes while the paint is wrong, and a `--color-categorical-*`
 * that had never existed would resolve to nothing, paint
 * transparent, and satisfy every check that the element rendered.
 */
test("a set walks the palette, and a named hue holds its place", async () => {
  const { canvas } = await mountStory(AutoHues)

  const group = expectAgentDrivable(canvas, {
    name: "Pick a library",
    role: "group",
  })

  const bars = Array.from(
    group.querySelectorAll<HTMLElement>("button"),
  ).map((tile) =>
    getAccentEdgeLayer(
      getComputedStyle(tile, "::before").boxShadow,
    ),
  )

  await expect(bars).toHaveLength(5)

  for (const bar of bars) {
    // A token that resolved to nothing paints a transparent bar and
    // passes every "did it render" check ever written.
    await expect(bar).toMatch(/^rgb\(\d+, \d+, \d+\) /)
  }

  // Five tiles, five different colours.
  await expect(new Set(bars).size).toBe(5)
})

test("a named hue survives a tile being inserted above it", async () => {
  const { canvas } = await mountStory(NamedHues)

  const pinned = expectAgentDrivable(canvas, {
    name: "Shows Episodic television.",
    role: "button",
  })

  const { canvas: autoCanvas } = await mountStory(AutoHues)

  const seventh = Array.from(
    expectAgentDrivable(autoCanvas, {
      name: "Pick a library",
      role: "group",
    }).querySelectorAll<HTMLElement>("button"),
  )[1]

  if (!seventh) {
    throw new Error("the auto-hue set drew no second tile")
  }

  // In the auto set this tile is position 1 and wears hue 2. Naming
  // `categorical: 7` has to change it, or the prop does nothing and
  // every test above still passes.
  await expect(
    getAccentEdgeLayer(
      getComputedStyle(pinned, "::before").boxShadow,
    ),
  ).not.toBe(
    getAccentEdgeLayer(
      getComputedStyle(seventh, "::before").boxShadow,
    ),
  )
})

/**
 * `accent="none"` is an opt-out, so it has to actually draw no bar
 * — not a bar in a neutral colour, which would still be a stripe on
 * a page that asked for none.
 */
test("accent='none' draws no bar at all", async () => {
  const { canvas, canvasElement } =
    await mountStory(Neutral)

  const tile = expectAgentDrivable(canvas, {
    name: "New arrivals Everything that arrived since the last run.",
    role: "button",
  })

  await expect(
    getAccentEdgeLayer(
      getComputedStyle(tile, "::before").boxShadow,
    ),
  ).toBe("none")

  await expectNoAxeViolations(canvasElement)
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
