import type { KeyboardEvent, ReactNode } from "react"
import { useEffect, useRef } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import type { PlainDate } from "./plainDate.ts"
import {
  addDays,
  addMonths,
  clampPlainDate,
  comparePlainDates,
  formatPlainDate,
  getDaysInMonth,
  getIsSameDay,
  getIsWithinRange,
  getWeekday,
  getWeekdayNames,
  toIsoDate,
} from "./plainDate.ts"

export type DateGridProps = {
  firstDayOfWeek: number
  focusedDate: PlainDate
  /**
   * The month this grid draws — any date inside it. `DatePicker`
   * renders two of these in range mode, so the month is a prop
   * rather than derived from the focus.
   */
  gridMonth: PlainDate
  /**
   * Whether the keyboard is *in* the grid. Only the grid that owns
   * focus pulls it onto its focused cell; the other one would rip
   * focus back and forth between the two months on every arrow key.
   */
  isGridFocused: boolean
  isRange: boolean
  label: string
  locale?: string
  maximum?: PlainDate
  minimum?: PlainDate
  onFocusDate: (date: PlainDate) => void
  onHoverDate: (date: null | PlainDate) => void
  onSelectDate: (date: PlainDate) => void
  /**
   * The end of the band being drawn *right now* — the committed end,
   * or the hovered/keyboard-focused day while the second click is
   * still outstanding. Painting the pending half is the difference
   * between a range picker you can aim and one you have to guess at.
   */
  previewEnd: null | PlainDate
  rangeStart: null | PlainDate
  selectedDates: readonly PlainDate[]
  today: PlainDate
}

const CELL_BASE_CLASS =
  "cursor-pointer rounded-md p-0 text-center"

const DAY_BASE_CLASS =
  "mx-auto flex size-8 items-center justify-center rounded-md border border-transparent text-xs transition-colors duration-(--duration-fast) ease-standard cq-xs:size-9 cq-xs:text-sm cq-sm:size-10"

/**
 * One month, as a real `<table role="grid">`.
 *
 * ### Why the roving focus is arithmetic and not `useRovingFocus`
 *
 * `@charcuterie/logic`'s `RovingFocus` is a **registration** kind:
 * members register from an effect and `next`/`previous`/`first`/
 * `last` walk that list. `SegmentedControl` and `Tabs` are exactly
 * that shape, and a calendar is not, for two reasons that are worth
 * stating rather than discovering:
 *
 *  - The movement is two-dimensional and it is *date* arithmetic, not
 *    list traversal. ArrowDown is "+7 days", which is a different
 *    thing from "the seventh next registered member" the moment a
 *    month does not start on the first column.
 *  - The move can leave the rendered set entirely. ArrowRight on 31
 *    August lands on 1 September, which is a day this grid has not
 *    rendered and no member has registered. A registration list
 *    cannot express a move to something that does not exist yet; a
 *    day number can, and re-rendering the grid around it is the
 *    correct response.
 *
 * So the focused *date* is the state and the DOM follows it. This is
 * the same conclusion `Field` reached about `createLinkedIds` — the
 * state kind is real and this is not its shape.
 *
 * ### The cell is the gridcell
 *
 * `<td tabindex>` rather than `<td><button>`. It is the APG date
 * picker's own structure, it keeps exactly one tab stop in the grid
 * (which `expectAgentDrivable` checks), and it avoids a focusable
 * button inside a focusable cell — two tab stops per day, which is
 * what the naive build produces.
 *
 * Each cell's accessible name is the **whole date**, formatted in
 * the active locale: "Wednesday, August 19, 2026", not "19". A
 * screen reader reading a bare number in a grid with no row or
 * column headers announced is a user counting cells, and
 * `getByRole("gridcell", { name: … })` becomes unusable the moment
 * two months are on screen.
 */
export const DateGrid = ({
  firstDayOfWeek,
  focusedDate,
  gridMonth,
  isGridFocused,
  isRange,
  label,
  locale,
  maximum,
  minimum,
  onFocusDate,
  onHoverDate,
  onSelectDate,
  previewEnd,
  rangeStart,
  selectedDates,
  today,
}: DateGridProps): ReactNode => {
  const cellElements = useRef(
    new Map<string, HTMLTableCellElement>(),
  )

  const daysInMonth = getDaysInMonth(
    gridMonth.year,
    gridMonth.month,
  )

  const firstOfMonth = {
    day: 1,
    month: gridMonth.month,
    year: gridMonth.year,
  }

  const leadingBlanks =
    (getWeekday(firstOfMonth) - firstDayOfWeek + 7) % 7

  const days = Array.from(
    { length: daysInMonth },
    (_unused, index) => ({
      day: index + 1,
      month: gridMonth.month,
      year: gridMonth.year,
    }),
  )

  const getIsEnabled = (date: PlainDate) =>
    getIsWithinRange(date, minimum, maximum)

  const isFocusInThisMonth =
    focusedDate.month === gridMonth.month &&
    focusedDate.year === gridMonth.year

  /**
   * Exactly one cell in this grid is in the tab order. When the
   * focused date is in another month — the second grid of a range
   * picker — the tab stop falls to the first day this grid *can*
   * offer, because a grid with zero tab stops strands the widget and
   * a grid where every cell is tabbable is the pattern not being
   * implemented at all.
   */
  const tabStopDate = isFocusInThisMonth
    ? focusedDate
    : (days.find(getIsEnabled) ?? firstOfMonth)

  useEffect(() => {
    if (!isGridFocused || !isFocusInThisMonth) {
      return
    }

    cellElements.current
      .get(toIsoDate(focusedDate))
      ?.focus()
  }, [focusedDate, isFocusInThisMonth, isGridFocused])

  const moveFocus = (date: PlainDate) => {
    onFocusDate(clampPlainDate(date, minimum, maximum))
  }

  const handleKeyDown = (
    keyEvent: KeyboardEvent<HTMLTableCellElement>,
  ) => {
    const moves: Record<string, () => PlainDate> = {
      ArrowDown: () => addDays(focusedDate, 7),
      ArrowLeft: () => addDays(focusedDate, -1),
      ArrowRight: () => addDays(focusedDate, 1),
      ArrowUp: () => addDays(focusedDate, -7),
      End: () =>
        addDays(
          focusedDate,
          6 -
            ((getWeekday(focusedDate) -
              firstDayOfWeek +
              7) %
              7),
        ),
      Home: () =>
        addDays(
          focusedDate,
          -(
            (getWeekday(focusedDate) - firstDayOfWeek + 7) %
            7
          ),
        ),
      PageDown: () =>
        addMonths(focusedDate, keyEvent.shiftKey ? 12 : 1),
      PageUp: () =>
        addMonths(
          focusedDate,
          keyEvent.shiftKey ? -12 : -1,
        ),
    }

    const move = moves[keyEvent.key]

    if (move) {
      // Arrows scroll the page by default, and PageUp/PageDown scroll
      // it a long way. A calendar that pages the document while it
      // pages the month is the hand-rolled version of this component.
      keyEvent.preventDefault()

      moveFocus(move())

      return
    }

    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
      keyEvent.preventDefault()

      if (getIsEnabled(focusedDate)) {
        onSelectDate(focusedDate)
      }
    }
  }

  const weekdayNames = {
    long: getWeekdayNames({
      firstDayOfWeek,
      locale,
      weekday: "long",
    }),
    narrow: getWeekdayNames({
      firstDayOfWeek,
      locale,
      weekday: "narrow",
    }),
    short: getWeekdayNames({
      firstDayOfWeek,
      locale,
      weekday: "short",
    }),
  }

  /**
   * The band being painted right now: the committed pair, or the
   * committed start plus whatever the pointer or the keyboard is
   * currently over. Ordered, so a backwards drag paints forwards.
   */
  const bandFrom =
    previewEnd && rangeStart
      ? comparePlainDates(previewEnd, rangeStart) < 0
        ? previewEnd
        : rangeStart
      : null

  const bandTo =
    previewEnd && rangeStart
      ? comparePlainDates(previewEnd, rangeStart) < 0
        ? rangeStart
        : previewEnd
      : null

  const isBandWiderThanADay =
    bandFrom !== null &&
    bandTo !== null &&
    !getIsSameDay(bandFrom, bandTo)

  /**
   * Every cell of every week, including the neighbouring months'
   * days, each keyed by its own real date.
   *
   * Keying a blank cell by its position in the array is the obvious
   * thing and it is wrong twice over: React reuses the wrong node
   * when the month changes length, and the lint rule that says so is
   * right. A leading blank in August *is* a day in July; it has an
   * ISO date whether or not it is drawn.
   */
  const weeks = Array.from(
    {
      length: Math.ceil((leadingBlanks + daysInMonth) / 7),
    },
    (_unused, weekIndex) =>
      Array.from({ length: 7 }, (_blank, dayIndex) =>
        addDays(
          firstOfMonth,
          weekIndex * 7 + dayIndex - leadingBlanks,
        ),
      ),
  )

  return (
    <table
      aria-label={label}
      className="w-full border-collapse"
      onMouseLeave={() => {
        onHoverDate(null)
      }}
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a calendar IS the ARIA spec's own worked example of `role="grid"` on a `<table>` — an interactive grid whose cells take roving focus. Biome's advice ("replace table with a div") trades correct table semantics for five more suppressions on the div rebuild. It has to sit on the line immediately above the attribute: a biome suppression covers the NEXT LINE, not the next node, so one placed above a multi-line `<table` covers only the tag name — and `yarn lint` runs `--write --unsafe`, so a misplaced one deletes the role silently and the widget degrades to a static `role="table"`.
      role="grid"
    >
      {/*
        `thead`/`tbody`/`tr`/`th` carry NO explicit roles: `rowgroup`,
        `row` and `columnheader` are exactly their implicit ones inside a
        grid, and spelling them out is what `noRedundantRoles` is for. Only
        the two the platform does not imply are written — `grid` above and
        `gridcell` below, since a `<td>`'s own role is `cell`.
      */}
      <thead>
        <tr>
          {weekdayNames.long.map((longName, index) => (
            <th
              className="pb-1 font-medium text-content-secondary text-xs"
              key={longName}
              scope="col"
            >
              <span
                aria-hidden="true"
                className="cq-xs:hidden"
              >
                {weekdayNames.narrow[index]}
              </span>

              <span
                aria-hidden="true"
                className="hidden cq-xs:inline"
              >
                {weekdayNames.short[index]}
              </span>

              <VisuallyHidden>{longName}</VisuallyHidden>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {weeks.map((week) => (
          <tr key={toIsoDate(week[0] ?? firstOfMonth)}>
            {week.map((date) => {
              const isoDate = toIsoDate(date)

              if (date.month !== gridMonth.month) {
                return (
                  // A neighbouring month's day, drawn as a hole and
                  // hidden from assistive technology: six announced
                  // blanks before the 1st is noise a sighted user
                  // never hears. It still keys by its own real date —
                  // a leading blank in August *is* a day in July, and
                  // keying it by its position makes React reuse the
                  // wrong node when the month changes length.
                  <td
                    aria-hidden="true"
                    className="p-0"
                    key={isoDate}
                  >
                    <span className="block size-8 cq-xs:size-9 cq-sm:size-10" />
                  </td>
                )
              }

              const isEnabled = getIsEnabled(date)

              const isSelected = selectedDates.some((one) =>
                getIsSameDay(one, date),
              )

              const isInBand =
                isRange &&
                isBandWiderThanADay &&
                bandFrom !== null &&
                bandTo !== null &&
                comparePlainDates(date, bandFrom) >= 0 &&
                comparePlainDates(date, bandTo) <= 0

              return (
                <td
                  aria-current={
                    getIsSameDay(today, date)
                      ? "date"
                      : undefined
                  }
                  aria-disabled={
                    isEnabled ? undefined : true
                  }
                  aria-label={formatPlainDate(date, {
                    dateStyle: "full",
                    locale,
                  })}
                  aria-selected={isSelected}
                  className={toClassName(
                    CELL_BASE_CLASS,
                    FOCUS_RING_CLASS,
                    !isEnabled && "cursor-not-allowed",
                    isInBand && "bg-intent-accent-surface",
                    isInBand &&
                      bandFrom !== null &&
                      getIsSameDay(bandFrom, date) &&
                      "rounded-s-md",
                    isInBand &&
                      bandTo !== null &&
                      getIsSameDay(bandTo, date) &&
                      "rounded-e-md",
                  )}
                  key={isoDate}
                  onClick={() => {
                    if (isEnabled) {
                      onSelectDate(date)
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onMouseEnter={() => {
                    onHoverDate(date)
                  }}
                  ref={(element) => {
                    if (element) {
                      cellElements.current.set(
                        isoDate,
                        element,
                      )
                    } else {
                      cellElements.current.delete(isoDate)
                    }
                  }}
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the APG date-picker's own structure — the `<td>` IS the gridcell and carries the roving tabindex, rather than wrapping a `<button>` and putting 31 tab stops in one month. A `<td>`'s implicit role is `cell`, so `gridcell` is the one role the platform does not already imply, and `aria-selected` is not supported without it.
                  role="gridcell"
                  tabIndex={
                    getIsSameDay(tabStopDate, date) ? 0 : -1
                  }
                >
                  <span
                    aria-hidden="true"
                    className={toClassName(
                      DAY_BASE_CLASS,
                      isSelected &&
                        "bg-intent-accent-solid text-intent-accent-on-solid",
                      !isSelected &&
                        getIsSameDay(today, date) &&
                        "border-intent-accent-border font-semibold",
                      !isSelected &&
                        isEnabled &&
                        "hover:bg-intent-neutral-surface-hover",
                      !isEnabled && "text-content-disabled",
                    )}
                  >
                    {date.day}
                  </span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
