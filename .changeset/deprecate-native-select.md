---
"@charcuterie/ui": minor
---

**`Select` is deprecated.** Nothing new gets a native `<select>`; `Picker` is the drop-in
(same `label` / `options` / `value` / `onChange`), `Listbox` when the trigger is not a
button, `Combobox` when the list is long enough to want typing.

The component still ships and still works — every export now carries `@deprecated`, so an
existing call site keeps compiling while it converts. Removal is queued for the next major.

The [2026-08-10 demotion](https://github.com/Sawtaytoes/charcuterie/blob/master/docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md)
left four cases where native was still the right call — the mobile wheel picker, autofill,
`:invalid`, and a form that posts with no JS. **The exception is closed**: none of them has
ever applied to an app in this fleet, and an exception is the shape an agent optimises
toward. A new native `Select` is a new decision record, not a call-site judgement.

Also in this change: the Storybook entry moved from `Components/Select` to
`Deprecated/Select`, its docs page leads with a before/after banner, and `Field`'s stories
and prose demonstrate the slot with a `Picker` rather than a `Select`. `Listbox` has no
`<optgroup>` equivalent, so a grouped picker is the one shape with no replacement — that is
a change to `Listbox` if an app needs it.
