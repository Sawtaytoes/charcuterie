/**
 * The arithmetic, in Node, against fixtures.
 *
 * Every date in here is invented. It is also all **2026 April**, for
 * one reason worth stating: 2026-04-06 is a Monday, so a seven-day
 * week is `06` to `12` and a reader checking this file by hand can
 * see the off-by-one they are looking for.
 *
 * The four cases the component's own doc calls out — zero width, a
 * single day, clipped at the start, clipped at the end — each get a
 * test of their own, because all four are places a naive
 * implementation draws nothing or draws it in the wrong place, and
 * none of the four is visible in a screenshot.
 */

import { expect, test } from "vitest"

import {
  chooseAxisTickStep,
  describeTimelineSpan,
  getIsAxisReadable,
  toBarPlacement,
  toPackedLane,
  toTimelineAxis,
} from "./laneTimelineGeometry.ts"

const WEEK = {
  end: "2026-04-12",
  start: "2026-04-06",
}

const axis = toTimelineAxis(WEEK)

if (!axis) {
  throw new Error("the fixture week must parse")
}

test("a week is seven columns, not eight", () => {
  // The inclusive end, asserted as a number rather than described in
  // prose. Monday to Sunday is seven days; a half-open reading gives
  // six and the bug is invisible in every screenshot.
  expect(axis.columnCount).toBe(7)
})

test("an unparseable range is refused rather than guessed", () => {
  expect(
    toTimelineAxis({ end: "2026-04-12", start: "April 6" }),
  ).toBeNull()

  expect(
    toTimelineAxis({ end: "", start: "2026-04-06" }),
  ).toBeNull()
})

test("an inverted range collapses to its start day", () => {
  // Repaired, not refused. A caller who swapped two variables gets
  // one obviously-wrong column, which is recoverable; an empty
  // component reads as "there is nothing on", which is not.
  expect(
    toTimelineAxis({
      end: "2026-04-06",
      start: "2026-04-12",
    })?.columnCount,
  ).toBe(1)
})

test("a single-day item is one column wide", () => {
  expect(
    toBarPlacement({
      axis,
      span: { end: "2026-04-08", start: "2026-04-08" },
    }),
  ).toEqual({
    columnSpan: 1,
    columnStart: 3,
    dayCount: 1,
    hasEarlierStart: false,
    hasLaterEnd: false,
  })
})

test("a zero-width item is drawn on its start day rather than dropped", () => {
  // `end` before `start`. The bar is not dropped — a dropped row is
  // a data fault nobody can see — and it is not drawn backwards,
  // because `grid-column: 4 / span 0` is not a zero-width box, it is
  // undefined behaviour that lands the bar somewhere plausible.
  expect(
    toBarPlacement({
      axis,
      span: { end: "2026-04-07", start: "2026-04-09" },
    }),
  ).toEqual({
    columnSpan: 1,
    columnStart: 4,
    dayCount: 1,
    hasEarlierStart: false,
    hasLaterEnd: false,
  })
})

test("an item starting before the range is clipped to the first column and says so", () => {
  const placement = toBarPlacement({
    axis,
    span: { end: "2026-04-08", start: "2026-03-30" },
  })

  // Column **1**, never 0 and never negative. CSS grid reads a
  // negative `grid-column-start` as counting back from the end of the
  // row, so the naive subtraction puts the bar at the far side of the
  // week with nothing failing.
  expect(placement?.columnStart).toBe(1)
  expect(placement?.columnSpan).toBe(3)
  expect(placement?.hasEarlierStart).toBe(true)
  expect(placement?.hasLaterEnd).toBe(false)

  // The item's own length, not the visible part of it.
  expect(placement?.dayCount).toBe(10)
})

test("an item ending after the range is clipped to the last column and says so", () => {
  const placement = toBarPlacement({
    axis,
    span: { end: "2026-04-30", start: "2026-04-10" },
  })

  expect(placement?.columnStart).toBe(5)
  expect(placement?.columnSpan).toBe(3)
  expect(placement?.hasEarlierStart).toBe(false)
  expect(placement?.hasLaterEnd).toBe(true)
  expect(placement?.dayCount).toBe(21)
})

test("an item spanning the whole range is clipped at both ends", () => {
  expect(
    toBarPlacement({
      axis,
      span: { end: "2026-05-01", start: "2026-03-01" },
    }),
  ).toEqual({
    columnSpan: 7,
    columnStart: 1,
    dayCount: 62,
    hasEarlierStart: true,
    hasLaterEnd: true,
  })
})

test("an item outside the range is not placed at all", () => {
  expect(
    toBarPlacement({
      axis,
      span: { end: "2026-04-05", start: "2026-04-01" },
    }),
  ).toBeNull()

  expect(
    toBarPlacement({
      axis,
      span: { end: "2026-04-20", start: "2026-04-13" },
    }),
  ).toBeNull()
})

test("an item touching the range by one day is placed", () => {
  // The boundary either side of the test above. Ending **on** the
  // first visible day is inside; ending the day before is outside.
  expect(
    toBarPlacement({
      axis,
      span: { end: "2026-04-06", start: "2026-04-01" },
    })?.columnSpan,
  ).toBe(1)

  expect(
    toBarPlacement({
      axis,
      span: { end: "2026-04-20", start: "2026-04-12" },
    })?.columnStart,
  ).toBe(7)
})

test("items that do not overlap share one row", () => {
  const packed = toPackedLane({
    axis,
    items: [
      {
        end: "2026-04-07",
        key: "first",
        start: "2026-04-06",
      },
      {
        end: "2026-04-10",
        key: "second",
        start: "2026-04-08",
      },
    ],
    maxRowCount: 6,
  })

  expect(packed.rows).toHaveLength(1)
  expect(packed.inRangeCount).toBe(2)
  expect(packed.hiddenCount).toBe(0)
})

test("a lane gets one row per overlapping item, and no more", () => {
  // The optimality claim, asserted: three items overlapping on one
  // day is three rows, and the fourth — which starts after all three
  // have finished — goes back on the first row rather than opening a
  // fourth.
  const packed = toPackedLane({
    axis,
    items: [
      {
        end: "2026-04-09",
        key: "a",
        start: "2026-04-06",
      },
      {
        end: "2026-04-09",
        key: "b",
        start: "2026-04-07",
      },
      {
        end: "2026-04-09",
        key: "c",
        start: "2026-04-08",
      },
      {
        end: "2026-04-12",
        key: "d",
        start: "2026-04-11",
      },
    ],
    maxRowCount: 6,
  })

  expect(packed.rows).toHaveLength(3)
  expect(
    packed.rows[0]?.map((one) => one.item.key),
  ).toEqual(["a", "d"])
})

test("the packing is stable when two items start on the same day", () => {
  // Without the `key` tie-break, two items starting together swap
  // rows whenever the consumer's sort is unstable — which reads as
  // the timeline flickering for no reason anybody can name.
  const items = [
    { end: "2026-04-08", key: "zulu", start: "2026-04-06" },
    {
      end: "2026-04-08",
      key: "alpha",
      start: "2026-04-06",
    },
  ]

  const first = toPackedLane({
    axis,
    items,
    maxRowCount: 6,
  })

  const second = toPackedLane({
    axis,
    items: [...items].reverse(),
    maxRowCount: 6,
  })

  expect(first.rows[0]?.[0]?.item.key).toBe("alpha")
  expect(second.rows[0]?.[0]?.item.key).toBe("alpha")
})

test("a lane past its row limit counts the rest rather than dropping them", () => {
  const packed = toPackedLane({
    axis,
    items: Array.from({ length: 5 }, (_unused, index) => ({
      end: "2026-04-10",
      key: `overlapping-${index}`,
      start: "2026-04-06",
    })),
    maxRowCount: 2,
  })

  expect(packed.rows).toHaveLength(2)
  expect(packed.hiddenCount).toBe(3)

  // The badge number. It counts everything in the range, hidden
  // included, so a lane cannot look lighter by being more loaded.
  expect(packed.inRangeCount).toBe(5)
})

test("an item outside the range is not counted as loaded", () => {
  const packed = toPackedLane({
    axis,
    items: [
      {
        end: "2026-05-04",
        key: "next",
        start: "2026-05-01",
      },
    ],
    maxRowCount: 6,
  })

  expect(packed.inRangeCount).toBe(0)
  expect(packed.rows).toHaveLength(0)
})

test("an unmeasured track shows the axis, and a measured zero does not", () => {
  // The distinction that is the whole of `isMeasured`. Zero is a real
  // width here — the track is a `minmax(0, 1fr)` column beside a
  // fixed label rail, so any container narrower than the rail
  // resolves it to exactly 0px.
  expect(
    getIsAxisReadable({
      columnCount: 30,
      inlineSize: 0,
      isMeasured: false,
      minColumnInlineSize: 20,
    }),
  ).toBe(true)

  expect(
    getIsAxisReadable({
      columnCount: 30,
      inlineSize: 0,
      isMeasured: true,
      minColumnInlineSize: 20,
    }),
  ).toBe(false)
})

test("the axis folds on the width PER COLUMN, not on the width", () => {
  // One width, two answers, because the other number lives in the
  // data. This is the case no media query and no container query can
  // express.
  expect(
    getIsAxisReadable({
      columnCount: 30,
      inlineSize: 900,
      isMeasured: true,
      minColumnInlineSize: 20,
    }),
  ).toBe(true)

  expect(
    getIsAxisReadable({
      columnCount: 365,
      inlineSize: 900,
      isMeasured: true,
      minColumnInlineSize: 20,
    }),
  ).toBe(false)
})

test("the tick step thins in whole weeks", () => {
  expect(
    chooseAxisTickStep({
      columnCount: 7,
      inlineSize: 700,
      minTickInlineSize: 56,
    }),
  ).toBe(1)

  expect(
    chooseAxisTickStep({
      columnCount: 90,
      inlineSize: 900,
      minTickInlineSize: 56,
    }),
  ).toBe(7)

  expect(
    chooseAxisTickStep({
      columnCount: 365,
      inlineSize: 900,
      minTickInlineSize: 56,
    }),
  ).toBe(28)
})

test("an unmeasured axis labels every day", () => {
  expect(
    chooseAxisTickStep({
      columnCount: 30,
      inlineSize: 0,
      minTickInlineSize: 56,
    }),
  ).toBe(1)
})

test("a bar says its own span in words, with its own dates", () => {
  const span = { end: "2026-04-30", start: "2026-03-30" }

  const placement = toBarPlacement({ axis, span })

  if (!placement) {
    throw new Error("the fixture must be placed")
  }

  const sentence = describeTimelineSpan({
    locale: "en-GB",
    placement,
    span,
  })

  // The item's own dates, not the clipped ones: "when is this on"
  // has one true answer and the viewport is not part of it.
  expect(sentence).toBe(
    "Mon 30 Mar to Thu 30 Apr, 32 days, starts before this range, continues past this range",
  )
})

test("a single day says the day and nothing about a span", () => {
  const span = { end: "2026-04-08", start: "2026-04-08" }

  const placement = toBarPlacement({ axis, span })

  if (!placement) {
    throw new Error("the fixture must be placed")
  }

  expect(
    describeTimelineSpan({
      locale: "en-GB",
      placement,
      span,
    }),
  ).toBe("Wed 8 Apr")
})
