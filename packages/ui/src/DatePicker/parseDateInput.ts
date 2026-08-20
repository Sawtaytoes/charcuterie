/**
 * What a human types into a date field, turned into a calendar date
 * — or into a stated reason it was not one.
 *
 * ### The calendar grid is the easy half
 *
 * Seven columns and some modular arithmetic is a weekend. The half
 * that decides whether a date field is pleasant or infuriating is
 * what happens when somebody types. Every hand-rolled date field in
 * this fleet either accepts nothing but the format it prints, or
 * hands the string to `new Date(…)` — which accepts `"Tuesday"` as
 * an `Invalid Date`, accepts `"2026-08-19"` as *UTC midnight* while
 * accepting `"08/19/2026"` as *local* midnight, and turns `"5"` into
 * the year 2001. That last one is a real, specified behaviour and it
 * is why `Date.parse` appears nowhere in this file.
 *
 * ### The rule that governs all of it: never guess in silence
 *
 * Three mechanisms, and they are the whole design:
 *
 *  1. **The grammar is ordered and total.** Each rule below is
 *     anchored on the *whole* input. The first rule that matches
 *     wins, and if none does the result is `unparsed` with a reason
 *     — never a nearest-guess, never a partial read. `8/` is not
 *     the first of August.
 *  2. **Ambiguity is a failure with a name, not a coin flip.** A
 *     month or weekday prefix that matches more than one name comes
 *     back as `unparsed` saying which ones: `ju` is not June, it is
 *     "June or July — type more of it". This is why the matcher
 *     tests uniqueness instead of taking the first hit, which is
 *     what every library that "just works" does and is exactly how
 *     a July task lands in June.
 *  3. **Nothing commits without an echo.** `DatePicker` renders the
 *     resolved date in full underneath the input, in a live region,
 *     before and after commit. The one genuinely irreducible
 *     ambiguity in date entry — `3/4` — is resolved by the locale's
 *     own field order and then *shown*, so a wrong reading is
 *     visible rather than discovered in three weeks.
 *
 * ### The one place a reading is swapped, and why it is not a guess
 *
 * `19/8` in an en-US locale has no valid month-first reading — there
 * is no nineteenth month. Rather than rejecting it, the swapped
 * reading is taken, because it is the **only** valid one. When both
 * readings are valid (`3/4`) the locale's order wins and nothing is
 * swapped. So the rule is: *swap only when exactly one arrangement
 * is a real date*, which is deduction rather than preference.
 *
 * ### Everything locale-dependent is read from `Intl`
 *
 * Field order, month names, weekday names. There is no English word
 * list in this file except the relative keywords (`today`,
 * `tomorrow`, `next week`), which are the one thing `Intl` does not
 * publish. Those are the documented, explicitly-English part of the
 * surface, and a consumer that needs others supplies `keywords`.
 */

import type { PlainDate } from "./plainDate.ts"
import {
  addDays,
  addMonths,
  getDaysInMonth,
  getIsValidPlainDate,
  getMonthNames,
  getWeekday,
  getWeekdayNames,
  parseIsoDate,
} from "./plainDate.ts"

export type DateInputResult =
  | { date: PlainDate; kind: "date" }
  | { kind: "empty" }
  | { kind: "unparsed"; reason: string }

export type DateInputKeywords = {
  /** `last`, as in `last friday`. */
  last: readonly string[]
  /** `next`, as in `next friday` and `next week`. */
  next: readonly string[]
  today: readonly string[]
  tomorrow: readonly string[]
  /** Unit suffixes for `+3d` and `in 2 weeks`, longest-first. */
  units: {
    day: readonly string[]
    month: readonly string[]
    week: readonly string[]
    year: readonly string[]
  }
  yesterday: readonly string[]
}

/**
 * English, and stated rather than assumed.
 *
 * `Intl` publishes month and weekday names for every locale a
 * browser knows, so those are never written down. It publishes
 * nothing for "tomorrow" — `Intl.RelativeTimeFormat` *renders* one
 * but cannot parse one — so this table is the honest boundary of
 * what the component understands out of the box, and it is a prop so
 * a consumer is not stuck with it.
 */
export const DEFAULT_DATE_INPUT_KEYWORDS: DateInputKeywords =
  {
    last: ["last", "previous", "prev"],
    next: ["next"],
    today: ["today", "tod", "tdy", "now"],
    tomorrow: ["tomorrow", "tmrw", "tmr", "tom"],
    units: {
      day: ["days", "day", "d"],
      month: ["months", "month", "mo", "m"],
      week: ["weeks", "week", "w"],
      year: ["years", "year", "y"],
    },
    yesterday: ["yesterday", "yest", "yda"],
  }

export type ParseDateInputOptions = {
  keywords?: DateInputKeywords
  locale?: string
  /**
   * The clock, injected. Every relative form resolves against this
   * and nothing reads the system clock, which is what lets the whole
   * grammar be tested with a fixed date instead of tests that pass
   * on the day they were written.
   */
  today: PlainDate
}

/**
 * Lowercase, unaccented, comma-free, single-spaced.
 *
 * The diacritic strip is what lets a French user type `fevrier` on a
 * keyboard that is not theirs and still land in February — and it is
 * applied to the `Intl` names too, so the comparison is symmetric.
 */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/**
 * The index of the one name this prefix can mean, or the list of
 * names it could mean.
 *
 * Returning the candidates rather than `null` is what makes the
 * error message useful, and the message is the entire reason
 * ambiguity is handled here rather than by taking the first match.
 */
const matchUniquePrefix = (
  names: readonly string[],
  text: string,
): { index: number } | { candidates: string[] } => {
  const exact = names.findIndex(
    (name) => normalize(name) === text,
  )

  if (exact >= 0) {
    return { index: exact }
  }

  const matches = names.flatMap((name, index) =>
    normalize(name).startsWith(text)
      ? [{ index, name }]
      : [],
  )

  if (matches.length === 1 && matches[0]) {
    return { index: matches[0].index }
  }

  return { candidates: matches.map((one) => one.name) }
}

/**
 * Long names first, short names as the fallback, and the **long**
 * list wins the error message.
 *
 * "s" is ambiguous in both lists, and reporting it as "Sun or Sat"
 * tells a user to type more of a name they were not typing. The
 * ambiguity is between Sunday and Saturday; that is what the message
 * has to say.
 */
const matchAcross = (
  longNames: readonly string[],
  shortNames: readonly string[],
  text: string,
) => {
  const long = matchUniquePrefix(longNames, text)

  if ("index" in long) {
    return long
  }

  const short = matchUniquePrefix(shortNames, text)

  if ("index" in short) {
    return short
  }

  return long.candidates.length > 0 ? long : short
}

/**
 * Whether this locale writes the day or the month first, read from
 * the platform instead of from a country list.
 *
 * `formatToParts` is the only way to ask. The alternative — a table
 * of which countries are month-first — is a table that is wrong for
 * somebody, and it would not follow a user who has set their
 * browser to `en-GB` on a US machine, which is the case that matters
 * because it is the one where the two disagree.
 */
const getNumericFieldOrder = (
  locale?: string,
): ("day" | "month" | "year")[] =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
    year: "numeric",
  })
    .formatToParts(new Date(0))
    .flatMap((part) =>
      part.type === "day" ||
      part.type === "month" ||
      part.type === "year"
        ? [part.type]
        : [],
    )

/**
 * The two-digit-year window, and it is borrowed rather than
 * invented: 00-68 is the twenty-first century and 69-99 the
 * twentieth, which is POSIX `strptime`'s `%y` and the same window
 * Java, Python and `strftime` all use. A component that picked its
 * own boundary would disagree with the rest of the machine.
 */
const resolveYear = (year: number) => {
  if (year >= 100) {
    return year
  }

  return year <= 68 ? 2000 + year : 1900 + year
}

const toResult = (date: PlainDate): DateInputResult =>
  getIsValidPlainDate(date)
    ? { date, kind: "date" }
    : {
        kind: "unparsed",
        reason: `There is no ${date.day}/${date.month} in ${date.year}.`,
      }

const UNPARSED: DateInputResult = {
  kind: "unparsed",
  reason:
    "Not a date. Try 2026-08-19, 8/19, 19 aug, tomorrow, next fri, or +14d.",
}

const matchesKeyword = (
  words: readonly string[],
  text: string,
) => words.includes(text)

const getUnitDays = (
  keywords: DateInputKeywords,
  unit: string,
): "month" | "year" | null | number => {
  if (matchesKeyword(keywords.units.day, unit)) {
    return 1
  }

  if (matchesKeyword(keywords.units.week, unit)) {
    return 7
  }

  if (matchesKeyword(keywords.units.month, unit)) {
    return "month"
  }

  if (matchesKeyword(keywords.units.year, unit)) {
    return "year"
  }

  return null
}

const shiftBy = (
  today: PlainDate,
  amount: number,
  unit: "month" | "year" | number,
): PlainDate => {
  if (unit === "month") {
    return addMonths(today, amount)
  }

  if (unit === "year") {
    return addMonths(today, amount * 12)
  }

  return addDays(today, amount * unit)
}

/**
 * `next fri` is the Friday **after** today, never today itself.
 *
 * The alternative — "the next Friday, or today if today is Friday" —
 * makes "next friday" a no-op on Fridays, which is the one day
 * somebody is most likely to type it. A bare `fri` means the same
 * thing as `next fri`; `last fri` is the mirror.
 */
const resolveWeekday = (
  today: PlainDate,
  weekdayIndex: number,
  direction: -1 | 1,
): PlainDate => {
  const current = getWeekday(today)

  const forward = ((weekdayIndex - current + 6) % 7) + 1

  return addDays(
    today,
    direction === 1
      ? forward
      : -(((current - weekdayIndex + 6) % 7) + 1),
  )
}

export const parseDateInput = (
  rawText: string,
  {
    keywords = DEFAULT_DATE_INPUT_KEYWORDS,
    locale,
    today,
  }: ParseDateInputOptions,
): DateInputResult => {
  const text = normalize(rawText)

  if (text === "") {
    return { kind: "empty" }
  }

  // 1. ISO first, and before the numeric rule below, because
  //    `2026-08-19` also matches a `d-m-y` shape and would be read as
  //    the 2026th of August.
  const isoDate = parseIsoDate(rawText.trim())

  if (isoDate) {
    return { date: isoDate, kind: "date" }
  }

  // 2. The relative keywords.
  if (matchesKeyword(keywords.today, text)) {
    return { date: today, kind: "date" }
  }

  if (matchesKeyword(keywords.tomorrow, text)) {
    return { date: addDays(today, 1), kind: "date" }
  }

  if (matchesKeyword(keywords.yesterday, text)) {
    return { date: addDays(today, -1), kind: "date" }
  }

  const words = text.split(" ")

  // 3. `next week` / `last month` / `next year`.
  if (words.length === 2 && words[0] && words[1]) {
    const direction = matchesKeyword(
      keywords.next,
      words[0],
    )
      ? 1
      : matchesKeyword(keywords.last, words[0])
        ? -1
        : 0

    if (direction !== 0) {
      const unit = getUnitDays(keywords, words[1])

      if (unit !== null) {
        return toResult(shiftBy(today, direction, unit))
      }
    }
  }

  // 4. Signed offsets — `+14d`, `-2w`, `+3` (days, the default unit).
  //    Docket counts staleness in days, so this is the form the owner
  //    types most and the reason a bare `+14` is allowed at all.
  const signed = /^([+-])\s?(\d{1,4})\s?([a-z]*)$/.exec(
    text,
  )

  if (signed?.[1] && signed[2] !== undefined) {
    const unit =
      signed[3] === ""
        ? 1
        : getUnitDays(keywords, signed[3] ?? "")

    if (unit !== null) {
      return toResult(
        shiftBy(
          today,
          Number(signed[2]) * (signed[1] === "-" ? -1 : 1),
          unit,
        ),
      )
    }
  }

  // 5. `in 3 days`, `in 2 weeks`.
  const relative = /^in (\d{1,4}) ([a-z]+)$/.exec(text)

  if (relative?.[1] && relative[2]) {
    const unit = getUnitDays(keywords, relative[2])

    if (unit !== null) {
      return toResult(
        shiftBy(today, Number(relative[1]), unit),
      )
    }
  }

  const longWeekdays = getWeekdayNames({
    firstDayOfWeek: 0,
    locale,
    weekday: "long",
  })

  const shortWeekdays = getWeekdayNames({
    firstDayOfWeek: 0,
    locale,
    weekday: "short",
  })

  // 6. `fri`, `next fri`, `last friday`.
  if (words.length <= 2) {
    const directionWord =
      words.length === 2 ? words[0] : undefined

    const nameWord =
      words.length === 2 ? words[1] : words[0]

    const direction =
      directionWord === undefined
        ? 1
        : matchesKeyword(keywords.next, directionWord)
          ? 1
          : matchesKeyword(keywords.last, directionWord)
            ? -1
            : 0

    if (
      direction !== 0 &&
      nameWord &&
      /^[a-z]+$/.test(nameWord)
    ) {
      const matched = matchAcross(
        longWeekdays,
        shortWeekdays,
        nameWord,
      )

      if ("index" in matched) {
        return {
          date: resolveWeekday(
            today,
            matched.index,
            direction === 1 ? 1 : -1,
          ),
          kind: "date",
        }
      }

      if (matched.candidates.length > 1) {
        return {
          kind: "unparsed",
          reason: `"${nameWord}" could be ${matched.candidates.join(" or ")} — type more of it.`,
        }
      }
    }
  }

  const longMonths = getMonthNames({
    locale,
    month: "long",
  })

  const shortMonths = getMonthNames({
    locale,
    month: "short",
  })

  // 7. `aug 19`, `19 aug`, `august 19 2026`, `19 august 2026`.
  const monthFirst =
    /^([a-z]+) (\d{1,2})(?: (\d{2,4}))?$/.exec(text)

  const dayFirst =
    /^(\d{1,2}) ([a-z]+)(?: (\d{2,4}))?$/.exec(text)

  const named = monthFirst
    ? {
        day: monthFirst[2],
        name: monthFirst[1],
        year: monthFirst[3],
      }
    : dayFirst
      ? {
          day: dayFirst[1],
          name: dayFirst[2],
          year: dayFirst[3],
        }
      : null

  if (named?.name && named.day) {
    const matched = matchAcross(
      longMonths,
      shortMonths,
      named.name,
    )

    if ("index" in matched) {
      return toResult({
        day: Number(named.day),
        month: matched.index + 1,
        // A yearless input is **this** year, always. "The nearest
        // occurrence" is the tempting alternative and it is rejected
        // on purpose: it means the same keystrokes mean different
        // years depending on the day you type them, which is not a
        // rule anybody can hold in their head. The echo line shows
        // the resolved year, so a December-for-January entry is
        // visible rather than discovered later.
        year:
          named.year === undefined
            ? today.year
            : resolveYear(Number(named.year)),
      })
    }

    if (matched.candidates.length > 1) {
      return {
        kind: "unparsed",
        reason: `"${named.name}" could be ${matched.candidates.join(" or ")} — type more of it.`,
      }
    }

    return UNPARSED
  }

  // 8. Numeric — `8/19`, `8/19/2026`, `19-8`, `2026/8/19`.
  const numeric =
    /^(\d{1,4})[/\-. ](\d{1,2})(?:[/\-. ](\d{2,4}))?$/.exec(
      text,
    )

  if (numeric?.[1] && numeric[2]) {
    const first = Number(numeric[1])

    const second = Number(numeric[2])

    const third =
      numeric[3] === undefined
        ? undefined
        : Number(numeric[3])

    // A four-digit leading field is a year, in any locale. Nobody
    // means the 2026th of anything.
    if (numeric[1].length === 4 && third !== undefined) {
      return toResult({
        day: third,
        month: second,
        year: first,
      })
    }

    const order = getNumericFieldOrder(locale)

    const isDayFirst =
      order.indexOf("day") < order.indexOf("month")

    const year =
      third === undefined ? today.year : resolveYear(third)

    const preferred = isDayFirst
      ? { day: first, month: second, year }
      : { day: second, month: first, year }

    if (getIsValidPlainDate(preferred)) {
      return { date: preferred, kind: "date" }
    }

    // The only-valid-reading swap. Not a preference — the preferred
    // arrangement is not a date, and this one is.
    const swapped = isDayFirst
      ? { day: second, month: first, year }
      : { day: first, month: second, year }

    if (getIsValidPlainDate(swapped)) {
      return { date: swapped, kind: "date" }
    }

    return toResult(preferred)
  }

  // 9. A bare day-of-month, for capture on a phone: `19` is the 19th
  //    of the month showing. Two digits at most, so `2026` is never
  //    silently a day.
  const bareDay = /^(\d{1,2})$/.exec(text)

  if (bareDay?.[1]) {
    const day = Number(bareDay[1])

    if (
      day >= 1 &&
      day <= getDaysInMonth(today.year, today.month)
    ) {
      return {
        date: { day, month: today.month, year: today.year },
        kind: "date",
      }
    }
  }

  return UNPARSED
}
