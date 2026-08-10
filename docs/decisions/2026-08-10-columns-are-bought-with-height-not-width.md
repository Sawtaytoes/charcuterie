# Columns are bought with height, and the content cap widens to pay for them

**Status:** Accepted
**Date:** 2026-08-10
**Type:** API / Layout
**Supersedes:** —
**Superseded by:** —
**Related:** [the container-query scale is `--cq-*`, not `--container-*`](2026-07-29-container-query-scale-is-cq-not-container.md)

## Decision

Charcuterie's wrapping grid (`AdaptiveGrid` / `useAdaptiveColumns`) decides its column
count **height-first**:

```
rowsThatFit    = floor((availableBlockSize - chromeBlockSize) / itemBlockSize)
columnsNeeded  = ceil(itemCount / rowsThatFit)
inlineSizeCap  = min(maxColumns, floor(availableInlineSize / minColumnInlineSize))
columns        = min(inlineSizeCap, columnsNeeded)
```

A column is added because the items will not stack inside the viewport. The container's
inline size can only ever **cap** that answer; it may never produce one. One item is always
one column.

The cap on the content around the grid **widens with the count** rather than being a
constant: `columns <= 1 ? 56rem : 34rem * columns + 4rem` — 56 / 72 / 106 / 140rem. The
three numbers are `contentInlineSize` in `@charcuterie/tokens`, beside `screen` and
`containerQuery`; the arithmetic (`getContentMaxInlineSize`) stays in `@charcuterie/ui`
and every part is overridable per call.

The two threshold systems in play are **not** merged. A `cq-*` step is read by the *item,
inside the track* ("how do I lay myself out at the width I was handed"). The grid's
`minColumnInlineSize` is read by the *grid, outside the item* ("is another track worth
having"). They answer different questions, so they stay separate — but the grid's floor is
expressed in Charcuterie's own scale, defaulting to `containerQuery.sm` (24rem/384px), and
stays deliberately a step **below** `cq-md` (32rem), where this library's container-query
components change shape.

Inline size is measured off a `ResizeObserver` on a **container**. Block size comes from
the **viewport**, behind an injectable resolver. The measured element must never be the
element the content cap is applied to.

## Context

The owner, on the fleet's apps:

> "All these apps seem to be really narrow with a very large max-width — 1 column, but
> waaaaaaay too wide. What I really want is something like Rip-Deck where the app has a
> narrower main column but the wrapping grids are all full-width only when you have too
> many items. Rip-Deck has some UI hooks we could centralize in Charcuterie to ensure
> we're spanning the right number of columns for the content we have to best fill up the
> screen but not make it ugly where you have 7 items across a super wide monitor. The idea
> is that, if you're going to vertically scroll, it's best to widen the displayed items.
> If not, then keep them in a smaller grid, so they all still fit on screen. Ideally, we
> wouldn't require users to scroll."

And earlier, in rip-deck, the sentence the rule was first written from:

> "Like if you have enough height, try to fill it. If you don't, then abuse as much width
> side-by-side as possible. That way, you don't get 9-wide just because you're on an
> ultrawide even if you have more height available."

rip-deck's `useLayoutColumns` already implemented this, but not in a shape anything else
could use: three of its four tuning numbers were module-private constants
(`MIN_COLUMN_WIDTH_PX = 380`, `CARD_HEIGHT_PX = 150`, `CHROME_HEIGHT_PX = 260`), its caps
encoded taste about one app's rack (`MAX_AUTO_COLUMNS = 3`), its storage key was
app-namespaced (`"rip-deck.layout-columns"`), and it read `window.innerWidth` directly with
a bare `resize` listener and no seam. `ai-usage`'s `ProviderGrid` had independently
reinvented the same `repeat(N, minmax(0,1fr))`-plus-window-resize shape, which is the
second consumer that makes it a library concern.

## Why

**Height-first is the whole design, and it is what makes the answer non-obvious.**
`auto-fill, minmax()` — what the rest of the fleet uses — takes every column the width
allows, which is exactly the "7 items across a super wide monitor" the owner called out.
Inverting it means the visible behaviour is deliberately non-monotonic: 1440x900 takes
three columns while the *larger* 1920x1080 takes two, because the taller window stacks the
same nine items in fewer stacks. That reads backwards, is the rule working, and is the
thing most likely to be "fixed" by someone who has not read this. It is carried in the
spec table, in the docstrings, and in the `.mdx` for that reason.

**The widening cap is the other half of the ask.** A fixed large max-width gives the
complaint verbatim: one column, far too wide. A fixed small one gives three columns no room
to be three readable things. Growing the cap with the count means the page earns its width
by having something to fill it with, and one column keeps a reading measure — a 2000px-wide
card is not a better card, it is one line of text the eye tracks from bezel to bezel.

**The width numbers are tokens because a readable measure is structural.** `scales.ts`
already draws this line: "A variant may change how things *look*… It may not change what
layer a modal sits on or what a tablet breakpoint is, because those are structural facts
about the fleet rather than taste." How far the eye should track across a line is that same
kind of fact, and putting it in `@charcuterie/tokens` is what lets a Satori renderer or a
plain-CSS consumer read the same cap without a React tree. The *arithmetic* is not a token
and stayed in the hook.

**The thresholds are reconciled by keeping them apart, and the reconciliation is nearly
free.** Merging them would have been the wrong instinct: rip-deck deliberately set its
grid floor (380px) *below* its card's own `@md/bay:` restyle threshold (28rem/448px),
because the denser card that appears under it is a real density rather than a failure. That
relationship is what had to survive. It turns out rip-deck's hand-measured 380px is within
4px of Charcuterie's `cq-sm` (24rem = 384px), and **every row of the ported spec table gives
the same answer at either number** — asserted in `chooseColumns.test.ts` rather than
claimed — so adopting the token was a rename, not a behaviour change. Using Charcuterie's
`--cq-*` scale rather than Tailwind's `--container-*` follows the existing decision; that
namespace collision silently turned `max-w-md` into `max-w-lg` fleet-wide once already.

**Container for inline size, viewport for block size — the asymmetry is forced.** Observing
the container is the library's own container-query thesis applied to a layout decision: a
grid beside a rail has less room than `window.innerWidth` claims. But block size cannot come
from the element, because the question being asked is "will this scroll", and a grid in
normal flow is exactly as tall as its contents — measuring it always answers "it fits".

**Two boxes, not one, and this is a real bug rather than a style preference.** The content
cap narrows the content when the item count is low. If the observed element is also the
capped element, the fold reads back its own narrowed output and can never widen again: one
column, forever, with no error, no warning, and nothing in devtools that looks wrong.
`AdaptiveGrid` prevents it structurally — an uncapped outer box it measures, an inner box it
caps — and there is a test asserting the measured ancestor carries no cap.

## Evidence

- The owner's ask, quoted in full above (2026-08-10).
- rip-deck `packages/web/src/hooks/useLayoutColumns.ts:121-164` — the original fold and
  width table; `useLayoutColumns.test.ts`, described in-repo as "the spec", ported whole to
  `packages/ui/src/AdaptiveGrid/chooseColumns.test.ts` including the non-monotonic
  1440x900 → 3 / 1920x1080 → 2 pair.
- `chooseColumns.test.ts` — "moving the floor from the measured 380 to cq-sm changes no
  answer" runs all eleven spec sizes at both values and asserts they agree; "the column
  floor is Charcuterie's own cq-sm step" pins the derivation to `containerQuery.sm` and
  asserts it stays below `containerQuery.md`.
- `AdaptiveGrid.test.tsx` — "the grid re-columns when its container resizes" and "the
  inline size is read from the container, not the window" (three grids, one browser window,
  three answers: 1/2/3); "the measured box is never the capped box".
- rip-deck `packages/web/src/components/BayGrid.tsx:44-60` — `min-w-0` on every grid child,
  carried into `AdaptiveGrid` as `[&>*]:min-w-0` because a grid item's automatic minimum
  size is `min-content` and one long path otherwise pushes the grid past the viewport.
- `ai-usage/src/ProviderGrid.tsx:71-78` — the same `repeat(N, minmax(0,1fr))` plus
  window-resize shape, reinvented independently; the second consumer.
- `packages/ui/src/board.storyHelpers.tsx:32-55` — `StoryCell`'s docstring on why a
  container-query element needs a definite inline size from a grid track.
- `packages/tokens/src/scales.ts:50-60` — the "structural facts about the fleet rather than
  taste" line the `contentInlineSize` placement rests on.
