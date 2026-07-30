# A `Badge` is capped at its container; `overflow` decides what happens next

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Component API
**Supersedes:** —
**Superseded by:** —

## Decision

1. **`max-inline-size: 100%`** on every badge. It may not paint outside the element that
   contains it.
2. **`overflow="truncate"` is the default** — one line, ellipsis, row height unchanged.
3. **`overflow="wrap"`** grows the pill instead, and relaxes `rounded-full` to
   `rounded-2xl`.
4. **The full text is never destroyed.** Truncation is `text-overflow: ellipsis` and
   nothing else — no slicing in JavaScript, ever.
5. **A `title` appears only while the text is genuinely clipped**, measured at runtime.

## Context

`Badge` shipped in M3 as `inline-flex shrink-0 … whitespace-nowrap` with no maximum. Given
a label longer than its container — which its own `Responsive` story has shown since M3 —
the pill rendered at its natural width and painted straight across the neighbouring column.
No clipping, no error, no failing test. It looks like a layout bug in whatever sits beside
it.

## Why

**`shrink-0` is right and is not the problem.** A status pill next to a long title in a bay
row must not be squashed to nothing; that is what `shrink-0` protects. The missing piece
was a *maximum*, which is a different constraint and does not conflict with it.

**Truncation preserves everything except pixels.** `text-overflow: ellipsis` **paints** the
ellipsis — the glyph is produced by the layout engine and `textContent` is untouched. So a
triple-click still selects the whole string, copy still yields it, and every screen reader
still reads it. This is the property that a "helpful" refactor to
`children.slice(0, 30) + "…"` would silently destroy, and it is asserted rather than
assumed.

**Which leaves exactly one gap: a sighted pointer user who will not select the text.** A
`title` covers that, and only that — it does not fire on touch and is not keyboard
reachable. So `title` is the smaller half of the answer and `overflow="wrap"` is the other
half, for the kiosk and any other touch context where the hover readout does not exist.
That is why both modes ship rather than one.

**The `title` is measured, not unconditional.** Nothing in the DOM records that an ellipsis
is being painted, so `useIsTextClipped` compares `scrollWidth` to `clientWidth` and watches
for container resizes. Always setting a `title` would put a tooltip on every short status
pill in a bay list, which is worse than the problem being solved.

**A real tooltip was considered and rejected for now.** `Popover` exists, but a badge is
not interactive and making it a `Popover` trigger would mean making it a `<button>` — a
much larger change to a component whose entire thesis is that it is *a word about something
else*. If a truncated badge's full text is load-bearing on touch, `wrap` is the answer.

## Consequences

- The clip lives on the label span, not on the pill: an `overflow: hidden` on the pill
  itself squares off the very end-cap the ellipsis sits against.
- `min-inline-size: 0` on that span, because a flex item's automatic minimum size is its
  content, which would otherwise win against the parent's `max-inline-size` and put the
  overflow straight back.
- `Badge` now has an effect and a `ResizeObserver`. It is no longer a pure function of its
  props — accepted, because the alternatives are an unconditional tooltip or leaving the
  overflow in.
- The wrapping pill uses `rounded-2xl`. A stadium end-cap on a three-line box reads as a
  rendering fault rather than as a badge.

## Evidence

> Does that one example of a badge with overflow look wrong to you? How do we solve that?

— Kevin, on the `Badge.Responsive` board.

On the fix:

> If we cap and truncate with ellipsis (my choice too), then we need to have some sort of
> tooltip (hover or touch) or other way to get the full readout. Sometimes, you can even
> select all with triple-click and _still_ get the full text even with the ellipsis.
> Meaning I think the ellipsis is an `::after` or something on the badge when an overflow
> occurs. I'm not exactly sure. Just guessing.

The guess is right about the behaviour and slightly off about the mechanism: it is not an
`::after`, it is `text-overflow`, which is painted during layout rather than inserted into
the tree. The consequence he predicted — triple-click still yields the whole string — is
exactly what that buys, and is now a test.

> I also think multiline could be useful depending on the scenario. […] So both might need
> to be required.
