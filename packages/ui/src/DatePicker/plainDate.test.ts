/**
 * The calendar-date core, run under four timezones.
 *
 * **This is the test the component exists for.** A date picker whose
 * value shifts by a day when the browser's zone changes is the
 * classic defect, it is invisible at noon in UTC, and it is a
 * one-line fix that nobody makes because nothing fails. So every
 * assertion below runs under UTC, a western zone, UTC+14 and
 * UTC-11 — the two extremes of the offset range, which straddle the
 * date line — and every answer has to be identical in all four.
 *
 * `process.env.TZ` is genuinely re-read by Node's `Date` and `Intl`
 * (the tz cache is invalidated on assignment), so this is the real
 * thing rather than a stub of it.
 *
 * Nothing here reads the system clock: the rule against `new Date()`
 * with no argument is what stops a date suite from passing on the
 * day it was written and rotting quietly afterwards.
 */

import { afterAll, describe, expect, test } from "vitest"

import {
  addDays,
  addMonths,
  clampPlainDate,
  comparePlainDates,
  formatPlainDate,
  getDayNumber,
  getDaysBetween,
  getDaysInMonth,
  getFirstDayOfWeek,
  getIsLeapYear,
  getIsValidPlainDate,
  getIsWithinRange,
  getLocalPlainDate,
  getMonthNames,
  getPlainDateFromDayNumber,
  getWeekday,
  getWeekdayNames,
  parseIsoDate,
  toIsoDate,
} from "./plainDate.ts"

const originalTimeZone = process.env.TZ

afterAll(() => {
  process.env.TZ = originalTimeZone
})

const TIME_ZONES = [
  "UTC",
  "America/Denver",
  // UTC+14 and UTC-11: the widest pair the offset range allows, and
  // the pair that is on different calendar days for 23 hours of
  // every 24.
  "Pacific/Kiritimati",
  "Pacific/Niue",
]

describe.each(TIME_ZONES)("under TZ=%s", (timeZone) => {
  process.env.TZ = timeZone

  test("an ISO date round-trips unchanged", () => {
    process.env.TZ = timeZone

    const date = parseIsoDate("2026-08-19")

    expect(date).toEqual({ day: 19, month: 8, year: 2026 })

    expect(
      toIsoDate(date ?? { day: 1, month: 1, year: 1 }),
    ).toBe("2026-08-19")
  })

  test("formatting a plain date names the same day everywhere", () => {
    process.env.TZ = timeZone

    expect(
      formatPlainDate(
        { day: 19, month: 8, year: 2026 },
        { dateStyle: "full", locale: "en-US" },
      ),
    ).toBe("Wednesday, August 19, 2026")

    // The 1st and the 31st are where an off-by-one zone shift shows
    // up as a different month, not just a different day.
    expect(
      formatPlainDate(
        { day: 1, month: 1, year: 2026 },
        { dateStyle: "full", locale: "en-US" },
      ),
    ).toBe("Thursday, January 1, 2026")

    expect(
      formatPlainDate(
        { day: 31, month: 12, year: 2025 },
        { dateStyle: "full", locale: "en-US" },
      ),
    ).toBe("Wednesday, December 31, 2025")
  })

  test("adding a day never lands on the same or a skipped date", () => {
    process.env.TZ = timeZone

    // 2026-03-08 is the US DST spring-forward. A `Date`-based
    // `+ 24 * 60 * 60 * 1000` lands on the 8th again in Denver.
    expect(
      toIsoDate(
        addDays({ day: 8, month: 3, year: 2026 }, 1),
      ),
    ).toBe("2026-03-09")

    expect(
      toIsoDate(
        addDays({ day: 1, month: 11, year: 2026 }, 1),
      ),
    ).toBe("2026-11-02")

    expect(
      toIsoDate(
        addDays({ day: 31, month: 12, year: 2026 }, 1),
      ),
    ).toBe("2027-01-01")
  })

  test("the weekday of a fixed date does not move", () => {
    process.env.TZ = timeZone

    expect(
      getWeekday({ day: 19, month: 8, year: 2026 }),
    ).toBe(3)

    expect(
      getWeekday({ day: 16, month: 8, year: 2026 }),
    ).toBe(0)
  })
})

process.env.TZ = "UTC"

test("the day number round-trips across four centuries", () => {
  // Every day from 1899 to 2101, including all leap-year and
  // century-rule boundaries, through both directions of Hinnant's
  // algorithm.
  const from = getDayNumber({
    day: 1,
    month: 1,
    year: 1899,
  })

  const to = getDayNumber({
    day: 31,
    month: 12,
    year: 2101,
  })

  for (
    let dayNumber = from;
    dayNumber <= to;
    dayNumber += 1
  ) {
    expect(
      getDayNumber(getPlainDateFromDayNumber(dayNumber)),
    ).toBe(dayNumber)
  }

  expect(
    getDayNumber({ day: 1, month: 1, year: 1970 }),
  ).toBe(0)
})

test("the leap rule includes the century exceptions", () => {
  expect(getIsLeapYear(2024)).toBe(true)
  expect(getIsLeapYear(2026)).toBe(false)
  expect(getIsLeapYear(1900)).toBe(false)
  expect(getIsLeapYear(2000)).toBe(true)

  expect(getDaysInMonth(2024, 2)).toBe(29)
  expect(getDaysInMonth(1900, 2)).toBe(28)
  expect(getDaysInMonth(2026, 2)).toBe(28)
})

test("a month step clamps the day instead of overflowing", () => {
  // `new Date(2026, 0, 31)` with `setMonth(1)` is 3 March. One month
  // after 31 January is 28 February.
  expect(
    toIsoDate(
      addMonths({ day: 31, month: 1, year: 2026 }, 1),
    ),
  ).toBe("2026-02-28")

  expect(
    toIsoDate(
      addMonths({ day: 31, month: 1, year: 2024 }, 1),
    ),
  ).toBe("2024-02-29")

  expect(
    toIsoDate(
      addMonths({ day: 15, month: 11, year: 2026 }, 3),
    ),
  ).toBe("2027-02-15")

  expect(
    toIsoDate(
      addMonths({ day: 15, month: 2, year: 2026 }, -3),
    ),
  ).toBe("2025-11-15")
})

test("an impossible date is rejected rather than rolled forward", () => {
  expect(parseIsoDate("2026-02-30")).toBeNull()
  expect(parseIsoDate("2026-13-01")).toBeNull()
  expect(parseIsoDate("2026-00-10")).toBeNull()
  expect(parseIsoDate("19/8/2026")).toBeNull()
  expect(parseIsoDate("2026-8-19")).toBeNull()
  expect(parseIsoDate("")).toBeNull()
  expect(parseIsoDate(null)).toBeNull()

  expect(
    getIsValidPlainDate({ day: 29, month: 2, year: 2026 }),
  ).toBe(false)

  expect(
    getIsValidPlainDate({ day: 29, month: 2, year: 2024 }),
  ).toBe(true)
})

test("day counting is what a staleness threshold needs", () => {
  // Docket marks a Todo stale after N days. Across a DST boundary a
  // millisecond subtraction gives 13.958 days and `Math.floor` turns
  // a fortnight into thirteen days.
  expect(
    getDaysBetween(
      { day: 1, month: 3, year: 2026 },
      { day: 15, month: 3, year: 2026 },
    ),
  ).toBe(14)

  expect(
    getDaysBetween(
      { day: 19, month: 8, year: 2026 },
      { day: 19, month: 8, year: 2026 },
    ),
  ).toBe(0)

  expect(
    getDaysBetween(
      { day: 19, month: 8, year: 2026 },
      { day: 12, month: 8, year: 2026 },
    ),
  ).toBe(-7)
})

test("clamping and range checks agree at the boundaries", () => {
  const minimum = { day: 10, month: 8, year: 2026 }

  const maximum = { day: 20, month: 8, year: 2026 }

  expect(
    toIsoDate(
      clampPlainDate(
        { day: 1, month: 8, year: 2026 },
        minimum,
        maximum,
      ),
    ),
  ).toBe("2026-08-10")

  expect(
    toIsoDate(
      clampPlainDate(
        { day: 31, month: 8, year: 2026 },
        minimum,
        maximum,
      ),
    ),
  ).toBe("2026-08-20")

  expect(getIsWithinRange(minimum, minimum, maximum)).toBe(
    true,
  )
  expect(getIsWithinRange(maximum, minimum, maximum)).toBe(
    true,
  )

  expect(
    getIsWithinRange(
      { day: 21, month: 8, year: 2026 },
      minimum,
      maximum,
    ),
  ).toBe(false)

  expect(comparePlainDates(minimum, maximum)).toBeLessThan(
    0,
  )
})

/**
 * The whole argument in one assertion.
 *
 * One instant. Two zones. **Two different calendar dates** — and the
 * component makes you say which one you mean, instead of silently
 * using the browser's. This is the bug: store the wrong one of these
 * as a due date and the task is due a day early for everybody east
 * of you, forever.
 */
test("an instant is two different calendar dates, and you must say which", () => {
  const instant = new Date("2026-08-20T04:30:00Z")

  expect(
    toIsoDate(getLocalPlainDate(instant, "America/Denver")),
  ).toBe("2026-08-19")

  expect(toIsoDate(getLocalPlainDate(instant, "UTC"))).toBe(
    "2026-08-20",
  )

  expect(
    toIsoDate(
      getLocalPlainDate(instant, "Pacific/Kiritimati"),
    ),
  ).toBe("2026-08-20")
})

test("the first day of the week comes from the locale", () => {
  expect(getFirstDayOfWeek("en-US")).toBe(0)
  expect(getFirstDayOfWeek("en-GB")).toBe(1)
  expect(getFirstDayOfWeek("fr-FR")).toBe(1)
})

test("weekday and month names are rotated to the locale's own week", () => {
  expect(
    getWeekdayNames({
      firstDayOfWeek: 0,
      locale: "en-US",
      weekday: "short",
    })[0],
  ).toBe("Sun")

  expect(
    getWeekdayNames({
      firstDayOfWeek: 1,
      locale: "en-GB",
      weekday: "short",
    })[0],
  ).toBe("Mon")

  expect(
    getWeekdayNames({
      firstDayOfWeek: 0,
      locale: "en-US",
      weekday: "long",
    }),
  ).toHaveLength(7)

  expect(
    getMonthNames({ locale: "en-US", month: "long" }),
  ).toEqual([
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ])
})
