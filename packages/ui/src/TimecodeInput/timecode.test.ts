/**
 * The typed-timecode grammar.
 *
 * The interesting half of this file is the refusals. A parser that
 * only proves it accepts `1:02:03` is a parser nobody has checked for
 * the thing that actually hurts: quietly accepting something as the
 * wrong position, which in this domain means a clip that starts a
 * minute late and a rip nobody rewatches until it is too late.
 */

import { expect, test } from "vitest"

import {
  clampTimecode,
  formatTimecode,
  parseTimecodeInput,
} from "./timecode.ts"

const parsedMilliseconds = (text: string) => {
  const result = parseTimecodeInput(text)

  return result.kind === "timecode"
    ? result.milliseconds
    : result
}

const refusalReason = (text: string) => {
  const result = parseTimecodeInput(text)

  return result.kind === "unparsed" ? result.reason : ""
}

test("a bare number is SECONDS, because seconds is the smallest field the form prints", () => {
  expect(parsedMilliseconds("0")).toBe(0)
  expect(parsedMilliseconds("9")).toBe(9_000)
  expect(parsedMilliseconds("90")).toBe(90_000)
  expect(parsedMilliseconds("5400")).toBe(5_400_000)
})

test("mm:ss and hh:mm:ss both resolve, and the largest field is unbounded", () => {
  expect(parsedMilliseconds("1:30")).toBe(90_000)
  expect(parsedMilliseconds("0:09")).toBe(9_000)
  expect(parsedMilliseconds("1:02:03")).toBe(3_723_000)

  // 90 minutes. The largest field present carries no 0–59 bound, so
  // this is the same position as `1:30:00` and both are accepted.
  expect(parsedMilliseconds("90:00")).toBe(5_400_000)
  expect(parsedMilliseconds("1:30:00")).toBe(5_400_000)
})

test("a fraction is a decimal fraction of a second, so it pads on the right", () => {
  expect(parsedMilliseconds("1.5")).toBe(1_500)
  expect(parsedMilliseconds("1.05")).toBe(1_050)
  expect(parsedMilliseconds("1.005")).toBe(1_005)
  expect(parsedMilliseconds("1:02:03.500")).toBe(3_723_500)

  // The decimal comma resolves identically. It is not a locale
  // switch: a timecode has no thousands separator, so there is
  // nothing for the comma to be confused with.
  expect(parsedMilliseconds("1,5")).toBe(1_500)
})

test("a leading + is tolerated, and changes nothing", () => {
  expect(parsedMilliseconds("+90")).toBe(90_000)
  expect(parsedMilliseconds("+1:02:03")).toBe(3_723_000)
})

test("surrounding whitespace is not something a person should have to notice", () => {
  expect(parsedMilliseconds("  1:30 ")).toBe(90_000)
  expect(parsedMilliseconds("1 : 30")).toBe(90_000)
})

test("empty is its own outcome, because clearing a timecode is legitimate", () => {
  expect(parseTimecodeInput("").kind).toBe("empty")
  expect(parseTimecodeInput("   ").kind).toBe("empty")
})

test("a seconds field of 60 or more is refused by name, and never carried", () => {
  // The `1:60` trap mux-magic wrote down. A parser that carries this
  // moves the position by a whole minute and nothing ever says so.
  expect(parseTimecodeInput("1:90").kind).toBe("unparsed")

  const reason = refusalReason("1:90")

  expect(reason).toContain("A minute has 60 seconds")

  // Both legal spellings are offered and neither is taken.
  expect(reason).toContain("02:30")
  expect(reason).toContain("90")

  expect(parseTimecodeInput("1:60").kind).toBe("unparsed")
  expect(parseTimecodeInput("1:02:60").kind).toBe(
    "unparsed",
  )
})

test("a minutes field of 60 or more is refused whenever an hour sits beside it", () => {
  expect(parseTimecodeInput("1:90:00").kind).toBe(
    "unparsed",
  )

  expect(refusalReason("1:90:00")).toContain(
    "An hour has 60 minutes",
  )

  // …and is accepted when it is the largest field, which is the
  // whole of the rule in one pair of cases.
  expect(parsedMilliseconds("90:00")).toBe(5_400_000)
})

test("a negative is refused as out of bounds, not as unreadable", () => {
  expect(parseTimecodeInput("-5").kind).toBe("unparsed")

  expect(refusalReason("-5")).toContain("never negative")

  expect(parseTimecodeInput("-1:30").kind).toBe("unparsed")
})

test("more than three parts is refused, and says how many there are", () => {
  expect(parseTimecodeInput("1:2:3:4").kind).toBe(
    "unparsed",
  )

  expect(refusalReason("1:2:3:4")).toContain(
    "three parts at most",
  )
})

test("a fraction longer than three digits is refused rather than truncated", () => {
  expect(parseTimecodeInput("1.5000").kind).toBe("unparsed")

  expect(refusalReason("1.5000")).toContain(
    "three digits at most",
  )
})

test("a partial or nonsense input never becomes a nearest guess", () => {
  for (const text of [
    "1:",
    ":30",
    "1::30",
    "abc",
    "1m30s",
    "1:30pm",
    "--",
    ".",
    "1.",
  ]) {
    expect(parseTimecodeInput(text).kind, text).toBe(
      "unparsed",
    )
  }
})

test("formatTimecode prints the canonical hh:mm:ss.mmm by default", () => {
  expect(formatTimecode(0)).toBe("00:00:00.000")
  expect(formatTimecode(90_000)).toBe("00:01:30.000")
  expect(formatTimecode(3_723_500)).toBe("01:02:03.500")
  expect(formatTimecode(36_000_000)).toBe("10:00:00.000")
})

test("what formatTimecode prints, parseTimecodeInput reads back unchanged", () => {
  for (const milliseconds of [
    0, 1, 999, 1_000, 90_000, 3_723_500, 5_400_000,
    36_000_000,
  ]) {
    expect(
      parsedMilliseconds(formatTimecode(milliseconds)),
      String(milliseconds),
    ).toBe(milliseconds)
  }
})

test("isHoursShown false rolls the hours into the minutes, and still round-trips", () => {
  expect(
    formatTimecode(5_400_000, { isHoursShown: false }),
  ).toBe("90:00.000")

  expect(parsedMilliseconds("90:00.000")).toBe(5_400_000)

  expect(
    formatTimecode(90_000, { isHoursShown: false }),
  ).toBe("01:30.000")
})

test("millisecondDigits truncates rather than rounding, because a position is not a measurement", () => {
  // 1999 ms into a file is second 1. Rounding would print a seek
  // point the media has not reached.
  expect(
    formatTimecode(1_999, { millisecondDigits: 0 }),
  ).toBe("00:00:01")

  expect(
    formatTimecode(1_999, { millisecondDigits: 1 }),
  ).toBe("00:00:01.9")

  expect(
    formatTimecode(1_999, { millisecondDigits: 2 }),
  ).toBe("00:00:01.99")

  // Out-of-range digit counts are held rather than thrown, so a
  // caller's off-by-one cannot produce `00:00:01.` with a trailing
  // separator and nothing after it.
  expect(
    formatTimecode(1_999, { millisecondDigits: 9 }),
  ).toBe("00:00:01.999")

  expect(
    formatTimecode(1_999, { millisecondDigits: -1 }),
  ).toBe("00:00:01")
})

test("formatTimecode refuses to print a position that does not exist", () => {
  expect(formatTimecode(-5_000)).toBe("00:00:00.000")
  expect(formatTimecode(Number.NaN)).toBe("00:00:00.000")

  expect(formatTimecode(Number.POSITIVE_INFINITY)).toBe(
    "00:00:00.000",
  )
})

test("clampTimecode floors at zero even when no minimum is given", () => {
  expect(clampTimecode(-1)).toBe(0)
  expect(clampTimecode(5_000)).toBe(5_000)
  expect(clampTimecode(Number.NaN)).toBe(0)
})

test("clampTimecode holds a position inside the media", () => {
  expect(clampTimecode(5_000, 10_000, 60_000)).toBe(10_000)
  expect(clampTimecode(90_000, 10_000, 60_000)).toBe(60_000)
  expect(clampTimecode(30_000, 10_000, 60_000)).toBe(30_000)

  // An inverted pair of bounds resolves to the floor rather than
  // silently widening the window a caller asked for.
  expect(clampTimecode(30_000, 60_000, 10_000)).toBe(60_000)
})
