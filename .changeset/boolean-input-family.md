---
"@charcuterie/ui": minor
---

Add the boolean-input family — `Checkbox`, `RadioGroup`, and `Switch` — the primitives
mux-magic's `BooleanField` hand-rolled in `bg-slate-700 border-slate-500 accent-blue-500`
because the library had no boolean control to reach for. All three are tokenised
(`bg-surface-sunken`, `bg-intent-accent-solid`, `text-intent-accent-on-solid`), so one
control reads correctly in every scheme and variant with no per-app override, and each
ships stories, an `.mdx` docs page, and a driven-state test suite.

- `Checkbox` — a native `<input type="checkbox">` the `<label>` wraps (no `for` to get
  wrong), uncontrolled with `defaultChecked` from `isChecked`; a submitted value.
- `Switch` — a `button role="switch"` with a sliding, colour-changing thumb; the same
  state kind as `Checkbox` and the "takes effect on flip" affordance. `aria-checked`, so a
  screen reader reads "on/off" rather than "checked/unchecked".
- `RadioGroup` — the stacked sibling of `SegmentedControl`, the same `SinglePicker` +
  `RovingFocus` composition rendered `role="radiogroup"`: arrow keys move-and-check, Tab
  enters once, disabled options leave the focus group but stay selectable via
  `selectedValue`.
