import {
  useUniqueId,
  useVisibility,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import {
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react"
import { useRef, useState } from "react"

import { Button } from "../Button/Button.tsx"
import { CONTROL_SIZE_CLASS } from "../controlStyles.ts"
import { IconButton } from "../IconButton/IconButton.tsx"
import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
} from "../intentStyles.ts"
import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
import type { SlotProps } from "../slotProps.ts"
import { mergeSlotProps } from "../slotProps.ts"
import { toClassName } from "../toClassName.ts"
import { DateGrid } from "./DateGrid.tsx"
import type { DatePreset } from "./datePresets.ts"
import { DEFAULT_DATE_PRESETS } from "./datePresets.ts"
import type { DateInputKeywords } from "./parseDateInput.ts"
import { parseDateInput } from "./parseDateInput.ts"
import type { DateRange, PlainDate } from "./plainDate.ts"
import {
  addDays,
  addMonths,
  clampPlainDate,
  comparePlainDates,
  formatPlainDate,
  getFirstDayOfWeek,
  getIsWithinRange,
  getLocalPlainDate,
  parseIsoDate,
  toIsoDate,
} from "./plainDate.ts"

export type DatePickerProps = SlotProps & {
  className?: string
  /**
   * Sunday 0 through Saturday 6. Omit and the locale decides, via
   * `Intl.Locale`'s `getWeekInfo` — which is why there is no
   * `isMondayFirst` here.
   */
  firstDayOfWeek?: number
  isDisabled?: boolean
  /**
   * Start-and-end mode. A **mode, not a sibling component** — see
   * the component docblock, and the `Combobox` `isMultiple`
   * precedent it follows.
   */
  isRange?: boolean
  /** Override the English relative words (`today`, `next`, `+3d`). */
  keywords?: DateInputKeywords
  /**
   * Required. It names the field for a screen reader **and** names
   * the calendar dialog and its grids, which a `role="dialog"` takes
   * from nothing else. Inside a `Field`, pass the same text as the
   * `Field`'s own `label` — they are the same name and WCAG 2.5.3
   * wants them to agree.
   */
  label: string
  /** Omit for the platform's resolved locale. */
  locale?: string
  /** ISO `YYYY-MM-DD`. Days after this are unselectable. */
  maxValue?: string
  /** ISO `YYYY-MM-DD`. Days before this are unselectable. */
  minValue?: string
  /**
   * An ISO `YYYY-MM-DD` in single mode, a `{ end, start }` of them in
   * range mode, and `null` when cleared. Never a `Date`, and that is
   * the point — see the docblock.
   */
  onChange?: (value: DateRange | null | string) => void
  placeholder?: string
  /** Pass `[]` to drop the shortcut row entirely. */
  presets?: readonly DatePreset[]
  size?: ControlSize
  /**
   * Which zone's calendar "today" is read from, when `today` is
   * omitted. Ignored when `today` is supplied — which is what every
   * test and every story does.
   */
  timeZone?: string
  /**
   * The clock, injected, as an ISO `YYYY-MM-DD`.
   *
   * Every relative form (`tomorrow`, `next fri`, `+14d`), the
   * `aria-current="date"` marker, and the preset row resolve against
   * this. Supplying it is what makes the component testable at all:
   * a date picker tested against the real "today" passes on the day
   * it was written and fails silently afterwards. Omitted, it is
   * read **once**, at mount, from `timeZone` or the device.
   */
  today?: string
  /** **Initial** only, like every other value prop in this library. */
  value?: DateRange | string
}

const CHEVRON_PREVIOUS = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    focusable={false}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.75}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)

const CHEVRON_NEXT = (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="none"
    focusable={false}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.75}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-border-default bg-surface-raised text-content-primary transition-colors duration-(--duration-fast) ease-standard placeholder:text-content-muted hover:border-border-strong aria-invalid:border-intent-danger-border"

type Endpoint = "end" | "start"

/**
 * A date field: a text input you can actually type into, and a
 * calendar dialog hanging off it.
 *
 * ### The value is a calendar date, never an instant
 *
 * `onChange` reports an ISO `YYYY-MM-DD` string — the same format
 * `<input type="date">` uses — and never a `Date`. A `Date` is a
 * count of milliseconds, so reading one back always goes through the
 * browser's timezone, and a due date picked at 23:30 in Denver comes
 * back as the previous day in London. `plainDate.ts` has the full
 * argument and the arithmetic; `plainDate.test.ts` re-runs it under
 * UTC+14 and UTC-11 and asserts nothing moves.
 *
 * ### Typing is the feature
 *
 * The grid is the fallback, not the interface. `tomorrow`,
 * `next fri`, `+14d`, `19 aug`, `8/19`, `2026-08-19` and a bare `19`
 * all resolve, in the active locale, against an injected `today` —
 * and **the resolution is echoed underneath the field, in a live
 * region, before anything commits.** Nothing here guesses in
 * silence: an ambiguous month prefix comes back as "'ju' could be
 * June or July", not as June. `parseDateInput.ts` is the grammar and
 * the reasoning.
 *
 * ### Range is a mode, not a sibling
 *
 * `isRange` follows
 * [Combobox's `isMultiple`](../../../docs/decisions/2026-08-05-combobox-multi-select-stays-ismultiple-not-a-separate-component.md)
 * for the same three reasons, which hold even harder here:
 *
 *  - **No distinct role.** The family is named by ARIA role. A range
 *    picker is the same `role="dialog"` over the same `role="grid"`;
 *    there is no `daterange` role to name a `DateRangePicker` after,
 *    so the name would describe a *presentation*.
 *  - **The delta is small and the shared part is everything.** The
 *    parser, the locale plumbing, the min/max clamp, the keyboard
 *    grid, the panel, the presets and the echo line are identical.
 *    What changes is a second input, a second month, and a band
 *    drawn between two days.
 *  - **`Combobox` already set the precedent for the value shape.**
 *    Its `selectedValue` is `readonly string[] | string`; this one is
 *    `DateRange | string`. A discriminated props union would type
 *    better and was rejected for that consistency, and because
 *    Storybook's docgen renders a union props type as an untyped
 *    object control.
 *
 * ### The panel is a container, and it is queried as one
 *
 * `@container` sits on the panel, and everything inside sizes to the
 * panel's own inline size rather than to the window: one-letter
 * weekday headers and 32px cells below `--cq-xs`, two-letter and
 * 36px above it, 40px above `--cq-sm`, and in range mode the two
 * months stack below `--cq-sm` and sit side by side above it. That
 * is not the same question a media query asks — the owner browses
 * zoomed in, where a 390px phone reports a 195px layout viewport and
 * a desktop window at 200% has no room either. The `size` middleware
 * clamps the panel to the space actually available, and the
 * container query reads what it got.
 *
 * ### It owns its own open state, and its own value
 *
 * Assembled, like [`Picker`](../Picker/Picker.tsx): the
 * `useVisibility` is in here, because a field that needs the caller
 * to wire `isVisible` is a field the caller has to assemble. And
 * `value` **seeds** rather than controls, matching `Select`,
 * `SegmentedControl` and `Combobox` — one owner for the value, which
 * is the whole of the state layer's argument.
 */
export const DatePicker = ({
  className,
  firstDayOfWeek,
  isDisabled = false,
  isRange = false,
  keywords,
  label,
  locale,
  maxValue,
  minValue,
  onChange,
  placeholder = "e.g. tomorrow, 8/19, +14d",
  presets = DEFAULT_DATE_PRESETS,
  size = "md",
  timeZone,
  today,
  value,
  ...receivedSlotProps
}: DatePickerProps): ReactNode => {
  const baseId = useUniqueId()

  const anchorElement = useRef<HTMLDivElement>(null)

  const inputElements = useRef(
    new Map<Endpoint, HTMLInputElement>(),
  )

  const { hide, isVisible, show } = useVisibility()

  /**
   * Read once, lazily, and never again.
   *
   * A component that re-read the clock on every render would change
   * what `tomorrow` means underneath a user typing it at midnight,
   * and would make every test a race. `today` as a prop is the
   * supported way to control it, and every story and test passes it.
   */
  const [resolvedToday] = useState(
    () =>
      parseIsoDate(today) ??
      getLocalPlainDate(new Date(), timeZone),
  )

  const todayDate = parseIsoDate(today) ?? resolvedToday

  const minimum = parseIsoDate(minValue) ?? undefined

  const maximum = parseIsoDate(maxValue) ?? undefined

  const resolvedFirstDayOfWeek =
    firstDayOfWeek ?? getFirstDayOfWeek(locale)

  const seededRange: DateRange =
    typeof value === "string"
      ? { end: null, start: value }
      : (value ?? { end: null, start: null })

  const [range, setRange] = useState<DateRange>(seededRange)

  const toDisplayText = (isoDate: null | string) => {
    const date = parseIsoDate(isoDate)

    return date === null
      ? ""
      : formatPlainDate(date, {
          dateStyle: "medium",
          locale,
        })
  }

  const [texts, setTexts] = useState({
    end: toDisplayText(seededRange.end),
    start: toDisplayText(seededRange.start),
  })

  const [activeEndpoint, setActiveEndpoint] =
    useState<Endpoint>("start")

  const [isGridFocused, setIsGridFocused] = useState(false)

  const [hoveredDate, setHoveredDate] =
    useState<null | PlainDate>(null)

  const [focusedDate, setFocusedDate] = useState<PlainDate>(
    () =>
      clampPlainDate(
        parseIsoDate(seededRange.start) ?? todayDate,
        minimum,
        maximum,
      ),
  )

  const [visibleMonth, setVisibleMonth] =
    useState<PlainDate>(
      () => parseIsoDate(seededRange.start) ?? todayDate,
    )

  const parsed = parseDateInput(texts[activeEndpoint], {
    keywords,
    locale,
    today: todayDate,
  })

  const echoId = `${baseId}-echo`

  const dismiss = () => {
    hide()

    setIsGridFocused(false)

    setHoveredDate(null)

    inputElements.current.get(activeEndpoint)?.focus()
  }

  const {
    context,
    floatingStyles,
    getFloatingProps,
    setFloating,
  } = useAnchoredOverlay({
    anchorRef: anchorElement,
    isVisible,
    maxHeightPx: 520,
    maxWidthPx: isRange ? 656 : 320,
    offsetValue: 4,
    onDismiss: () => {
      dismiss()
    },
    role: "dialog",
    trigger: undefined,
  })

  const { id: panelId, ...floatingProps } =
    getFloatingProps() as Record<string, unknown> & {
      id: string
    }

  const report = (nextRange: DateRange) => {
    setRange(nextRange)

    if (isRange) {
      onChange?.(
        nextRange.end === null && nextRange.start === null
          ? null
          : nextRange,
      )

      return
    }

    onChange?.(nextRange.start)
  }

  const writeEndpoint = (
    endpoint: Endpoint,
    date: null | PlainDate,
  ) => {
    const isoDate = date === null ? null : toIsoDate(date)

    setTexts((previous) => ({
      ...previous,
      [endpoint]:
        date === null ? "" : toDisplayText(isoDate),
    }))

    const nextRange = isRange
      ? { ...range, [endpoint]: isoDate }
      : { end: null, start: isoDate }

    // A range whose end precedes its start is not a range anybody
    // typed on purpose, and rejecting it would throw away the day
    // they just picked. Swapping keeps both dates and matches every
    // range control in the wild.
    const isBackwards =
      isRange &&
      nextRange.end !== null &&
      nextRange.start !== null &&
      nextRange.end < nextRange.start

    report(
      isBackwards
        ? { end: nextRange.start, start: nextRange.end }
        : nextRange,
    )
  }

  const commitText = (endpoint: Endpoint) => {
    const result = parseDateInput(texts[endpoint], {
      keywords,
      locale,
      today: todayDate,
    })

    if (result.kind === "empty") {
      writeEndpoint(endpoint, null)

      return
    }

    if (result.kind === "unparsed") {
      // The text stays exactly as typed. Clearing it would throw
      // away what the user has to edit, and rewriting it to the last
      // good value would silently discard the thing they meant.
      return
    }

    writeEndpoint(
      endpoint,
      clampPlainDate(result.date, minimum, maximum),
    )
  }

  const handleTextChange = (
    endpoint: Endpoint,
    nextText: string,
  ) => {
    setTexts((previous) => ({
      ...previous,
      [endpoint]: nextText,
    }))

    const result = parseDateInput(nextText, {
      keywords,
      locale,
      today: todayDate,
    })

    // Live preview: the grid follows what has been typed so far
    // without committing it, which is what makes `next fri` legible
    // rather than an act of faith.
    if (result.kind === "date") {
      setFocusedDate(result.date)

      setVisibleMonth(result.date)
    }
  }

  const chooseDate = (date: PlainDate) => {
    setFocusedDate(date)

    if (!isRange) {
      writeEndpoint("start", date)

      dismiss()

      return
    }

    const isStartingOver =
      range.start === null || range.end !== null

    if (isStartingOver) {
      setTexts((previous) => ({ ...previous, end: "" }))

      setRange({ end: null, start: toIsoDate(date) })

      setTexts((previous) => ({
        ...previous,
        start: toDisplayText(toIsoDate(date)),
      }))

      setActiveEndpoint("end")

      return
    }

    writeEndpoint("end", date)

    dismiss()
  }

  const handleInputKeyDown = (
    keyEvent: ReactKeyboardEvent<HTMLInputElement>,
    endpoint: Endpoint,
  ) => {
    if (keyEvent.key === "ArrowDown") {
      keyEvent.preventDefault()

      show()

      setIsGridFocused(true)

      return
    }

    if (keyEvent.key === "Enter") {
      keyEvent.preventDefault()

      commitText(endpoint)

      if (isVisible) {
        dismiss()
      }

      return
    }

    if (keyEvent.key === "Escape" && isVisible) {
      keyEvent.preventDefault()

      dismiss()
    }
  }

  const selectedDates = [
    parseIsoDate(range.start),
    parseIsoDate(range.end),
  ].filter((one) => one !== null)

  const rangeStartDate = parseIsoDate(range.start)

  const previewEnd = isRange
    ? (parseIsoDate(range.end) ??
      (rangeStartDate === null
        ? null
        : (hoveredDate ??
          (comparePlainDates(focusedDate, rangeStartDate) >
          0
            ? focusedDate
            : null))))
    : null

  const secondMonth = addMonths(visibleMonth, 1)

  const monthLabel = (month: PlainDate) =>
    formatPlainDate(month, {
      locale,
      month: "long",
      year: "numeric",
    })

  const echoText =
    parsed.kind === "date"
      ? formatPlainDate(parsed.date, {
          dateStyle: "full",
          locale,
        })
      : parsed.kind === "unparsed"
        ? parsed.reason
        : ""

  const isInvalid = parsed.kind === "unparsed"

  const renderInput = (endpoint: Endpoint) => {
    const ownProps = {
      "aria-controls": isVisible ? panelId : undefined,
      "aria-describedby": echoId,
      "aria-expanded": isVisible,
      "aria-haspopup": "dialog" as const,
      "aria-invalid":
        activeEndpoint === endpoint && isInvalid
          ? true
          : undefined,
      "aria-label": isRange
        ? `${label} ${endpoint}`
        : label,
      autoComplete: "off",
      className: toClassName(
        INPUT_CLASS,
        CONTROL_SIZE_CLASS[size],
        FOCUS_RING_CLASS,
        DISABLED_CLASS,
      ),
      disabled: isDisabled,
      id: `${baseId}-${endpoint}`,
      // A date is digits far more often than it is words, and a
      // numeric-leaning soft keyboard with letters still available is
      // what lets `8/19` and `next fri` both be typed on a phone.
      inputMode: "text" as const,
      onChange: (changeEvent: {
        currentTarget: { value: string }
      }) => {
        handleTextChange(
          endpoint,
          changeEvent.currentTarget.value,
        )
      },
      onClick: () => {
        setActiveEndpoint(endpoint)

        show()
      },
      onFocus: () => {
        setActiveEndpoint(endpoint)
      },
      onKeyDown: (
        keyEvent: ReactKeyboardEvent<HTMLInputElement>,
      ) => {
        handleInputKeyDown(keyEvent, endpoint)
      },
      placeholder,
      ref: (element: HTMLInputElement | null) => {
        if (element) {
          inputElements.current.set(endpoint, element)
        } else {
          inputElements.current.delete(endpoint)
        }
      },
      role: "combobox" as const,
      type: "text" as const,
      value: texts[endpoint],
    }

    return (
      <input
        // The `Field` above clones `id`, `aria-describedby`,
        // `aria-invalid` and `required` onto this component; they
        // belong on the input, not on the wrapper, and only on the
        // first one — a `<label for>` names one control.
        {...(endpoint === "start"
          ? mergeSlotProps(receivedSlotProps, ownProps)
          : ownProps)}
        key={endpoint}
      />
    )
  }

  const renderGrid = (month: PlainDate) => (
    <DateGrid
      firstDayOfWeek={resolvedFirstDayOfWeek}
      focusedDate={focusedDate}
      gridMonth={month}
      isGridFocused={isGridFocused}
      isRange={isRange}
      key={`${month.year}-${month.month}`}
      label={monthLabel(month)}
      locale={locale}
      maximum={maximum}
      minimum={minimum}
      onFocusDate={(date) => {
        setFocusedDate(date)

        setVisibleMonth(date)
      }}
      onHoverDate={setHoveredDate}
      onSelectDate={chooseDate}
      previewEnd={previewEnd}
      rangeStart={rangeStartDate}
      selectedDates={selectedDates}
      today={todayDate}
    />
  )

  return (
    // The overlay anchors to THIS box, not to the input row, so the echo
    // line below stays visible while the calendar is open. It is the line
    // that says what a typed value resolved to; a panel covering it turns
    // the one anti-guess mechanism off at exactly the moment it matters.
    <div
      className={toClassName(
        "flex flex-col gap-1",
        className,
      )}
      ref={anchorElement}
    >
      <div className="flex items-center gap-2">
        {renderInput("start")}

        {isRange ? (
          <>
            <span
              aria-hidden="true"
              className="shrink-0 text-content-secondary text-sm"
            >
              to
            </span>

            {renderInput("end")}
          </>
        ) : null}
      </div>

      {/*
        The anti-silent-guess mechanism, and the reason this component
        is allowed to accept `8/19` at all. It is a live region so the
        resolution is announced while typing, and it is wired into the
        input's `aria-describedby` so it is read again on focus. A
        parser this permissive without this line would be a field that
        quietly files things in the wrong month.
      */}
      <p
        aria-live="polite"
        className={toClassName(
          "min-h-5 text-sm",
          isInvalid
            ? "text-intent-danger-content"
            : "text-content-secondary",
        )}
        id={echoId}
        role="status"
      >
        {echoText}
      </p>

      {isVisible ? (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            // Focus stays where the user is typing until they ask for
            // the grid with ArrowDown or a click. A calendar that
            // steals the caret on open is a calendar you cannot type
            // into, which is the whole point of this field.
            disabled
            modal={false}
          >
            <div
              {...floatingProps}
              aria-label={`${label} calendar`}
              className={toClassName(
                PANEL_SURFACE_CLASS,
                // `overflow-hidden`, because `maxHeightPx` reaches the
                // panel as a `max-height` from the `size` middleware and
                // nothing else clips: on a phone the preset row simply
                // spilled out past the panel's own rounded edge and sat
                // on the page behind it. The *months* are what scrolls
                // (below), so the month nav and the shortcut row stay
                // put — a preset you have to scroll to find is not a
                // shortcut, and it is the fastest control here on a
                // phone.
                "@container z-[var(--layer-modal)] flex flex-col gap-3 overflow-hidden p-3 text-content-primary",
                isRange ? "w-[41rem]" : "w-80",
              )}
              id={panelId}
              ref={setFloating}
              role="dialog"
              style={floatingStyles}
            >
              <div className="flex items-center justify-between gap-2">
                <IconButton
                  appearance="ghost"
                  label="Previous month"
                  onClick={() => {
                    setVisibleMonth(
                      addMonths(visibleMonth, -1),
                    )
                  }}
                  size="sm"
                  type="button"
                >
                  {CHEVRON_PREVIOUS}
                </IconButton>

                <span
                  // Announced on change, so paging with the buttons
                  // says which month you landed on rather than
                  // silently redrawing 35 cells.
                  aria-live="polite"
                  className="font-medium text-sm"
                >
                  {isRange
                    ? `${monthLabel(visibleMonth)} – ${monthLabel(secondMonth)}`
                    : monthLabel(visibleMonth)}
                </span>

                <IconButton
                  appearance="ghost"
                  label="Next month"
                  onClick={() => {
                    setVisibleMonth(
                      addMonths(visibleMonth, 1),
                    )
                  }}
                  size="sm"
                  type="button"
                >
                  {CHEVRON_NEXT}
                </IconButton>
              </div>

              <div className="charcuterie-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto cq-sm:flex-row">
                {renderGrid(visibleMonth)}

                {isRange ? renderGrid(secondMonth) : null}
              </div>

              {presets.length > 0 ||
              range.start !== null ? (
                <div className="flex flex-wrap items-center gap-1 border-border-subtle border-t pt-2">
                  {presets.map((preset) => {
                    const presetDate = addDays(
                      todayDate,
                      preset.days,
                    )

                    return (
                      <Button
                        appearance="ghost"
                        isDisabled={
                          !getIsWithinRange(
                            presetDate,
                            minimum,
                            maximum,
                          )
                        }
                        key={preset.label}
                        onClick={() => {
                          setVisibleMonth(presetDate)

                          chooseDate(presetDate)
                        }}
                        size="sm"
                        type="button"
                      >
                        {preset.label}
                      </Button>
                    )
                  })}

                  {range.start === null ? null : (
                    <Button
                      appearance="ghost"
                      className="ms-auto"
                      intent="danger"
                      onClick={() => {
                        setTexts({ end: "", start: "" })

                        report({ end: null, start: null })

                        setActiveEndpoint("start")
                      }}
                      size="sm"
                      type="button"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </div>
  )
}
