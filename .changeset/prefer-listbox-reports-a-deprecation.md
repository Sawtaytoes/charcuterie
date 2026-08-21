---
"@charcuterie/eslint-config": minor
---

`charcuterie/prefer-listbox-over-select` now reports `Select` as **deprecated** rather than
as a choice needing a stated reason, and names `Picker` first as the drop-in. The rule id is
unchanged.

There is no per-call-site exception left: the four platform cases the old message offered —
wheel picker, autofill, `:invalid`, no-JS form post — have never applied to an app in this
fleet, so a disable comment now cites a decision record instead of inventing its own reason.
The block stays opt-in.
