# Option rows carry no base `bg-transparent`, and highlight with `-surface-hover`

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Component contract
- **Supersedes:** —
- **Superseded by:** —

## Decision

An option/row button whose background is set **conditionally** by state
(`isActive`, `isSelected`, `hover`) must **not** carry a base `bg-transparent`,
and its on-overlay highlight uses **`intent-neutral-surface-hover`**, not
`intent-neutral-surface`.

Applies to `ComboboxOption` and `ListboxOption`, and to any future row that
lives on the `surface-overlay` panel.

## Context

Reported as "the arrow keys don't work" in `Combobox`. They did — after two
ArrowDowns `aria-activedescendant` correctly pointed at the third option — but
**nothing on screen changed**, so it read as dead. Two independent bugs stacked:

1. **`bg-transparent` clobber.** The row's base class was
   `… bg-transparent …` and the state tints were appended
   (`isActive && "bg-intent-neutral-surface"`,
   `isSelected && "bg-intent-accent-surface"`). All three are plain
   `background-color` utilities at equal specificity, so the winner is whichever
   Tailwind emits **last in the compiled CSS** — and that is `bg-transparent`.
   Measured in the running Storybook: an isolated `bg-intent-neutral-surface`
   div computed `rgb(34,42,55)`, but `class="bg-transparent bg-intent-neutral-surface"`
   (the row's actual class) computed `rgba(0,0,0,0)`. So the active option, and
   `ListboxOption`'s selected accent, rendered with **no fill** — the ✓ was the
   only clue an option was selected, and the keyboard cursor had none at all.
2. **Wrong tint for an overlay.** `intent-neutral-surface` is a *base-surface*
   tint. The picker popups draw on `surface-overlay`, which in **every dark
   scheme** is lighter than `intent-neutral-surface` — so even once (1) was
   fixed the highlight was darker than the panel and read as no change.
   Daylight/dark, measured: `surface-overlay #252D3B`, `intent-neutral-surface
   #222A37` (darker), `intent-neutral-surface-hover #2B3442` (lighter — visible).

## Why

- A `<button>`'s background is transparent by default, so the base
  `bg-transparent` bought nothing and only introduced a same-specificity rival
  to the state tints. Removing it lets the tints apply with no ordering trap.
- `hover:` variants were unaffected (the pseudo-class adds specificity), which
  is why hover *looked* fine and the bug hid — but `hover:bg-intent-neutral-surface`
  on an overlay is also near-invisible in dark, so the hover token moves to
  `-surface-hover` too.

## Evidence

Fix verified live in Storybook (daylight/dark): the active Combobox option now
computes `rgb(43,52,66)` (#2B3442) against the `rgb(37,45,59)` panel, and a
selected Listbox option computes `rgb(30,28,82)` (#1E1C52). All 355 `ui` tests
pass; `tailwindCandidates.test.ts` confirms `bg-intent-neutral-surface-hover`
compiles.
