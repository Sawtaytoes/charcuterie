import { expect, test } from "vitest"

import type {
  BoardDropLane,
  BoardRect,
} from "./boardMove.ts"
import {
  chooseDropIndex,
  chooseDropTarget,
  describeMove,
  getIsMoveMeaningful,
  toSettledIndex,
} from "./boardMove.ts"

/**
 * The geometry, in Node, against fixtures — because the browser
 * cannot test it honestly.
 *
 * `userEvent` will dispatch every `pointermove` you ask it for, but
 * nothing in a `jsdom`-shaped world has laid out, and even in the
 * real chromium the test canvas is mounted, measured and torn down
 * inside one frame. Every rectangle the drop calculation would
 * reason about is plausible-looking garbage, so a browser test of
 * "did it pick the right lane" is a test of whether two zeroes
 * compare equal.
 *
 * Split out, the rule is exact: these are the numbers, this is the
 * answer, including the ties.
 */

const toRect = (
  top: number,
  height: number,
): BoardRect => ({
  height,
  left: 0,
  top,
  width: 100,
})

/** Three cards, 40px each, stacked from y=0. */
const CARD_RECTS: BoardRect[] = [
  toRect(0, 40),
  toRect(40, 40),
  toRect(80, 40),
]

const LANES: BoardDropLane[] = [
  {
    cardRects: CARD_RECTS,
    key: "todo",
    rect: { height: 200, left: 0, top: 0, width: 100 },
  },
  {
    cardRects: [toRect(0, 40)],
    key: "doing",
    rect: { height: 200, left: 120, top: 0, width: 100 },
  },
  {
    cardRects: [],
    key: "done",
    rect: { height: 200, left: 240, top: 0, width: 100 },
  },
]

test("the insertion point flips at a card's midpoint, not its edge", () => {
  // Above the first midpoint: before everything.
  expect(chooseDropIndex(CARD_RECTS, { x: 10, y: 5 })).toBe(
    0,
  )

  // Still in the first card, but past its centre: after it.
  expect(
    chooseDropIndex(CARD_RECTS, { x: 10, y: 25 }),
  ).toBe(1)

  expect(
    chooseDropIndex(CARD_RECTS, { x: 10, y: 65 }),
  ).toBe(2)

  // Below everything.
  expect(
    chooseDropIndex(CARD_RECTS, { x: 10, y: 300 }),
  ).toBe(3)
})

test("exactly on a midpoint counts as before, not after", () => {
  // The tie, stated rather than discovered. `>` and not `>=`, so a
  // pointer resting precisely on the centre line does not oscillate
  // between two indices as the last sub-pixel rounds.
  expect(
    chooseDropIndex(CARD_RECTS, { x: 10, y: 20 }),
  ).toBe(0)
})

test("an empty lane accepts a drop at index 0", () => {
  expect(
    chooseDropTarget(LANES, { x: 250, y: 100 }),
  ).toEqual({ index: 0, laneKey: "done" })
})

test("the pointer picks the lane it is inside", () => {
  expect(chooseDropTarget(LANES, { x: 10, y: 90 })).toEqual(
    { index: 2, laneKey: "todo" },
  )

  expect(
    chooseDropTarget(LANES, { x: 130, y: 10 }),
  ).toEqual({ index: 0, laneKey: "doing" })
})

test("a release just outside a lane still lands in the nearest one", () => {
  // Two pixels past the edge is a drop, not a cancel. Returning
  // `null` here is how a board earns "it sometimes just puts the
  // card back".
  expect(
    chooseDropTarget(LANES, { x: 105, y: 100 }),
  ).toEqual({ index: 2, laneKey: "todo" })

  expect(
    chooseDropTarget(LANES, { x: 400, y: 100 }),
  ).toEqual({ index: 0, laneKey: "done" })
})

test("there is no target when there are no lanes", () => {
  expect(chooseDropTarget([], { x: 0, y: 0 })).toBeNull()
})

test("dropping a card back where it was is not a move", () => {
  // Both sides of its own midpoint resolve to "no change", because
  // removing the card shifts everything below it up by one.
  expect(
    getIsMoveMeaningful({
      fromIndex: 2,
      fromLaneKey: "todo",
      toIndex: 2,
      toLaneKey: "todo",
    }),
  ).toBe(false)

  expect(
    getIsMoveMeaningful({
      fromIndex: 2,
      fromLaneKey: "todo",
      toIndex: 3,
      toLaneKey: "todo",
    }),
  ).toBe(false)

  expect(
    getIsMoveMeaningful({
      fromIndex: 2,
      fromLaneKey: "todo",
      toIndex: 4,
      toLaneKey: "todo",
    }),
  ).toBe(true)
})

test("a cross-lane move to the same index is always meaningful", () => {
  expect(
    getIsMoveMeaningful({
      fromIndex: 1,
      fromLaneKey: "todo",
      toIndex: 1,
      toLaneKey: "doing",
    }),
  ).toBe(true)
})

test("a downward within-lane index is corrected for the removal", () => {
  expect(
    toSettledIndex({
      fromIndex: 0,
      fromLaneKey: "todo",
      toIndex: 3,
      toLaneKey: "todo",
    }),
  ).toBe(2)

  // Upward inside the lane, and any cross-lane move, are already
  // quoted against the list the card is not in.
  expect(
    toSettledIndex({
      fromIndex: 3,
      fromLaneKey: "todo",
      toIndex: 1,
      toLaneKey: "todo",
    }),
  ).toBe(1)

  expect(
    toSettledIndex({
      fromIndex: 0,
      fromLaneKey: "todo",
      toIndex: 3,
      toLaneKey: "doing",
    }),
  ).toBe(3)
})

test("the announcement names the destination and the position, one-based", () => {
  expect(
    describeMove({
      index: 2,
      laneLabel: "In Progress",
      laneSize: 6,
      title: "Unify the page chrome",
    }),
  ).toBe(
    "Moved Unify the page chrome to In Progress, position 3 of 6.",
  )
})
