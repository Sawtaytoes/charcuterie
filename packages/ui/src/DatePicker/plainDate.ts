/**
 * A calendar date, and deliberately not an instant.
 *
 * ### The bug this file exists to make impossible
 *
 * A due date is not a moment. "This is due on the 19th" is true in
 * Denver and true in Tokyo, and it does not become the 18th because
 * a laptop crossed a meridian. The classic date-picker defect is
 * that the value is a `Date` — which is an instant, a count of
 * milliseconds — and every read of it goes through the *browser's*
 * timezone. Pick the 19th at 23:30 in Denver, store
 * `new Date("2026-08-19").toISOString()`, and the server, the next
 * device, and the same device after a flight all disagree about
 * which day you meant. It is a one-day error, it only appears near
 * midnight or after travel, and it is invisible in every test
 * written at noon.
 *
 * So the value here is a **plain date**: a year, a month, and a day,
 * with no time, no offset, and no zone. It is stored as an ISO
 * `YYYY-MM-DD` string — which is exactly `<input type="date">`'s own
 * `value` format, so a consumer can move between this component and
 * the native control without a migration.
 *
 * ### There is no `Date` arithmetic in here at all
 *
 * Not "carefully-written `Date` arithmetic" — none. Every operation
 * below is integer maths on a **day number**: the count of days
 * since 1970-01-01, computed with Howard Hinnant's `days_from_civil`
 * / `civil_from_days` (public domain, the algorithm C++20's
 * `<chrono>` and Rust's `chrono` both use). Adding a day is `+ 1`.
 * That is a proleptic Gregorian calendar with no DST, no leap
 * seconds, and no zone, which is what a calendar date actually is.
 *
 * A `Date` appears in exactly two places, both of them named and
 * both of them fenced:
 *
 *  - `getLocalPlainDate`, which is the **one** conversion from an
 *    instant to a calendar date, and which requires you to say
 *    which zone's calendar you mean.
 *  - `formatPlainDate` and its callers, which hand `Intl` a date
 *    built at UTC midnight and format it with `timeZone: "UTC"`, so
 *    the formatter cannot shift the day either.
 *
 * `plainDate.test.ts` re-runs the whole suite under four `TZ`
 * values, including UTC+14 and UTC-11, and asserts every answer is
 * byte-identical.
 *
 * ### Why not `Temporal`
 *
 * `Temporal.PlainDate` is this type, done properly, and it is
 * available in the Node this repo builds on. It is not available in
 * every browser a published package has to run in, and the polyfill
 * is ~50 KB gz — an order of magnitude more than this entire
 * component. The functions below are the ~80 lines of it a date
 * picker needs. When `Temporal` is baseline, this file becomes a
 * thin adapter and the public API — ISO strings — does not change,
 * which is the reason the API is ISO strings.
 */

/** Year, month (1-12), day (1-31). No time, no zone. */
export type PlainDate = {
  day: number
  month: number
  year: number
}

/**
 * A start and an end, either of which may be absent — because a
 * half-picked range is a real state a user spends time in, not an
 * error. `start` with a null `end` is "I have clicked once".
 */
export type DateRange = {
  end: null | string
  start: null | string
}

const MONTH_LENGTHS = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
]

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const getIsLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

export const getDaysInMonth = (
  year: number,
  month: number,
): number =>
  month === 2 && getIsLeapYear(year)
    ? 29
    : (MONTH_LENGTHS[month - 1] ?? 30)

export const getIsValidPlainDate = ({
  day,
  month,
  year,
}: PlainDate): boolean =>
  Number.isInteger(year) &&
  Number.isInteger(month) &&
  Number.isInteger(day) &&
  year >= 1 &&
  year <= 9999 &&
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= getDaysInMonth(year, month)

/**
 * Days since 1970-01-01, by Hinnant's `days_from_civil`.
 *
 * Every other operation in this file is expressed through this and
 * its inverse, which is why "add a month, then add 40 days, then
 * ask what weekday it is" cannot drift: there is one representation
 * and it is an integer.
 */
export const getDayNumber = ({
  day,
  month,
  year,
}: PlainDate): number => {
  const shiftedYear = year - (month <= 2 ? 1 : 0)

  const era = Math.floor(shiftedYear / 400)

  const yearOfEra = shiftedYear - era * 400

  const dayOfYear =
    Math.floor(
      (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5,
    ) +
    day -
    1

  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear

  return era * 146097 + dayOfEra - 719468
}

/** The inverse — Hinnant's `civil_from_days`. */
export const getPlainDateFromDayNumber = (
  dayNumber: number,
): PlainDate => {
  const shifted = dayNumber + 719468

  const era = Math.floor(shifted / 146097)

  const dayOfEra = shifted - era * 146097

  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  )

  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra +
      Math.floor(yearOfEra / 4) -
      Math.floor(yearOfEra / 100))

  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153)

  const day =
    dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1

  const month = monthPrime + (monthPrime < 10 ? 3 : -9)

  return {
    day,
    month,
    year: yearOfEra + era * 400 + (month <= 2 ? 1 : 0),
  }
}

export const addDays = (
  date: PlainDate,
  days: number,
): PlainDate =>
  getPlainDateFromDayNumber(getDayNumber(date) + days)

/**
 * Month arithmetic clamps the day rather than overflowing, which is
 * the answer every calendar app gives and the one `Date` does not:
 * `new Date(2026, 0, 31)` plus a month is **3 March**, because 31
 * February rolls forward. One month after 31 January is 28
 * February.
 */
export const addMonths = (
  date: PlainDate,
  months: number,
): PlainDate => {
  const monthIndex =
    date.year * 12 + (date.month - 1) + months

  const year = Math.floor(monthIndex / 12)

  const month = monthIndex - year * 12 + 1

  return {
    day: Math.min(date.day, getDaysInMonth(year, month)),
    month,
    year,
  }
}

export const comparePlainDates = (
  first: PlainDate,
  second: PlainDate,
): number => getDayNumber(first) - getDayNumber(second)

export const getIsSameDay = (
  first: PlainDate,
  second: PlainDate,
): boolean => comparePlainDates(first, second) === 0

/**
 * Whole days from `from` to `to`. Docket's staleness threshold is
 * counted in days, and this is the subtraction that counts it —
 * with no hour-of-day and no DST to make "14 days" occasionally mean
 * 13.958.
 */
export const getDaysBetween = (
  from: PlainDate,
  to: PlainDate,
): number => getDayNumber(to) - getDayNumber(from)

export const clampPlainDate = (
  date: PlainDate,
  minimum?: PlainDate,
  maximum?: PlainDate,
): PlainDate => {
  if (minimum && comparePlainDates(date, minimum) < 0) {
    return minimum
  }

  if (maximum && comparePlainDates(date, maximum) > 0) {
    return maximum
  }

  return date
}

export const getIsWithinRange = (
  date: PlainDate,
  minimum?: PlainDate,
  maximum?: PlainDate,
): boolean =>
  (!minimum || comparePlainDates(date, minimum) >= 0) &&
  (!maximum || comparePlainDates(date, maximum) <= 0)

/**
 * 0 is Sunday, 6 is Saturday — the numbering `Intl`'s `weekday`
 * option and `Date.prototype.getDay` both use, so the two never
 * need reconciling at a call site.
 *
 * Day number 0 (1970-01-01) was a Thursday, which is the `+ 4`.
 */
export const getWeekday = (date: PlainDate): number => {
  const dayNumber = getDayNumber(date)

  return ((((dayNumber % 7) + 7) % 7) + 4) % 7
}

const pad = (value: number, length: number) =>
  String(value).padStart(length, "0")

export const toIsoDate = (date: PlainDate): string =>
  `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`

/**
 * `null` rather than a throw, and `null` rather than a "best
 * effort" date. A string that is not a calendar date has no nearest
 * calendar date, and inventing one is the silent-guess failure this
 * component is built to avoid.
 */
export const parseIsoDate = (
  isoDate: null | string | undefined,
): null | PlainDate => {
  if (!isoDate) {
    return null
  }

  const match = ISO_DATE_PATTERN.exec(isoDate)

  if (!match) {
    return null
  }

  const date = {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  }

  return getIsValidPlainDate(date) ? date : null
}

/**
 * A `Date` pinned at UTC midnight, for `Intl` and for nothing else.
 *
 * `Date.UTC` is not used, because it maps years 0-99 onto 1900-1999
 * — a two-digit year silently becomes the twentieth century inside
 * the formatter, which is a bug the *parser* takes an explicit
 * position on and the formatter has no business re-deciding.
 */
const toUtcInstant = (date: PlainDate) => {
  const instant = new Date(0)

  instant.setUTCFullYear(
    date.year,
    date.month - 1,
    date.day,
  )
  instant.setUTCHours(0, 0, 0, 0)

  return instant
}

export type PlainDateFormatOptions =
  Intl.DateTimeFormatOptions & {
    locale?: string
  }

/**
 * `timeZone: "UTC"` is forced, and it is not configurable.
 *
 * The instant above is UTC midnight, so formatting it in any other
 * zone renders the previous or the next day — which is the same
 * one-day error as storing an instant, arriving through the display
 * layer instead. There is no legitimate reason to format a calendar
 * date in a zone: the date *is* the answer.
 */
export const formatPlainDate = (
  date: PlainDate,
  { locale, ...options }: PlainDateFormatOptions = {},
): string =>
  new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(toUtcInstant(date))

/**
 * The one instant-to-calendar-date conversion in the library, and it
 * makes you name the zone.
 *
 * Defaulting `timeZone` to the device's own resolved zone is right
 * for "what is today on this screen"; passing one explicitly is
 * right for "what is today for this household". Either way the
 * question is asked out loud, which is the difference between this
 * and `new Date().toISOString().slice(0, 10)` — a line that appears
 * in three of the fleet's repos and is wrong for everybody west of
 * Greenwich after 17:00.
 */
export const getLocalPlainDate = (
  now: Date,
  timeZone?: string,
): PlainDate => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now)

  const read = (type: string) =>
    Number(
      parts.find((part) => part.type === type)?.value ??
        "0",
    )

  return {
    day: read("day"),
    month: read("month"),
    year: read("year"),
  }
}

/**
 * Which weekday a calendar starts on, from the locale rather than
 * from a guess.
 *
 * `Intl.Locale.prototype.getWeekInfo` is the platform's own answer
 * (Monday in most of the world, Sunday in the US and Japan, Saturday
 * in much of the Middle East) and it is the whole reason this
 * component does not ship a `isMondayFirst` boolean. It is not in
 * TypeScript's `lib.es*` yet, so the shape is stated here and the
 * absence is handled — a runtime without it falls back to Sunday,
 * which is `Date.prototype.getDay`'s own origin and therefore the
 * least surprising default.
 */
type LocaleWithWeekInfo = {
  getWeekInfo?: () => { firstDay?: number }
  weekInfo?: { firstDay?: number }
}

export const getFirstDayOfWeek = (
  locale?: string,
): number => {
  const resolved = new Intl.Locale(
    locale ??
      new Intl.DateTimeFormat().resolvedOptions().locale,
  ) as Intl.Locale & LocaleWithWeekInfo

  const firstDay =
    resolved.getWeekInfo?.().firstDay ??
    resolved.weekInfo?.firstDay

  // `getWeekInfo` numbers Monday 1 through Sunday 7; this file
  // numbers Sunday 0 through Saturday 6.
  return firstDay === undefined ? 0 : firstDay % 7
}

/**
 * The seven weekday names, rotated so index 0 is the locale's own
 * first day. A fixed sample week is formatted rather than a
 * hand-written table, so every locale the browser knows is covered
 * and nothing here needs translating.
 */
export const getWeekdayNames = ({
  firstDayOfWeek,
  locale,
  weekday,
}: {
  firstDayOfWeek: number
  locale?: string
  weekday: "long" | "narrow" | "short"
}): string[] => {
  // 2026-08-16 is a Sunday, so `+ index` walks Sunday to Saturday.
  const sundayDayNumber = getDayNumber({
    day: 16,
    month: 8,
    year: 2026,
  })

  return Array.from({ length: 7 }, (_unused, index) =>
    formatPlainDate(
      getPlainDateFromDayNumber(
        sundayDayNumber + ((firstDayOfWeek + index) % 7),
      ),
      { locale, weekday },
    ),
  )
}

/** January-first month names, for the parser and the header. */
export const getMonthNames = ({
  locale,
  month,
}: {
  locale?: string
  month: "long" | "short"
}): string[] =>
  Array.from({ length: 12 }, (_unused, index) =>
    formatPlainDate(
      { day: 1, month: index + 1, year: 2026 },
      { locale, month },
    ),
  )
