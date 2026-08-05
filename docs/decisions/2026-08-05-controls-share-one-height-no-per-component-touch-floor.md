# Controls share one height — no per-component touch-target floor

- **Status:** Accepted
- **Date:** 2026-08-05
- **Type:** Component contract
- **Supersedes:** —
- **Superseded by:** —

## Decision

Every interactive control that sits on a form row — `Button`, `Select`, `Listbox`
trigger, `Combobox` trigger, `SegmentedControl`, `IconButton`, and any future field —
takes its height **only** from the shared control-size system (`CONTROL_SIZE_CLASS[size]`
→ `h-(--control-height-<size>)`, which `[data-density]` rewrites). At the same `size`, in
the same density, they must all render the **same height**.

**Do not apply `MIN_TOUCH_TARGET_CLASS` (the 44px floor) to a shipped control.** Touch is
the **density axis's** job: on a kiosk/touch `[data-density]`, `--control-height-*` already
scales past 44px, so the floor is redundant there and, at `comfortable` (desktop/mouse)
density, it makes the control taller than its neighbours. `MIN_TOUCH_TARGET_CLASS` stays
exported as an **opt-in** for a genuinely standalone tap target (a lone icon control with
no matching-height sibling), never for a control that shares a row.

## Context

`Select` applied `MIN_TOUCH_TARGET_CLASS` while `Button` did not, so at `size="md"` on the
default `comfortable` density `Select` measured **44px** and `Button` **40px** — visibly
mismatched wherever they sit side by side (a filter `Select` next to a "Run" `Button`).
The owner flagged it during the `PathPicker` → `Combobox` review and asked that other
fields be held to the same contract so the divergence gets caught.

## Why

- 44px is **WCAG 2.1 AAA** (SC 2.5.5) / Apple-HIG guidance, **not** an AA requirement
  (WCAG 2.2 SC 2.5.8 AA is 24×24). It is not owed on a desktop, mouse-driven density.
- The density axis is the library's existing, correct mechanism for touch sizing —
  a per-component media query or floor duplicates it and desynchronises heights.
- Dropping the floor from `Select` (rather than adding it to `Button`) is the
  non-breaking fix: it only shrinks `Select` 4px to match, instead of growing every
  `md` button across all consumers.

## Evidence

- Owner: *"drop Select's floor … If there are other fields that should match this same
  height, we should document it so they get caught."* (2026-08-05 chat)
- Measured in Storybook before the fix: Button `md` 40px, Select `md` 44px.
- `MIN_TOUCH_TARGET_CLASS` usage audit: `Select` was the only shipped control applying it.
