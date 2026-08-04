# Charcuterie needs a deliberate code review and a direction decision

**Status:** Open — owner-flagged, not yet scheduled.
**Raised:** 2026-08-03, by the owner (Kevin), during the `PathPicker` → `Combobox`
attached-input work.

## The concern, in the owner's words

> "at some point, we're going to have to review Charcuterie's code and decide where to go
> because the way you developed it is super sketch."

This is logged here so it is durable and not lost between sessions — it is **not** resolved
by the attached-input change that surfaced it.

## What it means

Charcuterie was built rapidly and largely AI-authored, milestone by milestone (see the
`docs/2026-07-*`/`2026-08-*` milestone notes). That velocity has left real smells the owner
wants examined deliberately rather than patched ad hoc. Known, already-documented threads
that belong in such a review:

- **`useClonedChild` / `cloneElement` as the slot model** — three defects have come out of
  one root cause; the replacement (`Slot`/`asChild` or `render` props) is deferred, not
  decided. See
  [`docs/decisions/2026-08-02-useclonedchild-keeps-cloneelement-in-1-0-1.md`](decisions/2026-08-02-useclonedchild-keeps-cloneelement-in-1-0-1.md).
  This attached-input change adds *another* caller that has to route around
  `useClonedChild` (a discarded placeholder element in `useAnchoredOverlay`) — more
  evidence for the review, not against it.
- **Consumer-reported issues queued for later** — see
  [`docs/2026-08-02-reported-by-consumers-queued-for-1-1.md`](2026-08-02-reported-by-consumers-queued-for-1-1.md).
- **Component API consistency** — the picker family (`Select` / `Listbox` / `Combobox`,
  now with an attached-input mode) has grown modes and flags incrementally; whether the
  surface is coherent deserves a pass.

## What this note is asking for (later, not now)

A scoped review milestone that decides **direction** before the library grows further:
what to keep, what to rewrite (the slot model is the leading candidate), and what the API
contract should be. It is a standalone effort — it does **not** block the current
`PathPicker`/`Combobox` migration.

## Cross-reference

Tracked from the fleet tracker: `agentic/todo/README.md` (charcuterie modernization row).
