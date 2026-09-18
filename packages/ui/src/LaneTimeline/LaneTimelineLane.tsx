import { useUniqueId } from "@charcuterie/logic"
import type { CategoricalIndex } from "@charcuterie/tokens"
import {
  CATEGORICAL_INDEX_COUNT,
  CATEGORICAL_SEQUENCE,
} from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { Badge } from "../Badge/Badge.tsx"
import { CATEGORICAL_SOLID_FILL_CLASS } from "../categoricalStyles.ts"
import { TextLink } from "../TextLink/TextLink.tsx"
import { toClassName } from "../toClassName.ts"
import type { TimelineItem } from "./LaneTimelineBar.tsx"
import { LaneTimelineBar } from "./LaneTimelineBar.tsx"
import type { TimelineAxis } from "./laneTimelineGeometry.ts"
import {
  describeTimelineSpan,
  toPackedLane,
} from "./laneTimelineGeometry.ts"

export type TimelineLane = {
  /**
   * Which of the ten hues this lane wears, overriding the one its
   * **position** would have given it.
   *
   * Reach for it when a lane's colour means something outside this
   * set — a person who is the same colour on every screen of the
   * app, a pair that must not drift apart when a third lane is
   * inserted between them. An overridden lane keeps its hue and the
   * rest go on walking `CATEGORICAL_SEQUENCE` from their own
   * positions, so naming one does not force naming all of them.
   */
  categorical?: CategoricalIndex
  /**
   * Where the lane's heading navigates — the "show me only this
   * lane" route. A link **inside** the heading, never a heading
   * replaced by a link, exactly as `BoardLane.href` is: the heading
   * keeps its level, its id, and its job of naming the group.
   */
  href?: string
  items: readonly TimelineItem[]
  key: string
  /**
   * The lane's name. A **string**: it names the group, and a group
   * with a `ReactNode` name is a group with no name.
   */
  label: string
}

export type LaneTimelineLaneProps = {
  axis: TimelineAxis
  /** The CSS track list, built once by the parent and shared. */
  columnTemplate: string
  headingLevel: 2 | 3 | 4 | 5
  lane: TimelineLane
  locale?: string
  maxRowCount: number
  /** Where this lane sits in the set, for its default hue. */
  position: number
  /**
   * `axis` is the bars across the date axis. `list` is the Narrow
   * View, where there is no axis and each item is a line of text.
   */
  shape: "axis" | "list"
  /** Draw a separator every this many columns. */
  tickStep: number
}

/**
 * One lane: its name, how much it is carrying, and either a track of
 * bars or a list of lines.
 *
 * ### A lane is a `group`, not a landmark
 *
 * The same call `BoardLaneList` makes, and it was a real axe failure
 * there before it changed. A named `<section>` is a `region`, so a
 * timeline of eight lanes would put eight landmarks on a page that
 * has one job, and two timelines on one page would put two landmarks
 * with the same name in the document — which is `landmark-unique`.
 * It is a `<div role="group">` rather than a `<section role="group">`
 * because axe matches `section[aria-labelledby]` on the **element**
 * and audits it as a landmark even after the role is overridden.
 *
 * ### The count is what the lane carries IN THIS RANGE
 *
 * Not `items.length`. A consumer hands over a month and shows a
 * week; counting the array would print "31" beside a lane with two
 * bars on it. `inRangeCount` includes anything the row limit hid, so
 * a lane cannot look lighter by being more loaded.
 *
 * ### A lane gets TALLER when it is busy, and that is the design
 *
 * Overlapping items stack into rows (`toPackedLane`), so a lane
 * carrying three things at once is three bars tall while one
 * carrying them in sequence is one. Load asymmetry then reads as
 * height from across the room, before anybody counts anything —
 * which is the whole reason this component exists rather than a
 * month grid, where every cell is the same size no matter what is
 * in it.
 */
export const LaneTimelineLane = ({
  axis,
  columnTemplate,
  headingLevel,
  lane,
  locale,
  maxRowCount,
  position,
  shape,
  tickStep,
}: LaneTimelineLaneProps): ReactNode => {
  const headingId = useUniqueId()

  /*
   * Position, not `getCategoricalIndex(lane.key)`, and `ActionTiles`
   * made the same call for the same reason. That helper hashes, so a
   * row keeps its colour across a list nobody controls the order of
   * — right for Docket's labels, wrong here: a hash of two lane keys
   * can collide, and two lanes in one hue defeats the only thing the
   * colour is for. Measured on this component's own fixtures, where
   * `wren` and `juno` both hashed to Pink and the screenshot showed
   * one person's week twice.
   *
   * `CATEGORICAL_SEQUENCE` rather than the ring: the ring is
   * hue-ordered for the swatch picker's sake, so walking it in order
   * hands a two-lane set the two hardest colours in the family to
   * tell apart.
   */
  const categorical =
    lane.categorical ??
    CATEGORICAL_SEQUENCE[position % CATEGORICAL_INDEX_COUNT]

  const packed = toPackedLane({
    axis,
    items: lane.items,
    /*
     * The Narrow View has no row limit, because there are no rows:
     * it is a vertical list, so the thing the limit protects
     * against — a lane growing past the height of the screen while
     * every other lane stays one bar tall — cannot happen. Hiding
     * items there would lose them for the reader who has the least
     * room to spare.
     */
    maxRowCount:
      shape === "list" ? lane.items.length : maxRowCount,
  })

  const Heading = `h${headingLevel}` as const

  const header = (
    <header className="flex min-w-0 items-center gap-2">
      {/*
       * The lane's hue, beside its name, so the reader learns which
       * colour is which lane once instead of per bar. Decoration
       * only — the heading is the thing that says whose lane it is,
       * which is what keeps the colour from being the sole carrier
       * of anything.
       */}
      <span
        aria-hidden="true"
        className={toClassName(
          "h-4 w-1 shrink-0 rounded-full",
          CATEGORICAL_SOLID_FILL_CLASS[categorical],
        )}
      />

      <Heading
        className="min-w-0 truncate font-semibold text-content-primary text-sm"
        id={headingId}
        title={lane.label}
      >
        {lane.href ? (
          <TextLink
            appearance="standalone"
            className="font-semibold text-inherit"
            href={lane.href}
          >
            {lane.label}
          </TextLink>
        ) : (
          lane.label
        )}
      </Heading>

      <Badge appearance="soft" intent="neutral" size="sm">
        {String(packed.inRangeCount)}
      </Badge>
    </header>
  )

  if (shape === "list") {
    const items = packed.rows
      .flat()
      .sort(
        (first, second) =>
          first.placement.columnStart -
          second.placement.columnStart,
      )

    return (
      // biome-ignore lint/a11y/useSemanticElements: the semantic element for `group` is `<fieldset>`, which drags `<legend>`, a border and form-reset behaviour onto a lane of dates. Same call `BoardLaneList`, `Menu`'s group and `AccordionSection` already made.
      <div
        aria-labelledby={headingId}
        className="flex flex-col gap-1.5 border-border-subtle border-t py-2"
        role="group"
      >
        {header}

        {items.length === 0 ? (
          <p className="text-content-muted text-xs">
            Nothing in this range.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map(({ item, placement }) => (
              <li className="min-w-0" key={item.key}>
                <LaneTimelineBar
                  laneCategorical={categorical}
                  description={describeTimelineSpan({
                    locale,
                    placement,
                    span: item,
                  })}
                  hasEarlierStart={
                    placement.hasEarlierStart
                  }
                  hasLaterEnd={placement.hasLaterEnd}
                  item={item}
                  shape="row"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: see the Narrow View branch above — `<fieldset>` is the only semantic element for `group`, and it is a form-control grouping.
    <div
      aria-labelledby={headingId}
      className="grid grid-cols-[12rem_minmax(0,1fr)] items-start gap-x-3 border-border-subtle border-t py-1.5"
      role="group"
    >
      {header}

      <div className="relative min-h-6">
        {/*
         * The separators, drawn behind the bars rather than between
         * them. A real element between two columns takes up space,
         * which moves the columns it was measuring itself against —
         * the same feedback loop `BoardLaneList`'s drop indicator
         * avoids by being absolute.
         */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid"
          style={{ gridTemplateColumns: columnTemplate }}
        >
          {/*
           * Keyed by the DAY, not by the loop index — the day number
           * is what the cell is, and a key that is an index is a key
           * that moves when the range does.
           */}
          {Array.from(
            { length: axis.columnCount },
            (_unused, index) => axis.startDay + index,
          ).map((dayNumber) => (
            <span
              className={toClassName(
                // Never on the leading edge: a line down the start of
                // the track reads as a frame the track does not have.
                dayNumber > axis.startDay &&
                  (dayNumber - axis.startDay) % tickStep ===
                    0 &&
                  "border-border-subtle border-s",
              )}
              key={dayNumber}
            />
          ))}
        </div>

        <ul
          className="relative grid gap-1"
          style={{ gridTemplateColumns: columnTemplate }}
        >
          {packed.rows.flatMap((row, rowIndex) =>
            row.map(({ item, placement }) => (
              <li
                className="min-w-0"
                key={item.key}
                style={{
                  /*
                   * `span`, never a start/end pair. An end line is
                   * one past the last column the bar covers, so
                   * writing it is the single easiest place to lose
                   * a day — and it is invisible, because a bar one
                   * day short still looks like a bar.
                   */
                  gridColumn: `${placement.columnStart} / span ${placement.columnSpan}`,
                  gridRow: rowIndex + 1,
                }}
              >
                <LaneTimelineBar
                  laneCategorical={categorical}
                  description={describeTimelineSpan({
                    locale,
                    placement,
                    span: item,
                  })}
                  hasEarlierStart={
                    placement.hasEarlierStart
                  }
                  hasLaterEnd={placement.hasLaterEnd}
                  item={item}
                  shape="bar"
                />
              </li>
            )),
          )}
        </ul>

        {packed.hiddenCount > 0 ? (
          <p className="pt-1 text-content-muted text-xs">
            {`+ ${packed.hiddenCount} more overlapping in ${lane.label}`}
          </p>
        ) : null}
      </div>
    </div>
  )
}
