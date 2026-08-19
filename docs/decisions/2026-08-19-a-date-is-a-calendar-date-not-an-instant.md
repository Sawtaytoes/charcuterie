# A date is a calendar date, not an instant — and `DatePicker` is one component with an `isRange` mode

- **Status:** Accepted
- **Date:** 2026-08-19
- **Type:** Component API
- **Supersedes:** —
- **Superseded by:** —

## Decision

**The value is a plain calendar date, carried as an ISO `YYYY-MM-DD` string.** `DatePicker`
never accepts and never reports a `Date`. In range mode the value is
`{ end: string | null, start: string | null }`. That is byte-identical to
`<input type="date">`'s own `value` format, so a consumer can move either way without a
migration.

**No date library, and no `Date` arithmetic.** `plainDate.ts` implements the calendar on
integer day numbers (Howard Hinnant's `days_from_civil`/`civil_from_days`, public domain,
the algorithm C++20's `<chrono>` and Rust's `chrono` both use). `Intl` supplies month
names, weekday names, the first day of the week and the numeric field order, and is always
handed a UTC-midnight instant with `timeZone: "UTC"` forced. A `Date` appears in exactly
one un-fenced place: `getLocalPlainDate(now, timeZone)`, which **makes the caller name the
zone**.

**`Temporal` is not used.** It is this type done properly and it is available in the Node
this repo builds on, but not in every browser a published package runs in; the polyfill is
~50 KB gz against a component that is a fraction of that. The API is ISO strings precisely
so the swap is invisible when `Temporal` is baseline.

**Typed input is parsed by an ordered, total grammar that never guesses in silence.**
`tomorrow`, `next fri`, `+14d`, `in 2 weeks`, `19 aug`, `8/19`, `2026-08-19` and a bare `19`
all resolve. Three rules govern it:

1. Each rule is anchored on the **whole** input, first match wins, and no match is a stated
   failure — `8/` is not the first of August, and there is no nearest-guess.
2. **Ambiguity is a named failure, not a pick.** A month or weekday prefix matching more
   than one name comes back as *"ju" could be June or July — type more of it*.
3. **Nothing commits without an echo.** The resolved date is rendered in full beneath the
   field in a `role="status"` live region wired into the input's `aria-describedby`.
   Commit is Enter or blur; a keystroke never commits, and a refused value leaves the text
   exactly as typed.

Field order comes from `Intl.DateTimeFormat().formatToParts`, so `3/4` is 4 March in
`en-US` and 3 April in `en-GB`. A reading is swapped **only when exactly one arrangement is
a real date** (`19/8` in `en-US`). Two-digit years use the POSIX `%y` window (00-68 →
2000s, 69-99 → 1900s). A yearless input is **this** year, always.

**Range is `isRange`, a mode of `DatePicker`, not a `DateRangePicker` sibling.**

**The clock is injected.** `today` is an ISO date prop; omitted, it is read **once** at
mount from `timeZone` or the device. Every story and test passes it.

## Context

Docket needs due dates, scheduled dates, phase start/end ranges, and a staleness threshold
counted in days — and `REQUIREMENTS.md` lists "a date picker" among the four things it
needs from Charcuterie. The owner's direction for this component was *"rethink the design
against real components"*, so the field composes `Field`, `Button`, `IconButton`, the
`Overlay` anchoring hook and the panel surface `Popover` and `Menu` already share, rather
than rebuilding any of them.

Two prior decisions constrained the shape before any code:
[`Select` is uncontrolled](2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md)
and [controls share one height](2026-08-05-controls-share-one-height-no-per-component-touch-floor.md).
`value` therefore **seeds** and Charcuterie owns it from then on, and the input's height
comes from `CONTROL_SIZE_CLASS` alone with no touch floor.

## Why

**On date-versus-instant.** A due date of the 19th is the 19th in Denver and in Tokyo. A
`Date` is a count of milliseconds, so every read of one goes through the browser's zone:
pick the 19th at 23:30 in Denver, store `new Date("2026-08-19").toISOString()`, and the
server, the next device, and the same device after a flight disagree about which day was
meant. It is a one-day error, it appears only near midnight or after travel, and it is
invisible in every test written at noon. `plainDate.test.ts` runs the whole suite under
`UTC`, `America/Denver`, `Pacific/Kiritimati` (UTC+14) and `Pacific/Niue` (UTC-11) and
asserts every answer is identical — including the assertion that states the whole argument:
one instant is **two different calendar dates**, and the component makes you say which.

Day-number arithmetic also gets the things `Date` gets wrong for free: one month after 31
January is 28 February rather than 3 March, and a fortnight across a DST boundary is 14
days rather than 13.958 — which is exactly the subtraction Docket's staleness threshold is.

**On parsing being the hard part.** A calendar grid is a weekend. Where date fields fail is
what happens when a human types, and `new Date(…)` is not a parser: it reads `"2026-08-19"`
as UTC midnight and `"08/19/2026"` as *local* midnight, and turns `"5"` into the year 2001.
Every library that "just works" takes the first prefix match, which is how a July task
lands in June with nothing to say so. The uniqueness test plus the echo line is what makes
a permissive grammar safe rather than dangerous: a wrong reading is **visible at the moment
of typing** instead of discovered three weeks later.

**On `isRange` rather than a sibling**, which is the same shape of question as
[Combobox's `isMultiple`](2026-08-05-combobox-multi-select-stays-ismultiple-not-a-separate-component.md)
and answers it the same way:

- **No distinct ARIA role.** The family is named by role — `Select`, `Listbox`, `Combobox`.
  A range picker is the same `role="dialog"` over the same `role="grid"`; there is no
  `daterange` role, so `DateRangePicker` would name a *presentation* and break the scheme —
  the owner's own objection in the Combobox thread.
- **The shared part is everything.** Parser, locale plumbing, min/max clamp, keyboard grid,
  panel, presets, echo line. The delta is a second input, a second month, and a band.
- **`Combobox` already set the value shape.** Its `selectedValue` is
  `readonly string[] | string`. A discriminated props union types better and was rejected
  for that consistency, and because Storybook's docgen renders a union props type as an
  untyped `{}` object control — the failure `storyControls.test.ts` exists to catch.

**On the container query.** `@container` sits on the **panel**, which is portalled and
clamped by floating-ui's `size` middleware to the space actually available. So the calendar
sizes to what it got, not to the window: a 390px phone and a desktop window at 200% zoom
are the same measurement, and a media query can express neither. Below `--cq-xs` the
weekday headers drop to one letter and the cells to 32px; below `--cq-sm` a range picker's
two months stack.

**On the roving focus being arithmetic.** `useRovingFocus` is a **registration** kind whose
`next`/`previous` walk a member list. ArrowRight on 31 August has to land on 1 September —
a day the grid has not rendered and no member has registered — and ArrowDown is "+7 days",
not "the seventh next member". So the focused *date* is the state and the DOM follows it.
Same conclusion `Field` reached about `createLinkedIds`: the state kind is real, and this
is not its shape.

**On the two `biome-ignore`s.** `role="grid"` on a `<table>` and `role="gridcell"` on a
`<td>` are the ARIA specification's own worked example and the APG date-picker's own
structure; biome's `noNoninteractiveElementToInteractiveRole` says to use a `div`, which
costs five more suppressions and loses real table semantics. The suppressions sit on the
line **immediately above each attribute**, because a biome suppression covers the next
*line*, not the next node — and `yarn lint` runs `--write --unsafe`, so a misplaced one
deletes the role silently and the widget degrades to a static `role="table"`. That happened
twice while this component was being written.

## Evidence

- Owner, 2026-08-19, choosing the design direction: *"Rethink the design against real
  components."*
- Docket `REQUIREMENTS.md` §8: Charcuterie owes it "a rich-text editor, **a date picker**, a
  data table, and a board/kanban primitive"; §5.4 marks a Todo **stale** after a threshold
  counted in days; §5.6 gives phases start/end ordering.
- Docket already shipped one silent-token bug of exactly this family (an invented
  `--color-danger-9` painting transparent while every "is it rendered" assertion passed),
  which is the argument for the failure modes here being *tests* rather than care.
- `plainDate.test.ts`: 4 timezones x the full arithmetic suite, plus a day-number
  round-trip over every day from 1899 to 2101.
- `parseDateInput.test.ts`: 15 cases, and the interesting half are the refusals.
- `DatePicker.test.tsx`: 11 chromium cases including axe on the open dialog, the roving
  tab-stop count, and the Narrow View at 390px and 260px.
