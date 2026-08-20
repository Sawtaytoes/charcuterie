---
"@charcuterie/ui": minor
---

`DatePicker` — a date field you can type into, over a calendar dialog

The component Docket needs for due dates, scheduled dates and phase ranges, and the fleet's
first date control of any kind. It composes what already exists — `Field`'s slot contract,
`Button`/`IconButton`, the `Overlay` anchoring hook, and the panel surface `Popover`,
`Menu`, `Listbox` and `Combobox` already share.

**The value is a calendar date, never an instant.** `onChange` reports an ISO
`YYYY-MM-DD` string — the same format `<input type="date">` uses — and never a `Date`. A
`Date` is a count of milliseconds, so reading one back always goes through the browser's
timezone: pick the 19th at 23:30 in Denver and it comes back as the 18th in London. The
arithmetic underneath uses integer day numbers rather than `Date`, so one month after 31
January is 28 February and a fortnight across a DST boundary is 14 days rather than
13.958 — which is exactly the subtraction a staleness threshold is. The suite runs under
UTC, `America/Denver`, UTC+14 and UTC-11 and asserts nothing moves.

No date library was added. `Temporal.PlainDate` is this type done properly and is not used
yet only because the polyfill is ~50 KB gz; the API is ISO strings so that swap will be
invisible.

**Typing is the feature, and nothing guesses in silence.** `tomorrow`, `next fri`, `+14d`,
`in 2 weeks`, `19 aug`, `8/19`, `2026-08-19` and a bare `19` all resolve, in the active
locale, against an injected `today`. The resolution is echoed in full beneath the field, in
a live region, **before** anything commits — and an ambiguous prefix is a named failure
rather than a pick: `ju 19` comes back as *"ju" could be June or July*, not as June. A
refused value leaves the typed text exactly as it is.

```tsx
<Field label="Due" description="tomorrow, next fri, +14d, 8/19…">
  <DatePicker label="Due" onChange={setDueDate} today={todayIso} value={dueDate} />
</Field>

<DatePicker isRange label="Phase" onChange={setPhase} today={todayIso} />
// → { end: "2026-09-04", start: "2026-08-24" }
```

Range is `isRange`, a **mode** rather than a `DateRangePicker` sibling — the same call
`Combobox` made about `isMultiple`, and for the same reason: a range picker has no ARIA
role of its own to be named after.

Also exported, because a consumer needs the calendar without the field: `parseDateInput`,
`parseIsoDate`, `toIsoDate`, `formatPlainDate`, `getDaysBetween`, `addDays`, `addMonths`,
`clampPlainDate`, `getLocalPlainDate`, `getFirstDayOfWeek` and friends. They reach nothing
but `Intl`.
