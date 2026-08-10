import { composeStories } from "@storybook/react"
import { expect, waitFor } from "storybook/test"
import { test } from "vitest"

import { mountStory } from "../mountStory.testHelpers.ts"
import * as stories from "./AdaptiveGrid.stories.tsx"

/**
 * The half of the rule that needs a browser.
 *
 * `chooseColumns.test.ts` proves the arithmetic at eleven sizes in
 * Node. What only a real chromium can prove is that the arithmetic
 * is fed the right numbers: that the inline size comes off a
 * `ResizeObserver` on a container rather than off the window, that
 * the measured box is not the capped box, and that `min-w-0`
 * actually reaches children the caller owns.
 *
 * ### Neither viewport dimension is trusted here
 *
 * The runner's window is 414x896, so a test that let the grid read
 * it would assert "one column" forever and prove nothing.
 *
 * The block size is pinned by the stories, which inject a
 * `blockSizeResolver`. That seam is also what retires the source
 * app's worst test gotcha: it had to write
 * `Object.defineProperty(window, "innerHeight", { configurable:
 * true, value })`, because under vitest browser mode `innerWidth`
 * and `innerHeight` are read-only accessors backed by the real
 * window and a plain assignment is a silent no-op that leaves the
 * hook quietly reading the live viewport.
 *
 * The inline size is driven the honest way instead — by resizing
 * the canvas the grid is measuring and waiting for the
 * `ResizeObserver` to deliver. That is not a workaround; it is the
 * only assertion in the file that proves the observer is wired at
 * all.
 */

const { AllStates, AllVariants, Default, Responsive } =
  composeStories(stories)

/**
 * The grids this component drew.
 *
 * Matched on `max-inline-size` rather than on
 * `grid-template-columns`, which looks like the more obvious
 * choice and is wrong: `StoryGrid` sets an inline
 * `gridTemplateColumns` too, so the obvious selector returns the
 * story furniture first and every assertion measures the board
 * instead of the component.
 */
const getGrids = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>(
    "[style*='max-inline-size']",
  ),
]

const getTrackCount = (grid: HTMLElement) =>
  getComputedStyle(grid)
    .gridTemplateColumns.split(" ")
    .filter(Boolean).length

const mountAtInlineSize = async (
  story: Parameters<typeof mountStory>[0],
  inlineSize: number,
) => {
  const mounted = await mountStory(story)

  mounted.canvasElement.style.inlineSize = `${inlineSize}px`

  return mounted
}

test("the grid re-columns when its container resizes", async () => {
  // The observer, end to end. Nine items in a 1080px-tall window
  // need two stacks; at 700px wide only one column fits, and at
  // 1280px the second one it wanted is finally allowed.
  const { canvasElement } = await mountAtInlineSize(
    Default,
    700,
  )

  await waitFor(async () => {
    await expect(
      getTrackCount(getGrids(canvasElement)[0]!),
    ).toBe(1)
  })

  canvasElement.style.inlineSize = "1280px"

  await waitFor(async () => {
    await expect(
      getTrackCount(getGrids(canvasElement)[0]!),
    ).toBe(2)
  })
})

test("height buys the column, and width only caps it", async () => {
  // 3440px of width and 1440px of height: nine items stack seven
  // deep, so two columns carry them and the third the width would
  // have allowed is refused. This is the "don't go 9-wide just
  // because you're on an ultrawide" row of the spec, drawn.
  const { canvasElement } = await mountAtInlineSize(
    AllVariants,
    3440,
  )

  await waitFor(async () => {
    await expect(
      getGrids(canvasElement).map(getTrackCount),
    ).toEqual([2, 3, 3])
  })
})

test("the content cap widens with the columns", async () => {
  const { canvasElement } = await mountAtInlineSize(
    Default,
    1280,
  )

  // 34rem x 2 + 4rem. One column would have been 56rem — narrower
  // than two columns, which is the entire point: the page is only
  // allowed to get wide once there is something to fill it with.
  await waitFor(async () => {
    await expect(
      getGrids(canvasElement)[0]!.style.maxInlineSize,
    ).toBe("72rem")
  })
})

test("the measured box is never the capped box", async () => {
  const { canvasElement } = await mountAtInlineSize(
    Default,
    1280,
  )

  const grid = getGrids(canvasElement)[0]!

  const measured = grid.parentElement

  // The bug this shape exists to prevent has no error message: if
  // the cap were applied to the element the `ResizeObserver`
  // watches, the fold would read back its own narrowed output and
  // could never widen again — one column, forever. So the observed
  // ancestor must carry no inline-size cap of its own.
  await expect(measured?.style.maxInlineSize).toBeFalsy()

  await waitFor(async () => {
    await expect(
      measured!.getBoundingClientRect().width,
    ).toBeGreaterThan(grid.getBoundingClientRect().width)
  })
})

test("one item is one column at a reading measure", async () => {
  const { canvasElement } = await mountAtInlineSize(
    AllStates,
    1280,
  )

  await waitFor(async () => {
    const [single] = getGrids(canvasElement)

    await expect(getTrackCount(single!)).toBe(1)

    // Not stretched across the monitor it was given.
    await expect(single!.style.maxInlineSize).toBe("56rem")
  })
})

test("a long unbroken string does not push a track wide", async () => {
  const { canvasElement } = await mountAtInlineSize(
    Default,
    1280,
  )

  // A grid item's automatic minimum size is `min-content`, so the
  // long path in each card would otherwise widen its own track and
  // shove the grid past its container. `[&>*]:min-w-0` is what
  // stops it, and this asserts it reached children the story — not
  // the component — owns.
  await waitFor(async () => {
    const grid = getGrids(canvasElement)[0]!

    await expect(
      getComputedStyle(grid.firstElementChild!).minWidth,
    ).toBe("0px")

    await expect(grid.scrollWidth).toBeLessThanOrEqual(
      grid.clientWidth,
    )
  })
})

test("the inline size is read from the container, not the window", async () => {
  const { canvasElement } = await mountAtInlineSize(
    Responsive,
    1280,
  )

  // Three grids, one browser window, three different answers. A
  // hook reading `window.innerWidth` would have returned the same
  // number three times — which is what the source app's did, and
  // the one part of this port that is not a lift.
  await waitFor(async () => {
    await expect(
      getGrids(canvasElement).map(getTrackCount),
    ).toEqual([1, 2, 3])
  })
})
