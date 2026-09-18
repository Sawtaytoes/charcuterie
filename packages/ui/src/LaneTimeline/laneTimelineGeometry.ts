/**
 * Where a bar sits on the axis, and how many bars a lane stacks —
 * the whole of the arithmetic, with no React and no DOM in it.
 *
 * It is its own module for the reason `boardMove.ts` is: every
 * defect a timeline actually ships is an off-by-one, and an
 * off-by-one is invisible in a screenshot. A bar one column to the
 * left of where it belongs looks exactly like a bar. So the
 * arithmetic is unit-tested against fixtures in Node, and the
 * component below it only paints what comes out.
 *
 * ### Every position is a DAY NUMBER, never a `Date`
 *
 * Reached through `plainDate.ts` rather than reimplemented, because
 * that file already argues the case at length and re-arguing it in a
 * second place is how two answers appear. A timeline is the exact
 * shape that bug hides in: "the roofers are here Monday to Friday"
 * is true in every zone, and a `new Date("2026-04-06")` read at
 * 23:30 west of Greenwich puts the bar on Sunday. The whole file is
 * integer maths on days since 1970-01-01.
 *
 * ### The END IS INCLUSIVE, everywhere in here
 *
 * See `LaneTimelineItem.end` for the argument. The one thing to
 * carry into this file: `columnSpan` is `end - start + 1`, so a
 * single-day item is a span of **1**, not 0.
 */

import type { PlainDate } from "../DatePicker/plainDate.ts"
import {
  formatPlainDate,
  getDayNumber,
  parseIsoDate,
} from "../DatePicker/plainDate.ts"

/**
 * A closed interval of calendar days, `YYYY-MM-DD` at both ends.
 * Both the visible range and an item's own extent are this shape,
 * deliberately — the component asks the same question of both.
 */
export type TimelineSpan = {
  /** The last day covered. **Inclusive.** */
  end: string
  /** The first day covered. */
  start: string
}

/**
 * The visible range, parsed once and reused for every item.
 *
 * Parsed once because a household week with eight lanes and two
 * hundred items would otherwise re-parse the same two strings four
 * hundred times — but mostly because a range that cannot be parsed
 * has to fail in **one** place, rather than resolving to a
 * different silent fallback inside each item's placement.
 */
export type TimelineAxis = {
  /** Day columns in the visible range. Never below 1. */
  columnCount: number
  endDay: number
  startDay: number
}

export type BarPlacement = {
  /** 1-based CSS grid column the bar starts in. */
  columnStart: number
  /**
   * Day columns the bar covers **after clipping**, never below 1.
   *
   * A CSS `grid-column: 4 / span 0` is not an error and not a
   * zero-width box — the browser treats a span of 0 as 1 in some
   * engines and as invalid-and-ignored in others, so the bar lands
   * either in the right place or at the end of the row with nothing
   * to say which. The clamp lives here so no caller has to know
   * that.
   */
  columnSpan: number
  /**
   * The days the item covers in **total**, clipping ignored — so a
   * two-week thing clipped to the visible Tuesday still says
   * fourteen days out loud. The number a person is owed is the
   * item's own length, not the part of it that fits on screen.
   */
  dayCount: number
  /** The item begins before the first visible day. */
  hasEarlierStart: boolean
  /** The item is still running after the last visible day. */
  hasLaterEnd: boolean
}

export type PlacedTimelineItem<Item> = {
  item: Item
  placement: BarPlacement
}

export type PackedLane<Item> = {
  /**
   * Items that were placed and then did not fit inside
   * `maxRowCount` stacked rows. Counted rather than drawn, and the
   * lane says the number out loud — the same honest-overflow rule
   * `Board`'s `+ n more` follows, for the same reason: a lane that
   * silently drops the ninth overlapping thing is a lane that lies
   * about how loaded it is, which is the one question this
   * component exists to answer.
   */
  hiddenCount: number
  /**
   * Items with any part of themselves inside the visible range,
   * drawn or not.
   *
   * The number the lane's badge shows, and it is **not**
   * `items.length`: a consumer hands over a month and looks at a
   * week, so counting the whole array would put "31" beside a lane
   * carrying two things. It is not `rows` flattened either — that
   * would drop the overflow and make a lane look lighter the more
   * loaded it got, which inverts the one question this component
   * answers.
   */
  inRangeCount: number
  rows: PlacedTimelineItem<Item>[][]
}

const toDayNumber = (isoDate: string): null | number => {
  const date: null | PlainDate = parseIsoDate(isoDate)

  return date && getDayNumber(date)
}

/**
 * `null` when either end is not an ISO calendar date.
 *
 * Not a thrown error and not a guessed range. A component that
 * invents a range paints a confident picture of days nobody asked
 * for, and the caller finds out when somebody notices the dates are
 * wrong — which on a timeline is never, because there is nothing to
 * compare them against.
 *
 * An **inverted** range (`end` before `start`) is a different case
 * and is repaired rather than refused: it collapses to the single
 * day at `start`. A caller flipping two variables gets one column
 * and an obviously wrong picture, which is recoverable, instead of
 * an empty component, which reads as "there is nothing on".
 */
export const toTimelineAxis = (
  range: TimelineSpan,
): null | TimelineAxis => {
  const startDay = toDayNumber(range.start)

  const rawEndDay = toDayNumber(range.end)

  if (startDay === null || rawEndDay === null) {
    return null
  }

  const endDay = Math.max(startDay, rawEndDay)

  return {
    columnCount: endDay - startDay + 1,
    endDay,
    startDay,
  }
}

/**
 * Where one item's bar goes, or `null` for "it is not in this
 * picture at all".
 *
 * `null` is the right answer for an item outside the range, and it
 * matters that it is distinguishable from a zero-width one: an item
 * in another month must not be drawn, while an item whose own dates
 * are degenerate must be. The four cases a naive implementation
 * gets wrong, and what happens to each here:
 *
 *  - **Zero width** — `end` earlier than `start`. The span folds to
 *    the single day at `start` and is drawn. It is not dropped,
 *    because a dropped row is a data fault nobody can see; and it
 *    is not drawn backwards, because there is no such shape.
 *  - **A single day** — `start` equal to `end`. One column, with
 *    the same bar treatment as any other. Not a dot: a dot is a
 *    different mark, and the eye then has two vocabularies to learn
 *    on one axis.
 *  - **Starts before the range.** Clipped to column 1, with
 *    `hasEarlierStart` set so the bar can drop its leading radius
 *    and say "starts before this range" in its name. The naive
 *    version computes a negative column, and CSS grid reads a
 *    negative `grid-column-start` as counting back from the **end**
 *    of the row — so the bar appears, in entirely the wrong place,
 *    with nothing failing.
 *  - **Ends after the range.** Clipped to the last column, with
 *    `hasLaterEnd` set. `dayCount` still reports the item's true
 *    length.
 */
export const toBarPlacement = ({
  axis,
  span,
}: {
  axis: TimelineAxis
  span: TimelineSpan
}): null | BarPlacement => {
  const startDay = toDayNumber(span.start)

  if (startDay === null) {
    return null
  }

  const parsedEndDay = toDayNumber(span.end)

  // An unparseable or inverted end is the zero-width case, and both
  // resolve the same way: the item covers its start day and nothing
  // else.
  const endDay = Math.max(
    startDay,
    parsedEndDay ?? startDay,
  )

  if (endDay < axis.startDay || startDay > axis.endDay) {
    return null
  }

  const visibleStartDay = Math.max(startDay, axis.startDay)

  const visibleEndDay = Math.min(endDay, axis.endDay)

  return {
    columnStart: visibleStartDay - axis.startDay + 1,
    columnSpan: visibleEndDay - visibleStartDay + 1,
    dayCount: endDay - startDay + 1,
    hasEarlierStart: startDay < axis.startDay,
    hasLaterEnd: endDay > axis.endDay,
  }
}

/**
 * Stack a lane's items into as few rows as they fit in.
 *
 * Greedy first-fit over items sorted by start column, which is the
 * standard interval-partitioning answer and is **optimal** for row
 * count — the number of rows it produces equals the largest number
 * of items overlapping on any one day, which is the smallest number
 * any packing could use. Worth saying because the obvious
 * alternative, one row per item, is what makes a hand-rolled
 * timeline four screens tall.
 *
 * The lane getting taller is not a side effect, it is the point. A
 * lane carrying three things at once is literally three times the
 * height of one carrying them in sequence, so the asymmetry reads
 * from across the room before anybody counts anything.
 *
 * Ties are broken by the **longer** item first and then by `key`,
 * so the packing is stable: the same data renders the same rows on
 * every machine and in every reorder of the input array. Without
 * the `key` tie-break two items starting on the same day swap rows
 * whenever the consumer's sort is unstable, which reads as the
 * timeline flickering for no reason.
 */
export const toPackedLane = <
  Item extends TimelineSpan & { key: string },
>({
  axis,
  items,
  maxRowCount,
}: {
  axis: TimelineAxis
  items: readonly Item[]
  /**
   * How tall one lane may get. Past this, items are counted rather
   * than drawn.
   */
  maxRowCount: number
}): PackedLane<Item> => {
  const placed = items.flatMap((item) => {
    const placement = toBarPlacement({
      axis,
      span: item,
    })

    return placement ? [{ item, placement }] : []
  })

  const sorted = [...placed].sort(
    (first, second) =>
      first.placement.columnStart -
        second.placement.columnStart ||
      second.placement.columnSpan -
        first.placement.columnSpan ||
      (first.item.key < second.item.key ? -1 : 1),
  )

  const rows: PlacedTimelineItem<Item>[][] = []

  let hiddenCount = 0

  for (const entry of sorted) {
    const row = rows.find((candidate) => {
      const last = candidate.at(-1)

      return (
        !last ||
        last.placement.columnStart +
          last.placement.columnSpan <=
          entry.placement.columnStart
      )
    })

    if (row) {
      row.push(entry)
    } else if (rows.length < maxRowCount) {
      rows.push([entry])
    } else {
      hiddenCount += 1
    }
  }

  return {
    hiddenCount,
    inRangeCount: placed.length,
    rows,
  }
}

/**
 * Is the axis wide enough to be worth drawing?
 *
 * The question a media query cannot ask, and the reason this
 * component measures. The answer depends on **two** numbers and a
 * breakpoint only knows one: 30 columns in 900px is a readable
 * month, and 365 columns in the same 900px is 2.5px a day — a grey
 * smear with bars in it. `Nav` folds its bar on measured width for
 * the same reason, and `useToolbarOverflow` writes the general
 * version of the argument down: a hardcoded `480px` is wrong the
 * moment anything about the content changes.
 *
 * ⚠️ **`isMeasured` is a separate flag and not `inlineSize > 0`.**
 * Before the layout effect runs there is no width, and the honest
 * answer is the axis — it is what the component is for, and
 * defaulting the other way would ship the fallback list to every
 * non-browser render with nothing to say why. But **zero is also a
 * real measurement**: the track sits in a `minmax(0, 1fr)` column
 * beside a fixed label rail, so a container narrower than the rail
 * resolves the track to exactly 0px. Reading that as "not measured
 * yet" is how the first draft drew a thirty-column axis into 150
 * pixels and reported it as fine.
 */
export const getIsAxisReadable = ({
  columnCount,
  inlineSize,
  isMeasured,
  minColumnInlineSize,
}: {
  columnCount: number
  /** The measured inline size of the track, in CSS pixels. */
  inlineSize: number
  isMeasured: boolean
  minColumnInlineSize: number
}): boolean =>
  !isMeasured ||
  columnCount <= 0 ||
  inlineSize / columnCount >= minColumnInlineSize

/**
 * Label every day, every week, or every four weeks.
 *
 * Thinning the ticks rather than shrinking the type, because type
 * that shrinks to fit is type somebody cannot read and because the
 * density axis already owns font size. The steps are 1, 7 and 28 —
 * all whole weeks past the first, so a labelled column is the same
 * weekday every time and the axis stays scannable. A step of 2 or 3
 * was rejected for exactly that: labels landing on Tuesday, then
 * Thursday, then Saturday give the eye nothing to lock onto.
 */
const TICK_STEPS = [1, 7, 28] as const

export const chooseAxisTickStep = ({
  columnCount,
  inlineSize,
  minTickInlineSize,
}: {
  columnCount: number
  inlineSize: number
  /** Room one tick label needs, in CSS pixels. */
  minTickInlineSize: number
}): number => {
  if (inlineSize <= 0 || columnCount <= 0) {
    return 1
  }

  const columnInlineSize = inlineSize / columnCount

  return (
    TICK_STEPS.find(
      (step) =>
        columnInlineSize * step >= minTickInlineSize,
    ) ?? TICK_STEPS[TICK_STEPS.length - 1]
  )
}

/**
 * What a bar says when it cannot be seen.
 *
 * This is the load-bearing accessibility decision in the component,
 * not a nicety. A bar carries its meaning in **position and
 * length**, and neither of those reaches a screen reader, a
 * high-contrast rendering, or anybody who cannot tell two hues
 * apart. A one-day bar is also about 20px wide, so its own title
 * does not fit inside it for a sighted reader either — the same
 * sentence solves both.
 *
 * The dates are the item's **own**, never the clipped ones. A thing
 * that runs from March into May reads as March to May even when the
 * visible range is one week of April, because "when is this on" has
 * one true answer and the viewport is not part of it.
 *
 * English, like `Board`'s move announcements. The library has no
 * translation seam yet, and inventing one here would be a bigger
 * decision than this component.
 */
export const describeTimelineSpan = ({
  locale,
  placement,
  span,
}: {
  locale?: string
  placement: BarPlacement
  span: TimelineSpan
}): string => {
  const start = parseIsoDate(span.start)

  if (!start) {
    return ""
  }

  const format = (date: PlainDate) =>
    formatAxisDate({ date, locale })

  const end = parseIsoDate(span.end)

  const sentence =
    placement.dayCount <= 1 || !end
      ? format(start)
      : `${format(start)} to ${format(end)}, ${placement.dayCount} days`

  return [
    sentence,
    placement.hasEarlierStart
      ? "starts before this range"
      : "",
    placement.hasLaterEnd
      ? "continues past this range"
      : "",
  ]
    .filter(Boolean)
    .join(", ")
}

/**
 * One date, spelled the way both the axis and the spoken sentence
 * want it: weekday, day, month.
 *
 * The weekday is in there because a timeline is read in weeks. "Is
 * that the weekend?" is the most common question anybody asks of
 * one, and answering it from a bare day number means counting
 * columns.
 */
export const formatAxisDate = ({
  date,
  locale,
}: {
  date: PlainDate
  locale?: string
}): string =>
  formatPlainDate(date, {
    day: "numeric",
    locale,
    month: "short",
    weekday: "short",
  })
