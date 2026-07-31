# A tab bar is a scroll container, and its focus ring is drawn inward

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Component behaviour
**Supersedes:** —
**Superseded by:** —

## Decision

1. The tablist gets **`overflow-x: auto`** when horizontal and `overflow-y: auto` when
   vertical. A tab bar narrower than its tabs scrolls; it does not wrap and it does not
   paint outside its container.
2. **The scrollbar is hidden** (`scrollbar-width: none`).
3. **`--focus-ring-offset` is re-pointed inward** on the tablist, to
   `calc(var(--focus-ring-width) * -1)`.

## Context

`Tabs` has claimed since M4 that "a tab bar **scrolls**, it does not wrap" — in its story,
in its `.mdx`, and in `packages/ui/README.md`. Nothing implemented it. The tablist was
`flex flex-row gap-1 border-b` with no `overflow` at all, so a bar in a 15rem panel simply
painted its last two tabs across the panel beside it.

It shipped that way through M4 and its follow-up with a green test:

```ts
await expect(narrow.scrollWidth).toBeGreaterThan(narrow.clientWidth)
```

which is equally true of a bar that overflows *visibly*. The assertion proved the
precondition for scrolling and never proved the scrolling.

## Why

**Hidden rather than thin, because a classic scrollbar takes layout space.** On a platform
with non-overlay scrollbars, `scrollbar-width: thin` adds ~15px of height *inside* the
scroll container. The narrow bar would then be taller than the wide one on the same board,
and the selected tab's underline — which is deliberately pulled over the list's own border
by `-mb-px` so the two read as one line — would stop lining up across panels. The existing
`narrow.clientHeight === wide.clientHeight` assertion catches exactly this, and it is worth
keeping true.

Nothing is lost for keyboard users: `RovingFocus` calls `.focus()`, and a browser scrolls a
focused element into view. Touch scrolls by swipe.

**The focus ring has to move because `overflow` clips outlines.** An `overflow` other than
`visible` clips its descendants' painting, and this library's focus ring is an `outline`
sitting `--focus-ring-offset` (2px) *outside* the element. A tab fills the bar's content box
exactly, so the entire ring would land in the clipped region — a focus indicator visible
nowhere, on the one component in the library that scrolls, introduced by the very change
that fixed the overflow.

**Re-pointing the token beats appending a utility.** `FOCUS_RING_CLASS` already reads
`--focus-ring-offset`, so setting that variable on the tablist keeps **one** ring
definition and lets the cascade do the scoping. Appending a second
`focus-visible:outline-offset-*` to the tab's `className` would be two utilities setting one
property with Tailwind's internal ordering picking the winner — the same specificity
coin-flip `Button.sizing` exists to avoid.

An inset ring is not a downgrade: it is 2px of solid `--color-focus-ring` against the tab,
which is what WCAG 2.4.11 asks for. It is what every scrollable tab bar does.

## Consequences

- `Tabs` is the only component that overrides `--focus-ring-offset`. If a second one needs
  to, that is the signal to make "inset ring" a named constant rather than a third literal.
- The `Responsive` test now asserts `overflowX !== "visible"` alongside the overflow, and a
  second test tabs into the bar and asserts the ring is drawn at a non-positive offset.
  **That second test was vacuous when first written** — `outline-offset` only applies under
  `:focus-visible`, so a programmatic `.focus()` left it at `0px` and every assertion
  passed. It uses `userEvent.tab()` for that reason.
- A tab scrolled out of view is still in the DOM and still announced; `aria-hidden` is not
  involved.

## Evidence

> Two tabs overlapping in responsive view and on Docs page

— Kevin, on the `Tabs.Responsive` board.
