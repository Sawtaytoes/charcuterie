import { composeStories } from "@storybook/react"
import { expect, userEvent, waitFor } from "storybook/test"
import { test } from "vitest"

import { expectNoAxeViolations } from "../expectNoAxeViolations.testHelpers.ts"
import { mountStory } from "../mountStory.testHelpers.ts"
import { expectAgentDrivable } from "../testing/index.ts"
import * as stories from "./PortraitTiles.stories.tsx"

const {
  AllStates,
  AllVariants,
  Default,
  Interactive,
  NamedHues,
  Responsive,
  WithPictures,
} = composeStories(stories)

test("it is a named group of pressable portraits", async () => {
  const { canvas, canvasElement } =
    await mountStory(Default)

  const group = expectAgentDrivable(canvas, {
    name: "Who's shopping?",
    role: "group",
  })

  await expect(
    group.querySelectorAll("button"),
  ).toHaveLength(4)

  // Nothing here is selected, and nothing claims to be — the same
  // call `ActionTiles` makes. A picker that keeps a value is
  // `RadioGroup itemShape="tile"`.
  await expect(
    group.querySelector(
      "[aria-checked], [aria-pressed], [role='radio']",
    ),
  ).toBeNull()

  await expectNoAxeViolations(canvasElement)
})

/**
 * The number and its unit are both inside the tile, so both are
 * computed into the accessible name. "1,240" on its own tells a
 * screen-reader user nothing at all, and "Avery" alone loses the
 * thing the portrait was being chosen by.
 */
test("the name, the number and its unit are one accessible name", async () => {
  const { canvas } = await mountStory(Default)

  expectAgentDrivable(canvas, {
    name: "Avery 1,240 points",
    role: "button",
  })
})

/**
 * The avatar is decoration: the name it sits beside is inside the
 * same tile, so an announced picture is the label read twice. This
 * holds for the initials fallback and for a real `<img>`, which is
 * why both are checked.
 */
test("the face stays out of the accessible name", async () => {
  const { canvas, canvasElement } =
    await mountStory(WithPictures)

  const group = expectAgentDrivable(canvas, {
    name: "Who's shopping?",
    role: "group",
  })

  for (const image of group.querySelectorAll("img")) {
    await expect(image).toHaveAttribute("alt", "")
  }

  // Named by its words alone. An initial that joined the name would
  // read "A Avery 1,240 points".
  expectAgentDrivable(canvas, {
    name: "Casey 2,015 points",
    role: "button",
  })

  await expectNoAxeViolations(canvasElement)
})

/**
 * A 404 is the case this shape cannot absorb: a torn hole where a
 * face was, beside three that loaded. `onError` is the only signal a
 * browser gives, and the fallback is the one the caller already
 * supplied for "no picture".
 *
 * The story points a portrait at a file that does not exist, so this
 * is the real failure rather than a mocked one.
 */
test("a picture that fails to load falls back to the initials", async () => {
  const { canvas } = await mountStory(WithPictures)

  const group = expectAgentDrivable(canvas, {
    name: "Who's shopping?",
    role: "group",
  })

  await waitFor(async () => {
    const broken = Array.from(
      group.querySelectorAll<HTMLImageElement>("img"),
    ).find((one) =>
      one.src.includes("this-file-does-not-exist"),
    )

    // Gone from the DOM entirely, replaced by the letter — not left
    // in place with a broken-image glyph in it.
    await expect(broken).toBeUndefined()
  })

  const bailey = expectAgentDrivable(canvas, {
    name: "Bailey 860 points",
    role: "button",
  })

  await expect(bailey.textContent).toContain("B")
})

/**
 * `layout="auto"` reads the container and never the window. Every
 * panel in the board is the same window, so a difference between
 * them can only have come from the container.
 */
test("the arrangement comes from the container, not the window", async () => {
  const { canvas } = await mountStory(Responsive)

  const getTileDirection = (name: string) => {
    const tile = expectAgentDrivable(canvas, {
      name,
      role: "group",
    }).querySelector<HTMLElement>("button")

    if (!tile) {
      throw new Error(`${name} drew no portrait`)
    }

    return getComputedStyle(tile).flexDirection
  }

  // Below `cq-sm` there is no room to stack: a face beside a name is
  // what fits in one narrow column.
  await expect(
    getTileDirection("Who's shopping at 15rem"),
  ).toBe("row")

  await expect(
    getTileDirection("Who's shopping at 34rem"),
  ).toBe("column")
})

test("a fixed layout skips the query", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllVariants)

  const getTileDirection = (name: string) => {
    const tile = expectAgentDrivable(canvas, {
      name,
      role: "group",
    }).querySelector<HTMLElement>("button")

    if (!tile) {
      throw new Error(`${name} drew no portrait`)
    }

    return getComputedStyle(tile).flexDirection
  }

  // Both cells are the same width. Only the prop differs, which is
  // the point of having one.
  await expect(
    getTileDirection("Who's shopping, as rows"),
  ).toBe("row")

  await expect(
    getTileDirection("Who's shopping, as columns"),
  ).toBe("column")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The hue has to reach the paint, and the assertion is a computed
 * colour rather than a class name. A `--color-categorical-*` that
 * had never existed resolves to nothing, paints transparent, and
 * satisfies every check that the element rendered — which is exactly
 * how a token name that did not exist shipped in Docket.
 */
test("each portrait wears a different hue, and a named one holds it", async () => {
  const { canvas } = await mountStory(Default)

  const faces = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping?",
      role: "group",
    }).querySelectorAll<HTMLElement>(
      "button > *:first-child",
    ),
  ).map((face) => getComputedStyle(face).backgroundColor)

  await expect(faces).toHaveLength(4)

  for (const face of faces) {
    await expect(face).not.toBe("rgba(0, 0, 0, 0)")
  }

  await expect(new Set(faces).size).toBe(4)

  const { canvas: pinnedCanvas } =
    await mountStory(NamedHues)

  const pinned = Array.from(
    expectAgentDrivable(pinnedCanvas, {
      name: "Who's shopping, with pinned colours",
      role: "group",
    }).querySelectorAll<HTMLElement>(
      "button > *:first-child",
    ),
  ).map((face) => getComputedStyle(face).backgroundColor)

  // Avery is position 0 in both sets. Naming `categorical: 3` has to
  // change its colour, or the prop does nothing and every assertion
  // above still passes.
  await expect(pinned[0]).not.toBe(faces[0])
})

test("every portrait is its own tab stop, and Enter and Space press it", async () => {
  const { canvas } = await mountStory(Interactive)

  const tiles = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping?",
      role: "group",
    }).querySelectorAll<HTMLButtonElement>("button"),
  )

  await expect(
    tiles.filter((one) => one.tabIndex === 0),
  ).toHaveLength(2)

  tiles[0]?.focus()

  await userEvent.tab()

  await waitFor(() => {
    expect(tiles[1]).toHaveFocus()
  })

  await userEvent.keyboard("{Enter}")

  await userEvent.keyboard(" ")
})

test("a disabled portrait cannot be pressed", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const bailey = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping, with Bailey unavailable",
      role: "group",
    }).querySelectorAll<HTMLButtonElement>("button"),
  ).find((one) => one.textContent?.includes("Bailey"))

  await expect(bailey).toBeDisabled()

  await expectNoAxeViolations(canvasElement)
})

test("an href portrait is a real anchor", async () => {
  const { canvas, canvasElement } =
    await mountStory(AllStates)

  const avery = Array.from(
    expectAgentDrivable(canvas, {
      name: "Who's shopping, as links",
      role: "group",
    }).querySelectorAll<HTMLAnchorElement>("a"),
  ).find((one) => one.textContent?.includes("Avery"))

  // A real `<a href>`, so middle-click, ctrl-click, "open in a new
  // tab" and "copy link address" come from the element rather than
  // from the paint.
  await expect(avery).toHaveAttribute("href", "/avery")

  await expectNoAxeViolations(canvasElement)
})

/**
 * The box is shared with the other tile shapes through
 * `tileStyles.ts`. Two tile sets on one page have to be the same
 * card, and "identical" spelled as two copies of one string is a
 * promise that survives exactly one edit.
 */
test("a portrait is the same box as an action tile", async () => {
  const { canvas } = await mountStory(Default)

  const portrait = expectAgentDrivable(canvas, {
    name: "Avery 1,240 points",
    role: "button",
  })

  const style = getComputedStyle(portrait)

  await expect(style.borderTopWidth).toBe("1px")

  await expect(style.borderTopLeftRadius).not.toBe("0px")

  await expect(
    Number.parseFloat(style.paddingTop),
  ).toBeGreaterThan(0)
})
