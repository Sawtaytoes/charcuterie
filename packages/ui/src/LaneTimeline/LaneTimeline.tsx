import type { ReactNode } from "react"

import { getPlainDateFromDayNumber } from "../DatePicker/plainDate.ts"
import { EmptyState } from "../EmptyState/EmptyState.tsx"
import { toClassName } from "../toClassName.ts"
import type { TimelineLane } from "./LaneTimelineLane.tsx"
import { LaneTimelineLane } from "./LaneTimelineLane.tsx"
import type { TimelineSpan } from "./laneTimelineGeometry.ts"
import {
  chooseAxisTickStep,
  formatAxisDate,
  getIsAxisReadable,
  toTimelineAxis,
} from "./laneTimelineGeometry.ts"
import { useTrackMeasurements } from "./useTrackMeasurements.ts"

/**
 * Room one tick label needs, as a multiple of the timeline's own
 * font size.
 *
 * `Mon 12 Apr` is about 4.5 of them, and the number is bigger than
 * the label looks because the two are measured against **different**
 * sizes: the label renders at `text-xs` while this multiplies the
 * container's own font size, which is the one the probe can read. A
 * constant rather than a prop, because it is a fact about the label
 * this component prints rather than a preference anybody has.
 */
const TICK_LABEL_SIZE = 4.5

/**
 * The narrowest a day column may get before the axis stops being
 * worth drawing, in em.
 *
 * ⚠️ **The one number in here that is a taste call**, and it was
 * moved once already. 1.25em drew a seven-day axis into a 24rem
 * sidebar, which is 25 pixels a day: the bars were real shapes and
 * every one of their titles was `Mi…`, so the picture was worse than
 * the list it was chosen over. 1.75em is roughly the narrowest
 * column that still holds a short word, which puts a month at about
 * 1030px of component and a week in anything past a phone.
 *
 * The case still worth arguing about is a quarter. Ninety days wants
 * more than 2500px and therefore falls to the Narrow View on every
 * screen here — and 6px a day does still show a *shape*, so somebody
 * may prefer the smear to the list. It is a prop for that reason.
 */
const DEFAULT_MIN_COLUMN_SIZE = 1.75

/**
 * How many bars a lane may stack before the rest are counted rather
 * than drawn. Six is roughly a screen's worth of one lane.
 */
const DEFAULT_MAX_ROW_COUNT = 6

export type LaneTimelineProps = {
  className?: string
  /**
   * Shown when there are no lanes, or when `range` is not a pair of
   * calendar dates. Defaults to a real `EmptyState` — *"real empty
   * states"* is a standing requirement, and an empty timeline is
   * what a household sees on a good week.
   */
  emptyState?: ReactNode
  /**
   * What level the lane headings are. The caller's, because only
   * the caller knows what the timeline sits under: one directly
   * below a page `<h1>` wants `2`. Getting it wrong is an axe
   * `heading-order` failure and a hole in the screen-reader
   * outline.
   */
  headingLevel?: 2 | 3 | 4 | 5
  /** The timeline's accessible name. Required — it is a landmark. */
  label: string
  lanes: readonly TimelineLane[]
  /**
   * BCP-47, for the dates only. Omitted, `Intl` uses the runtime's
   * own — which is right on a personal machine and wrong on a
   * server, so a server render should pass one rather than let two
   * environments disagree about what "6 Apr" looks like.
   */
  locale?: string
  /** How many bars one lane may stack. Default 6. */
  maxRowCount?: number
  /**
   * The narrowest a day column may get before the axis is abandoned
   * for the Narrow View, as a multiple of the timeline's **own font
   * size**. Default 1.75.
   *
   * In em rather than pixels because every length in this token set
   * moves with the density axis: a floor pinned at 20px is generous
   * on a desktop and clips a two-digit date on the kiosk. Same
   * argument `Avatar` makes about a chip that stays 20px while the
   * prose around it scales.
   */
  minColumnSize?: number
  /**
   * The days on screen. **Both ends inclusive**, like every other
   * span in this component — a Monday-to-Sunday week is
   * `2026-04-06` to `2026-04-12`, which is seven columns, not eight.
   */
  range: TimelineSpan
}

/**
 * One horizontal lane per group, across a date axis, with anything
 * that lasts more than a day drawn as a **bar**.
 *
 * ## What it is for
 *
 * A month grid gives every day the same box, so a thing that runs
 * Tuesday to Friday is four separate entries and the fact that it is
 * *one* thing is lost. Worse, every cell is the same size no matter
 * how much is in it, so a grid cannot show that one person is
 * carrying most of the week. A lane can: bars keep their real
 * shape, and a lane with overlapping work stacks into rows and gets
 * **taller**. The asymmetry then reads from across the room, before
 * anybody counts anything.
 *
 * It is not a calendar. There is no event, no attendee and no
 * recurrence in this API, because Docket wants the same shape for
 * phases and Horizon wants it for a household — the library owns the
 * **shape** and the app owns the **data**. What a lane holds is a
 * `key`, a `label` and items with a `start`, an `end` and a `title`.
 *
 * ## `end` is INCLUSIVE, and that is the decision to know
 *
 * An off-by-one on a date range is invisible in both directions: a
 * bar one day short and a bar one day long are both bars. So it is
 * stated loudly here and again on the type — **`end` is the last day
 * the item covers**. `2026-04-06` to `2026-04-06` is one day, and a
 * seven-day week ends on its seventh day, not on the eighth. The
 * alternative (a half-open interval, the way `Date` ranges and
 * iCalendar's `DTEND` work) is the better model for *instants* and
 * the wrong one for a human writing down when the roofers are
 * coming: nobody says "Monday to Saturday" about a working week, so
 * an exclusive end would make every consumer add a day on the way in
 * and forget to on one of the paths.
 * [Decision](../../../docs/decisions/2026-09-18-a-timeline-span-ends-on-its-last-day-and-the-axis-folds-on-measurement.md).
 *
 * ## The Narrow View is a LIST, not a pan surface
 *
 * Thirty columns have no narrow layout, and the two obvious answers
 * are both wrong. Horizontal scrolling hides lanes behind a gesture
 * with no affordance and fights the trackpad's own back-navigation
 * — the same objection `Board` settled with *"no horizontal scroll,
 * ever"*. Squeezing thirty columns into 390px gives each day 13
 * pixels, which is not a timeline, it is a texture.
 *
 * So below the threshold the axis is **abandoned** rather than
 * shrunk: each lane becomes a one-column list of its items, each one
 * a line of text with its span written out in words. Nothing is
 * hidden, nothing overflows, and the reading order is the one the
 * fleet's text-heavy lists already use.
 *
 * ## It folds on a MEASUREMENT, not a breakpoint
 *
 * There is no `@media` and no `cq-` in this component, and neither
 * could do the job: the question is not *how wide is the box* but
 * **how wide is one day**, which is the width divided by a number
 * that lives in the data. Thirty columns in 900px is a readable
 * month and three hundred and sixty five columns in the same 900px
 * is a grey smear, and no query can tell those apart. `Nav` folds
 * its bar on a measured width for the weaker version of this
 * reason; `useToolbarOverflow` writes the argument down.
 *
 * ⚠️ **It must not be sized by its own contents.** The component
 * reads its own box to decide what to draw in it, so a shrink-
 * wrapping parent makes the answer its own input. The root declares
 * `container-type: inline-size` — not to query it, the same reason
 * `Main` declares one — which forbids the element from being sized
 * by what is inside it and makes that loop unformable. In a story
 * this is what `align="stretch"` on the `StoryCell` is for.
 *
 * ## What it deliberately does not do
 *
 * No time of day: this is a **calendar-date** axis, so two things on
 * one Tuesday stack rather than sit at 09:00 and 14:00. No "now"
 * marker, no zoom, no drag to reschedule, no data. A range control
 * belongs to the page — `DatePicker` already is one — and a bar you
 * can drag is a write operation, which is a different component with
 * a different decision behind it.
 */
export const LaneTimeline = ({
  className,
  emptyState,
  headingLevel = 3,
  label,
  lanes,
  locale,
  maxRowCount = DEFAULT_MAX_ROW_COUNT,
  minColumnSize = DEFAULT_MIN_COLUMN_SIZE,
  range,
}: LaneTimelineProps): ReactNode => {
  const { fontSize, inlineSize, isMeasured, trackRef } =
    useTrackMeasurements()

  const axis = toTimelineAxis(range)

  const columnCount = axis?.columnCount ?? 0

  const isAxisReadable = getIsAxisReadable({
    columnCount,
    inlineSize,
    isMeasured,
    minColumnInlineSize: minColumnSize * fontSize,
  })

  const tickStep = chooseAxisTickStep({
    columnCount,
    inlineSize,
    minTickInlineSize: TICK_LABEL_SIZE * fontSize,
  })

  /*
   * An inline style, not a class. Tailwind scans source text for
   * complete class strings, so a `grid-cols-[repeat(${n},…)]` is
   * generated **never** — the grid silently falls back to one column
   * and every bar lands on top of every other one, with nothing
   * failing. `AdaptiveGrid` carries the same note about the same
   * trap.
   */
  const columnTemplate = `repeat(${Math.max(columnCount, 1)}, minmax(0, 1fr))`

  const rangeCaption =
    axis &&
    `${formatAxisDate({
      date: getPlainDateFromDayNumber(axis.startDay),
      locale,
    })} to ${formatAxisDate({
      date: getPlainDateFromDayNumber(axis.endDay),
      locale,
    })}`

  return (
    <section
      aria-label={label}
      className={toClassName(
        "@container flex flex-col",
        className,
      )}
    >
      {/*
       * The measuring probe, and it is load-bearing.
       *
       * Zero height, `aria-hidden`, and rendered in **both**
       * layouts — it is the only element that can answer "how wide
       * would a day column be" in the layout where no day column
       * exists. Measuring the real track instead is a one-way door:
       * the Narrow View unmounts it, so the width never updates and
       * the axis can never come back when the window widens.
       *
       * `overflow-hidden` because the 12rem rail is wider than the
       * whole component in the Narrow View, and a zero-height box is
       * still allowed to give an ancestor a horizontal scrollbar.
       */}
      <div
        aria-hidden="true"
        className="grid grid-cols-[12rem_minmax(0,1fr)] gap-x-3 overflow-hidden"
      >
        <div />

        <div className="h-0" ref={trackRef} />
      </div>

      {axis === null ? (
        (emptyState ?? (
          <EmptyState
            description="This timeline has no visible date range."
            heading="Nothing to show"
            headingLevel={headingLevel}
            size="sm"
          />
        ))
      ) : lanes.length === 0 ? (
        (emptyState ?? (
          <EmptyState
            description="Nothing has been added to this timeline yet."
            heading="No lanes yet"
            headingLevel={headingLevel}
            size="sm"
          />
        ))
      ) : isAxisReadable ? (
        <>
          <div className="grid grid-cols-[12rem_minmax(0,1fr)] items-end gap-x-3 pb-1">
            <span
              className="min-w-0 truncate text-content-muted text-xs"
              title={rangeCaption ?? undefined}
            >
              {rangeCaption}
            </span>

            {/*
             * `aria-hidden`, and that is a deliberate call rather
             * than an oversight. Every bar already says its own
             * span in words, so an axis read aloud is thirty
             * consecutive dates in front of the content — noise
             * that costs a screen-reader user the page. The axis is
             * a *visual* ruler for a mark whose position a sighted
             * reader has to measure against something.
             */}
            <div
              aria-hidden="true"
              className="grid"
              style={{
                gridTemplateColumns: columnTemplate,
              }}
            >
              {Array.from(
                { length: columnCount },
                (_unused, index) => index,
              )
                .filter((index) => index % tickStep === 0)
                .map((index) => (
                  <span
                    className="min-w-0 truncate text-content-muted text-xs"
                    key={axis.startDay + index}
                    style={{
                      gridColumn: `${index + 1} / span ${Math.min(
                        tickStep,
                        columnCount - index,
                      )}`,
                    }}
                  >
                    {formatAxisDate({
                      date: getPlainDateFromDayNumber(
                        axis.startDay + index,
                      ),
                      locale,
                    })}
                  </span>
                ))}
            </div>
          </div>

          {lanes.map((lane, position) => (
            <LaneTimelineLane
              axis={axis}
              columnTemplate={columnTemplate}
              headingLevel={headingLevel}
              key={lane.key}
              lane={lane}
              locale={locale}
              maxRowCount={maxRowCount}
              position={position}
              shape="axis"
              tickStep={tickStep}
            />
          ))}
        </>
      ) : (
        <>
          {/*
           * The range still has to be said, and in the Narrow View
           * there is no rail to say it in. Without this the list
           * reads as "everything", which is the one thing it is
           * not.
           */}
          <p className="pb-1 text-content-muted text-xs">
            {rangeCaption}
          </p>

          {lanes.map((lane, position) => (
            <LaneTimelineLane
              axis={axis}
              columnTemplate={columnTemplate}
              headingLevel={headingLevel}
              key={lane.key}
              lane={lane}
              locale={locale}
              maxRowCount={maxRowCount}
              position={position}
              shape="list"
              tickStep={tickStep}
            />
          ))}
        </>
      )}
    </section>
  )
}
