---
"@charcuterie/tokens": patch
---

`variables.css` now emits the default density at bare `:root`, so omitting
`data-density` degrades to `comfortable` instead of to nothing.

Every `--control-height-*`, `--control-gap-*`, `--control-padding-inline-*` and
`--font-size-*` was declared only under a `[data-density="…"]` selector, with no `:root`
fallback — unlike `data-variant`, which has had one since M0. A consumer that set
`data-scheme` and omitted `data-density` resolved `h-(--control-height-md)` and `text-2xl`
to nothing: every control collapsed to zero height and the whole type ramp disappeared, on
a green build with no console error.

Measured against the published `1.1.0`, on a page with no `data-density`:
`--control-height-md` and `--font-size-2xl` both compute to the empty string. With this
change they are `2.5rem` and `1.625rem`, and `data-density="compact"` still overrides to
`1.875rem`/`1.5234rem` — the default block is emitted first, and `:root` and
`[data-density="compact"]` are the same specificity, so source order is the whole cascade.

Found by `portly-controllers`, which rendered a segmented control with no segments.
