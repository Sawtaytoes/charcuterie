/**
 * The typed-input grammar.
 *
 * Every case resolves against a **fixed** `today` — Wednesday
 * 19 August 2026 — because a relative-date parser tested against the
 * real clock is a suite that passes on the day it is written, goes
 * red the following Friday, and gets `.skip`ped.
 *
 * The interesting half of this file is the failures. A parser that
 * only proves it accepts `8/19` is a parser nobody has checked for
 * the thing that actually hurts: quietly accepting something as the
 * wrong date.
 */

import { expect, test } from "vitest"

import { parseDateInput } from "./parseDateInput.ts"
import { toIsoDate } from "./plainDate.ts"

const TODAY = { day: 19, month: 8, year: 2026 }

const parse = (text: string, locale = "en-US") =>
  parseDateInput(text, { locale, today: TODAY })

const parsedIso = (text: string, locale?: string) => {
  const result = parse(text, locale)

  return result.kind === "date"
    ? toIsoDate(result.date)
    : result
}

test("ISO is accepted first, and is never read as a d-m-y", () => {
  expect(parsedIso("2026-08-19")).toBe("2026-08-19")
  expect(parsedIso("2026-01-05")).toBe("2026-01-05")
})

test("the relative words resolve against the injected today", () => {
  expect(parsedIso("today")).toBe("2026-08-19")
  expect(parsedIso("Tomorrow")).toBe("2026-08-20")
  expect(parsedIso("yesterday")).toBe("2026-08-18")
  expect(parsedIso("tmrw")).toBe("2026-08-20")
})

test("signed offsets are the form a staleness threshold is typed in", () => {
  expect(parsedIso("+14d")).toBe("2026-09-02")
  expect(parsedIso("+14")).toBe("2026-09-02")
  expect(parsedIso("-7d")).toBe("2026-08-12")
  expect(parsedIso("+2w")).toBe("2026-09-02")
  expect(parsedIso("+1m")).toBe("2026-09-19")
  expect(parsedIso("+1y")).toBe("2027-08-19")
  expect(parsedIso("in 3 days")).toBe("2026-08-22")
  expect(parsedIso("in 2 weeks")).toBe("2026-09-02")
})

test("next week / next month step the unit, not seven days of month", () => {
  expect(parsedIso("next week")).toBe("2026-08-26")
  expect(parsedIso("next month")).toBe("2026-09-19")
  expect(parsedIso("last week")).toBe("2026-08-12")
  expect(parsedIso("next year")).toBe("2027-08-19")
})

test("a weekday means the next one, and never today", () => {
  // Today is a Wednesday.
  expect(parsedIso("fri")).toBe("2026-08-21")
  expect(parsedIso("next friday")).toBe("2026-08-21")
  expect(parsedIso("last fri")).toBe("2026-08-14")

  // The case that makes "or today if today is it" wrong: `next wed`
  // on a Wednesday has to move, or the phrase is a no-op on the one
  // day somebody would type it.
  expect(parsedIso("next wed")).toBe("2026-08-26")
  expect(parsedIso("mon")).toBe("2026-08-24")
})

test("month names parse in either order, with or without a year", () => {
  expect(parsedIso("aug 19")).toBe("2026-08-19")
  expect(parsedIso("19 aug")).toBe("2026-08-19")
  expect(parsedIso("August 19, 2027")).toBe("2027-08-19")
  expect(parsedIso("19 august 2027")).toBe("2027-08-19")
  expect(parsedIso("sep 1")).toBe("2026-09-01")
})

test("numeric input follows the locale's own field order", () => {
  expect(parsedIso("8/19")).toBe("2026-08-19")
  expect(parsedIso("8/19/2026")).toBe("2026-08-19")

  // The genuinely ambiguous one. Both readings are real dates, so the
  // locale decides and the component echoes what it decided.
  expect(parsedIso("3/4", "en-US")).toBe("2026-03-04")
  expect(parsedIso("3/4", "en-GB")).toBe("2026-04-03")
  expect(parsedIso("19/8", "en-GB")).toBe("2026-08-19")
})

test("a reading is swapped only when it is the only valid one", () => {
  // There is no nineteenth month, so `19/8` in a month-first locale
  // has exactly one reading and taking it is deduction, not taste.
  expect(parsedIso("19/8", "en-US")).toBe("2026-08-19")

  // …and when both readings work, nothing is swapped.
  expect(parsedIso("4/3", "en-US")).toBe("2026-04-03")
})

test("a two-digit year uses the POSIX window, not the current century", () => {
  expect(parsedIso("8/19/26")).toBe("2026-08-19")
  expect(parsedIso("8/19/68")).toBe("2068-08-19")
  expect(parsedIso("8/19/69")).toBe("1969-08-19")
  expect(parsedIso("8/19/99")).toBe("1999-08-19")
})

test("a bare number is the day of the month on screen", () => {
  expect(parsedIso("19")).toBe("2026-08-19")
  expect(parsedIso("1")).toBe("2026-08-01")
  expect(parsedIso("31")).toBe("2026-08-31")
})

test("an ambiguous month or weekday prefix is a named failure, not a pick", () => {
  // The whole point. `ju` is June and July; a parser that takes the
  // first match files a July task in June and nothing ever says so.
  const june = parse("ju 19")

  expect(june.kind).toBe("unparsed")

  expect(
    june.kind === "unparsed" ? june.reason : "",
  ).toContain("June or July")

  const saturday = parse("s")

  expect(saturday.kind).toBe("unparsed")

  expect(
    saturday.kind === "unparsed" ? saturday.reason : "",
  ).toContain("Sunday or Saturday")

  // Type one more letter and it resolves.
  expect(parsedIso("jul 19")).toBe("2026-07-19")
  expect(parsedIso("jun 19")).toBe("2026-06-19")
})

test("an impossible date is refused, with the reason", () => {
  const result = parse("2/30")

  expect(result.kind).toBe("unparsed")

  expect(
    result.kind === "unparsed" ? result.reason : "",
  ).toContain("no 30/2")

  expect(parse("2026-02-30").kind).toBe("unparsed")
  expect(parse("feb 31").kind).toBe("unparsed")
})

test("a partial or nonsense input never becomes a nearest guess", () => {
  // `8/` is not the first of August, `next` is not next anything, and
  // `2026` is not a day.
  for (const text of [
    "8/",
    "/19",
    "next",
    "2026",
    "soon",
    "the 19th",
    "19th aug",
    "aug",
    "--",
  ]) {
    expect(parse(text).kind, text).toBe("unparsed")
  }
})

test("empty is its own outcome, because clearing a date is legitimate", () => {
  expect(parse("").kind).toBe("empty")
  expect(parse("   ").kind).toBe("empty")
})

test("accents and casing do not have to be typed", () => {
  expect(parsedIso("19 fevrier 2027", "fr-FR")).toBe(
    "2027-02-19",
  )

  expect(parsedIso("19 février 2027", "fr-FR")).toBe(
    "2027-02-19",
  )

  expect(parsedIso("AUG 19")).toBe("2026-08-19")
})
