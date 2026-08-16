# A Picker is flush — the parent owns the gap

- **Status:** Accepted
- **Date:** 2026-08-16
- **Type:** layout / docs
- **Supersedes:** —
- **Superseded by:** —
- **Extends:** [2026-08-13-picker-is-the-assembled-listbox](2026-08-13-picker-is-the-assembled-listbox-and-listbox-stays-trigger-agnostic.md)

## Decision

**`Picker` has no outer margin.** Neither do `Button`, `Select`, or a
`Listbox` trigger. They are flush on purpose.

When a label or hint sits *next to* the trigger, the **parent** owns
the gutter:

- stacked → `Field` (`flex flex-col gap-1.5`)
- inline → a row with `gap-*`

Do not add margin to `Picker` to "fix" a flush label. A control that
ships its own margin fights every `Field` and every toolbar.

## Context

QueuePilot, 2026-08-16, after the count picker started wearing a
Default chip on the closed trigger:

> "we still need a space between this listbox and the text. That's an
> issue I've seen often. Not sure how to solve it, but we might need
> to update either Charcuterie or update the docs at least."

That app already had a one-off `#setmodal .fieldselect { margin-left:
10px }` for the *other* inline pickers, with a comment that the
trigger "butts right against the text". The CountPicker never got that
class, so "Chapters queued per turn" sat flush on `[2 Default]`.

## Why

- **Margin on the control is the wrong layer.** Layout is the
  container's job. `Field` already has a gap; a Picker margin would
  double it.
- **The same trap is every flush trigger.** Documenting it on `Picker`
  (and pointing `Field` at that section) is how the fleet stops
  inventing another `.fieldselect`.

## Evidence

- Owner quote above, 2026-08-16, with a screenshot of the flush
  trigger.
- QueuePilot `app.css` already named the defect on `.fieldselect`.
