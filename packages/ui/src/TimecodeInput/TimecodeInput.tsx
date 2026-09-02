import { useUniqueId } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react"
import { useState } from "react"

import { CONTROL_SIZE_CLASS } from "../controlStyles.ts"
import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
} from "../intentStyles.ts"
import type { SlotProps } from "../slotProps.ts"
import { mergeSlotProps } from "../slotProps.ts"
import { toClassName } from "../toClassName.ts"
import type { TimecodeRange } from "./timecode.ts"
import {
  clampTimecode,
  formatTimecode,
  parseTimecodeInput,
} from "./timecode.ts"

export type TimecodeInputProps = SlotProps & {
  className?: string
  /**
   * How long the media is. It is the default `maxValueMs`, so a
   * consumer that knows the file's length gets the clamp without
   * stating a bound twice.
   */
  durationMs?: number
  isDisabled?: boolean
  /**
   * Section mode — a start and an end. A **mode, not a sibling
   * component**, following `DatePicker`'s `isRange` and `Combobox`'s
   * `isMultiple`.
   */
  isRange?: boolean
  /**
   * Required. In section mode it names **both** inputs, as
   * "<label> start" and "<label> end", so the two stay separately
   * addressable by a screen reader and by an agent.
   */
  label: string
  /** The end of the allowed window. Defaults to `durationMs`. */
  maxValueMs?: number
  /** The start of the allowed window. Defaults to `0`. */
  minValueMs?: number
  /**
   * Milliseconds in single mode, a `{ end, start }` of them in
   * section mode, and `null` when both ends are cleared.
   */
  onChange?: (value: null | number | TimecodeRange) => void
  placeholder?: string
  size?: ControlSize
  /** How far ArrowUp and ArrowDown move. Shift multiplies it by ten. */
  stepMs?: number
  /** **Initial** only, like every other value prop in this library. */
  valueMs?: number | TimecodeRange
}

const INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-border-default bg-surface-raised text-content-primary transition-colors duration-(--duration-fast) ease-standard placeholder:text-content-muted hover:border-border-strong aria-invalid:border-intent-danger-border"

type Endpoint = "end" | "start"

const toSeededRange = (
  valueMs: number | TimecodeRange | undefined,
): TimecodeRange =>
  valueMs === undefined
    ? { end: null, start: null }
    : typeof valueMs === "number"
      ? { end: null, start: valueMs }
      : valueMs

/**
 * A timecode field: a text input a person can actually type a media
 * position into, with an `isRange` mode for a section of a file.
 *
 * ### Why this is a text field and not `<input type="time">`
 *
 * Two reasons and neither is taste.
 *
 * A `time` input's smallest step is a **second** unless `step` is
 * fractional, its value is a wall-clock `HH:MM` string capped at 24
 * hours, and it has no way to express "1.5 hours into a file" as a
 * duration rather than as half past one. A clip boundary in a video
 * editor is milliseconds; the platform control cannot carry them.
 *
 * And it is painted by the operating system, from
 * `::-webkit-datetime-edit-*` pseudo-elements no token reaches
 * inside — the same mechanism that
 * [deprecated the native `Select`](../../../../docs/decisions/2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md)
 * and that kept `Slider` off
 * [`<input type="range">`](../../../../docs/decisions/2026-08-22-the-slider-is-a-div-with-role-slider-not-an-input-range.md).
 * A `<input type="text">` this component owns every pixel of is the
 * settled answer to that shape of question.
 *
 * ### Typing is the whole interface, so nothing guesses in silence
 *
 * `90`, `1:30`, `1:02:03` and `1:02:03.500` all resolve, and the
 * resolution is echoed underneath the field, in a live region, before
 * anything commits. Commit is Enter or blur; a keystroke never
 * commits, a refused value leaves the text exactly as typed, and
 * Escape puts back the last committed value. `timecode.ts` is the
 * grammar and the reasoning.
 *
 * ### Both ends of a section are independently optional
 *
 * `{ end, start }` has four real states, not three plus an error: no
 * window, from here to the end of the media, from the beginning up to
 * here, and the window between two points. So there is no
 * `isEndOpen` prop — `null` says it — and clearing one end never
 * touches the other.
 *
 * An **inverted** section swaps, because throwing the pair away would
 * discard the boundary just typed. A **zero-length** section is
 * refused by name: it plays nothing, so swapping would hide a typo
 * behind a window that silently does not exist.
 */
export const TimecodeInput = ({
  className,
  durationMs,
  isDisabled = false,
  isRange = false,
  label,
  maxValueMs,
  minValueMs,
  onChange,
  placeholder = "e.g. 1:02:03.500",
  size = "md",
  stepMs = 1_000,
  valueMs,
  ...receivedSlotProps
}: TimecodeInputProps): ReactNode => {
  const baseId = useUniqueId()

  const minimum = minValueMs ?? 0

  const maximum = maxValueMs ?? durationMs

  const [seededRange] = useState(() =>
    toSeededRange(valueMs),
  )

  const [range, setRange] =
    useState<TimecodeRange>(seededRange)

  const toDisplayText = (milliseconds: null | number) =>
    milliseconds === null
      ? ""
      : formatTimecode(milliseconds)

  const [texts, setTexts] = useState({
    end: toDisplayText(seededRange.end),
    start: toDisplayText(seededRange.start),
  })

  const [activeEndpoint, setActiveEndpoint] =
    useState<Endpoint>("start")

  /**
   * A refusal the grammar cannot see, because it is about the
   * **pair** rather than about either text: a zero-length section.
   * Cleared by the next keystroke, so an edit always gets a fresh
   * reading rather than an old complaint.
   */
  const [rangeRefusal, setRangeRefusal] = useState<
    null | string
  >(null)

  const parsed = parseTimecodeInput(texts[activeEndpoint])

  const echoId = `${baseId}-echo`

  const report = (nextRange: TimecodeRange) => {
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
    milliseconds: null | number,
  ) => {
    if (!isRange) {
      setTexts({
        end: "",
        start: toDisplayText(milliseconds),
      })

      setRangeRefusal(null)

      report({ end: null, start: milliseconds })

      return
    }

    const nextRange = {
      ...range,
      [endpoint]: milliseconds,
    } as TimecodeRange

    // Only a pair can be compared. An open start is the absence of a
    // choice rather than zero, so a section that only says where to
    // stop is clamped and accepted — and stays able to complain the
    // moment a start arrives that really does sit after it.
    const isPair =
      nextRange.end !== null && nextRange.start !== null

    if (isPair && nextRange.end === nextRange.start) {
      setRangeRefusal(
        `A section needs a length, and this one starts and ends at ${toDisplayText(milliseconds)}.`,
      )

      return
    }

    const isBackwards =
      isPair &&
      (nextRange.end ?? 0) < (nextRange.start ?? 0)

    const settled = isBackwards
      ? { end: nextRange.start, start: nextRange.end }
      : nextRange

    setTexts(
      isBackwards
        ? {
            end: toDisplayText(settled.end),
            start: toDisplayText(settled.start),
          }
        : (previous) => ({
            ...previous,
            [endpoint]: toDisplayText(milliseconds),
          }),
    )

    setRangeRefusal(null)

    report(settled)
  }

  const commitText = (endpoint: Endpoint) => {
    const result = parseTimecodeInput(texts[endpoint])

    if (result.kind === "empty") {
      writeEndpoint(endpoint, null)

      return
    }

    if (result.kind === "unparsed") {
      // The text stays exactly as typed. Clearing it throws away
      // what the person has to edit; rewriting it to the last good
      // value discards what they meant.
      return
    }

    writeEndpoint(
      endpoint,
      clampTimecode(result.milliseconds, minimum, maximum),
    )
  }

  /**
   * ArrowUp and ArrowDown, which **do** commit.
   *
   * That is not an exception to "a keystroke never commits" — it is
   * the other side of it. Typing is a draft the echo reports on;
   * a step is a whole gesture on a value that already exists, the
   * same act as clicking a day in `DatePicker`'s grid, and a
   * stepper that needed Enter afterwards would be a stepper nobody
   * pressed twice.
   */
  const stepEndpoint = (
    endpoint: Endpoint,
    direction: -1 | 1,
    isCoarse: boolean,
  ) => {
    const result = parseTimecodeInput(texts[endpoint])

    const base =
      result.kind === "timecode"
        ? result.milliseconds
        : (range[endpoint] ?? 0)

    writeEndpoint(
      endpoint,
      clampTimecode(
        base + stepMs * (isCoarse ? 10 : 1) * direction,
        minimum,
        maximum,
      ),
    )
  }

  const handleKeyDown = (
    keyEvent: ReactKeyboardEvent<HTMLInputElement>,
    endpoint: Endpoint,
  ) => {
    if (keyEvent.key === "Enter") {
      keyEvent.preventDefault()

      commitText(endpoint)

      return
    }

    if (keyEvent.key === "Escape") {
      keyEvent.preventDefault()

      setRangeRefusal(null)

      setTexts((previous) => ({
        ...previous,
        [endpoint]: toDisplayText(range[endpoint]),
      }))

      return
    }

    if (
      keyEvent.key === "ArrowUp" ||
      keyEvent.key === "ArrowDown"
    ) {
      keyEvent.preventDefault()

      stepEndpoint(
        endpoint,
        keyEvent.key === "ArrowUp" ? 1 : -1,
        keyEvent.shiftKey,
      )
    }
  }

  const clampedPreview =
    parsed.kind === "timecode"
      ? clampTimecode(parsed.milliseconds, minimum, maximum)
      : null

  const parsedEcho =
    parsed.kind === "unparsed"
      ? parsed.reason
      : parsed.kind === "empty" || clampedPreview === null
        ? ""
        : clampedPreview === parsed.milliseconds
          ? formatTimecode(parsed.milliseconds)
          : `${formatTimecode(parsed.milliseconds)} is outside the media, so it commits as ${formatTimecode(clampedPreview)}.`

  const echoText = rangeRefusal ?? parsedEcho

  const isInvalid =
    rangeRefusal !== null || parsed.kind === "unparsed"

  const renderInput = (endpoint: Endpoint) => {
    const ownProps = {
      "aria-describedby": echoId,
      "aria-invalid":
        activeEndpoint === endpoint && isInvalid
          ? true
          : undefined,
      "aria-label": isRange
        ? `${label} ${endpoint}`
        : label,
      autoComplete: "off" as const,
      className: toClassName(
        INPUT_CLASS,
        CONTROL_SIZE_CLASS[size],
        FOCUS_RING_CLASS,
        DISABLED_CLASS,
      ),
      disabled: isDisabled,
      // A `Field` above mints an `id` for its `<label htmlFor>` and
      // clones it down. Preferring it over the generated one is what
      // keeps that label pointing at something — the generated id is
      // referenced by nothing here, so there is nothing to lose by
      // standing aside for a caller's.
      id:
        endpoint === "start"
          ? (receivedSlotProps.id ?? `${baseId}-start`)
          : `${baseId}-end`,
      // A timecode is digits and two separators, so the numeric
      // keypad is the right soft keyboard — and a bare seconds count
      // is a first-class form of the grammar precisely because iOS
      // gives that keypad no colon. `90` and `5400` are complete
      // timecodes, so the phone case is answered by the grammar
      // rather than by a keyboard the field cannot choose.
      inputMode: "numeric" as const,
      onBlur: () => {
        commitText(endpoint)
      },
      onChange: (changeEvent: {
        currentTarget: { value: string }
      }) => {
        // Read out of the event NOW. React nulls `currentTarget`
        // once the handler returns, and a `setTexts` updater runs
        // after that — so reaching for it inside the updater is a
        // `Cannot read properties of null` at the next render.
        const nextText = changeEvent.currentTarget.value

        setRangeRefusal(null)

        setTexts((previous) => ({
          ...previous,
          [endpoint]: nextText,
        }))
      },
      onFocus: () => {
        setActiveEndpoint(endpoint)
      },
      onKeyDown: (
        keyEvent: ReactKeyboardEvent<HTMLInputElement>,
      ) => {
        handleKeyDown(keyEvent, endpoint)
      },
      placeholder,
      type: "text" as const,
      value: texts[endpoint],
    }

    return (
      <input
        // A `Field` above clones `id`, `aria-describedby`,
        // `aria-invalid` and `required` onto this component. They
        // belong on the control, and only on the first one — a
        // `<label for>` names one control.
        {...(endpoint === "start"
          ? mergeSlotProps(receivedSlotProps, ownProps)
          : ownProps)}
        key={endpoint}
      />
    )
  }

  return (
    <div
      className={toClassName(
        "flex flex-col gap-1",
        className,
      )}
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
        The anti-silent-guess mechanism, and the reason this field is
        allowed to accept `90` at all. A live region, so a resolution
        is announced while typing, and wired into the input's
        `aria-describedby` so it is read again on focus. A grammar
        this permissive without this line is a field that quietly
        starts a clip a minute late.
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
    </div>
  )
}
