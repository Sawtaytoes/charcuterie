/**
 * What a human types into a timecode field, turned into a position
 * in a piece of media — or into a stated reason it was not one.
 *
 * ### Milliseconds, and only milliseconds
 *
 * A media position is a **duration from the start of the file**, so
 * the value is an integer count of milliseconds and nothing else. It
 * is not a `Date`, it is not a clock time, and it is not a string:
 * the only arithmetic anybody does with it is subtraction, and a
 * number is the type that supports it. The props that carry one keep
 * the `Ms` suffix, because a duration's unit is genuinely ambiguous
 * and the fleet has both seconds and milliseconds in use
 * ([decision](../../../../docs/decisions/2026-08-25-an-outbound-http-cache-names-its-fields-fetchedat-and-expiresat.md)).
 *
 * ### The fleet writes the printing half five times and the reading
 * half never
 *
 * `formatTimecode` replaces five hand-rolled `h:mm:ss` printers —
 * queuepilot's `clock` and `toClock`, castkit's `formatTime`, and
 * mux-magic's two modal formatters — each with its own answer to
 * whether the hour is shown and whether the minute is padded.
 * `parseTimecodeInput` has no counterpart at all: nothing in the
 * fleet *reads* a timecode a person typed, which is why the grammar
 * gets the care here rather than being rediscovered per app.
 *
 * ### The rule that governs the grammar: never guess in silence
 *
 * The same three mechanisms `parseDateInput.ts` states, for the same
 * reason:
 *
 *  1. **The grammar is ordered and total.** Each accepting rule is
 *     anchored on the *whole* input, the first match wins, and if
 *     none matches the answer is a named failure. `1:` is not one
 *     minute, and `1:90` is not `2:30`.
 *  2. **An overflow is a failure with a name, not a carry.** `1:90`
 *     is refused, and the message offers both legal spellings —
 *     `2:30` and `90` — without committing to either. Silently
 *     carrying 90 seconds into the minute is the `1:60` trap
 *     mux-magic wrote down in
 *     `docs/audits/2026-06-29-pre-rename-domain-decisions.md`.
 *  3. **Nothing commits without an echo.** `TimecodeInput` renders
 *     the resolved position in full underneath the field, in a live
 *     region, before anything commits.
 *
 * ### The largest field present is unbounded; every smaller one is
 * 0–59
 *
 * One sentence covers every bound in the grammar. `90` is ninety
 * **seconds**, `90:00` is ninety **minutes**, and `1:90` is refused
 * because the minute beside it makes 90 a seconds field. That is why
 * a bare number is seconds rather than minutes: seconds is the
 * smallest unit the field prints, so the reading that needs no
 * explanation is the one where the typist appended nothing.
 */

const MILLISECONDS_PER_SECOND = 1_000

const MILLISECONDS_PER_MINUTE = 60_000

const MILLISECONDS_PER_HOUR = 3_600_000

/**
 * A clip window, in milliseconds. Keys alphabetised, matching
 * `DateRange`.
 *
 * **Both ends are independently optional**, and the four
 * combinations are four real states rather than three plus an error:
 * no window at all, from here to the end of the media, from the
 * beginning up to here, and the window between two points. An open
 * start is not zero — it is the absence of a choice — which is what
 * lets a half-open window be clamped without being compared.
 */
export type TimecodeRange = {
  end: null | number
  start: null | number
}

export type TimecodeInputResult =
  | { kind: "empty" }
  | { kind: "timecode"; milliseconds: number }
  | { kind: "unparsed"; reason: string }

export type FormatTimecodeOptions = {
  /**
   * `true` — the default — prints the hours field even when it is
   * `00`, so every value the field writes has the same shape and the
   * same width. `false` rolls the hours into the minutes
   * (`5400000` → `90:00.000`), which the grammar reads back
   * unchanged because the largest field present is unbounded.
   */
  isHoursShown?: boolean
  /** `0` through `3`. `0` drops the fraction and its separator. */
  millisecondDigits?: number
}

const padTwo = (value: number) =>
  String(value).padStart(2, "0")

/**
 * A position in a piece of media, printed.
 *
 * Zero-padded, and **truncating** rather than rounding: at
 * `millisecondDigits: 0` a position 1999 ms into a file is second 1,
 * because it has not reached second 2 yet. Rounding would print a
 * seek point the media has not played.
 *
 * The default is the canonical `hh:mm:ss.mmm`, and that is what the
 * field writes back on commit. One spelling means a re-read of the
 * field parses to the number that produced it, and a screenshot of
 * the same value is the same picture — neither of which is true of
 * the fleet's five printers, three of which hide the hour and two of
 * which do not pad the minute.
 */
export const formatTimecode = (
  milliseconds: number,
  {
    isHoursShown = true,
    millisecondDigits = 3,
  }: FormatTimecodeOptions = {},
): string => {
  const total = Number.isFinite(milliseconds)
    ? Math.max(0, Math.floor(milliseconds))
    : 0

  const digits = Math.min(
    3,
    Math.max(0, Math.floor(millisecondDigits)),
  )

  const hours = isHoursShown
    ? Math.floor(total / MILLISECONDS_PER_HOUR)
    : 0

  const minutes = Math.floor(
    (total - hours * MILLISECONDS_PER_HOUR) /
      MILLISECONDS_PER_MINUTE,
  )

  const seconds = Math.floor(
    (total % MILLISECONDS_PER_MINUTE) /
      MILLISECONDS_PER_SECOND,
  )

  const fraction =
    digits === 0
      ? ""
      : `.${String(total % MILLISECONDS_PER_SECOND)
          .padStart(3, "0")
          .slice(0, digits)}`

  return `${isHoursShown ? `${padTwo(hours)}:` : ""}${padTwo(minutes)}:${padTwo(seconds)}${fraction}`
}

/**
 * Hold a position inside the media.
 *
 * The floor is `0` when no `minimum` is given, because a media
 * position before the start of the file does not exist — the same
 * reason the grammar refuses a negative rather than clamping one
 * silently. An inverted pair of bounds resolves to the floor: a
 * caller whose `maximum` sits below its `minimum` has a bug, and
 * quietly widening the window would hide it somewhere nobody looks.
 */
export const clampTimecode = (
  milliseconds: number,
  minimum?: number,
  maximum?: number,
): number => {
  const floor = Math.max(0, minimum ?? 0)

  if (!Number.isFinite(milliseconds)) {
    return floor
  }

  const ceiling =
    maximum === undefined || !Number.isFinite(maximum)
      ? Number.POSITIVE_INFINITY
      : Math.max(floor, maximum)

  return Math.min(Math.max(milliseconds, floor), ceiling)
}

/**
 * The three accepting rules, in the order they are tried.
 *
 * They are disjoint by colon count, so the order is a statement of
 * discipline rather than a tie-breaker — but the discipline is what
 * keeps a fourth rule from being appended as a nearest guess.
 *
 * The fraction separator may be a `.` or a `,`: half of Europe types
 * the second one, both are unambiguous here because a timecode has
 * no thousands separator, and the echo prints the canonical `.` back
 * either way.
 */
const HOURS_MINUTES_SECONDS =
  /^\+?(\d{1,5}):(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/

const MINUTES_SECONDS =
  /^\+?(\d{1,7}):(\d{1,2})(?:[.,](\d{1,3}))?$/

const SECONDS = /^\+?(\d{1,9})(?:[.,](\d{1,3}))?$/

/** Anchored diagnostics, tried only after every accepting rule has failed. */
const NEGATIVE = /^-/

const TOO_MANY_PARTS = /^\+?\d+(?::\d+){3,}(?:[.,]\d+)?$/

const LONG_FRACTION = /^\+?\d+(?::\d+){0,2}[.,]\d{4,}$/

const unparsed = (reason: string): TimecodeInputResult => ({
  kind: "unparsed",
  reason,
})

/**
 * A field that overflowed, named rather than carried.
 *
 * The message OFFERS both legal spellings and commits to neither,
 * which is the whole difference between this and a parser that
 * "just works": carrying the overflow moves a clip start by a whole
 * minute and nothing ever says so. Offering the carried form is not
 * the same as taking it — the typist reads two options and picks,
 * and either pick is one keystroke away.
 */
const describeOverflow = ({
  carriedMilliseconds,
  dropped,
  isHoursShown,
  larger,
  typed,
  unit,
}: {
  carriedMilliseconds: number
  dropped: string
  isHoursShown: boolean
  larger: string
  typed: string
  unit: "minute" | "second"
}) =>
  `${larger} has 60 ${unit}s, so "${typed}" is not a ${unit}s field. Type ${formatTimecode(
    carriedMilliseconds,
    { isHoursShown, millisecondDigits: 0 },
  )} to carry it, or ${dropped} to mean ${typed} ${unit}s.`

const toMilliseconds = ({
  fraction,
  hours,
  minutes,
  seconds,
}: {
  fraction: string | undefined
  hours?: string
  minutes?: string
  seconds: string
}): TimecodeInputResult => {
  const total =
    Number(hours ?? 0) * MILLISECONDS_PER_HOUR +
    Number(minutes ?? 0) * MILLISECONDS_PER_MINUTE +
    Number(seconds) * MILLISECONDS_PER_SECOND

  // The largest field present is unbounded; every smaller one is
  // 0–59. Checked outermost-first, so `1:90:90` reports the minute —
  // the field a reader fixes first.
  if (
    hours !== undefined &&
    minutes !== undefined &&
    Number(minutes) > 59
  ) {
    return unparsed(
      describeOverflow({
        carriedMilliseconds: total,
        dropped: `${minutes}:${seconds}`,
        isHoursShown: true,
        larger: "An hour",
        typed: minutes,
        unit: "minute",
      }),
    )
  }

  if (minutes !== undefined && Number(seconds) > 59) {
    return unparsed(
      describeOverflow({
        carriedMilliseconds: total,
        dropped: seconds,
        isHoursShown: hours !== undefined,
        larger: "A minute",
        typed: seconds,
        unit: "second",
      }),
    )
  }

  // `.5` is half a second, not five milliseconds — a fraction is a
  // decimal fraction of a second, so it pads on the RIGHT.
  return {
    kind: "timecode",
    milliseconds:
      total +
      (fraction === undefined
        ? 0
        : Number(fraction.padEnd(3, "0"))),
  }
}

/**
 * Read a typed timecode, or say why it is not one.
 *
 * Takes no options, deliberately. Every knob considered belongs
 * somewhere else: a maximum is the field's clamp at commit rather
 * than a parse failure (two sources for one fact is how a control
 * ends up invalid with nothing saying why), the decimal comma is
 * accepted unconditionally instead of being a locale switch, and a
 * frame rate makes this a different widget. An options bag that
 * means nothing is API a consumer has to read before learning there
 * is nothing in it.
 */
export const parseTimecodeInput = (
  rawText: string,
): TimecodeInputResult => {
  const text = rawText.replace(/\s/g, "")

  if (text === "") {
    return { kind: "empty" }
  }

  // A leading `-` is refused before anything else. Every accepting
  // rule below would otherwise fail on it and report the generic
  // message, which tells a typist that `-5` is unreadable rather
  // than that it is out of bounds.
  if (NEGATIVE.test(text)) {
    return unparsed(
      "A timecode is never negative. The start of the media is 0.",
    )
  }

  const hoursMinutesSeconds =
    HOURS_MINUTES_SECONDS.exec(text)

  if (
    hoursMinutesSeconds?.[1] !== undefined &&
    hoursMinutesSeconds[2] !== undefined &&
    hoursMinutesSeconds[3] !== undefined
  ) {
    return toMilliseconds({
      fraction: hoursMinutesSeconds[4],
      hours: hoursMinutesSeconds[1],
      minutes: hoursMinutesSeconds[2],
      seconds: hoursMinutesSeconds[3],
    })
  }

  const minutesSeconds = MINUTES_SECONDS.exec(text)

  if (
    minutesSeconds?.[1] !== undefined &&
    minutesSeconds[2] !== undefined
  ) {
    return toMilliseconds({
      fraction: minutesSeconds[3],
      minutes: minutesSeconds[1],
      seconds: minutesSeconds[2],
    })
  }

  const seconds = SECONDS.exec(text)

  if (seconds?.[1] !== undefined) {
    return toMilliseconds({
      fraction: seconds[2],
      seconds: seconds[1],
    })
  }

  if (TOO_MANY_PARTS.test(text)) {
    return unparsed(
      "A timecode has three parts at most — hours, minutes, seconds. Try 1:02:03.",
    )
  }

  if (LONG_FRACTION.test(text)) {
    return unparsed(
      "The fraction is milliseconds — three digits at most. Try 1:02.500.",
    )
  }

  return unparsed(
    "Not a timecode. Try 90, 1:30, 1:02:03, or 1:02:03.500.",
  )
}
