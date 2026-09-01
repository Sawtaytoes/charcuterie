# A choice tile is a `RadioGroup` shape, not a third component

**Status:** Accepted
**Date:** 2026-08-25
**Type:** Component / API shape
**Supersedes:** —
**Superseded by:** —
**Extended by:** [2026-09-01-a-tile-that-acts-is-its-own-component-and-shares-only-the-box.md](2026-09-01-a-tile-that-acts-is-its-own-component-and-shares-only-the-box.md) — the tile that *navigates*, named below as out of scope, is now `ActionTiles`
**Extends:** [2026-07-30-a-consumer-milestone-adds-components.md](2026-07-30-a-consumer-milestone-adds-components.md)

## Decision

The choice tile — a bordered card carrying a name, a line of help and a selected surface,
laid out in a grid — is `RadioGroup`'s second **shape**, not a component beside it.

```ts
itemShape?: "row" | "tile"        // default "row"
minTileInlineSize?: number        // CSS px, default 200, tile only

// on RadioItem
hint?: ReactNode                  // both shapes
icon?: ReactNode                  // tile only
```

The grid is `repeat(auto-fill, minmax(min(var(--charcuterie-tile-min-inline-size), 100%),
1fr))` — container-driven, `auto-fill` and not `auto-fit`, and **not** `useAdaptiveColumns`.

Two alternatives were refused: a `ChoiceTile` / `ChoiceTileGroup` pair, and an
`appearance="tile"`.

## Context

QueuePilot's WP-6 built the Tonight screen's activity chooser and could not find the shape
in this library, so it painted one — a `RadioGroup` handed a grid `className`, with the box
drawn by an app CSS rule against `[role="radio"]`. It flagged itself while doing it:

> "A choice tile has no prop in `@charcuterie/ui`: `RadioGroup` draws prose rows and
> `MediaTile` needs artwork. The alternative was a hand-rolled `<div>` of `<button
> aria-pressed>`, which never announces exclusivity — so the semantics stay the library's
> and only the box is the app's."

A fleet survey then found the same shape hand-painted in four more apps, ten instances:

| App | Instances | How it paints the box |
| --- | --- | --- |
| bambuddy | 6 | `p-2 rounded-lg border`, selected = accent border + a 10% fill |
| spoolbuddy | 1 | `p-2 rounded-lg border-2`, plus an absolutely-positioned check badge |
| points-market | 1 | `rounded-3xl border … px-6 py-6`, `auto-fit` grid in the app's own CSS |
| mux-magic | 1 | `rounded-xl border border-border-default … p-7` |
| mail-sifter | 2 | a `Card` with `role="button"` and hand-written Enter/Space handling |

Two facts out of that survey decided the API rather than merely justifying the work.

**Not one of the ten carries `aria-checked`, `aria-pressed` or `role="radio"`.** Every one is
a bare `<button>` or `<a>` whose selection is visible only as colour — correct to an eye,
silent to a screen reader, announced as neither pressed nor "3 of 6". Two of them re-implement
Enter and Space by hand on a `<div>`.

**Eight of the ten put a second line under the name**, and `RadioGroup` has **zero call sites
in the entire fleet**. Those are the same fact. A plain-text `label` could not express a name
plus a hint, so five apps each concluded the library had nothing for them and reached for a
`<div>` instead.

## Why

**Only the box changes, so only the box is new.** The element, the `radio` role, the roving
tabindex, selection-follows-focus, `isReadOnly`, the disabled-is-unregistered rule and the
first-paint `pendingValue` correction are all unchanged, and all already tested. A separate
component would either copy that wiring a third time — it is already duplicated verbatim
between `RadioGroup` and `SegmentedControl` — or force a refactor of two shipped components
as the price of a border.

**`SegmentedControl` is not the precedent it looks like.** It has its own file because it is a
different *control*: one connected strip on a sunken surface, no radio affordance at all,
options too short to carry a sentence. A tile is this control with a border, and its radio dot
is still there. "Same composition, different shape" is not the test — `Tabs` shares the
composition too, and has panels.

**`appearance` was already taken, and taking it twice would cost the word.** Every
`appearance` in this package is an `IntentAppearance` — `solid` / `soft` / `outline` /
`ghost`, a colour treatment. `appearance="tile"` would make one component's `appearance` mean
layout, against the house rule of one word per concept.

**`hint` belongs to both shapes, which is the tell.** A radio row with a description under it
is an ordinary form pattern; it is not a tile-only need. A prop that is useful on the shape
that already exists is not evidence for a new component.

**`icon` is tile-only, on purpose.** A row already leads with its radio, and a second leading
mark either side of it has nowhere to sit. It is `aria-hidden` by construction because the
name it sits above is inside the same button — an announced icon is the label read twice.

**The hint renders inside the button, not beside it.** `getByRole` computes an accessible name
from contents, so the hint joins the name; a hint a screen reader never reads is a hint half
the audience does not have. A test asserts the full string rather than the label alone.

**The grid is not `useAdaptiveColumns`, and the difference is the question.** That hook buys a
column with height, for an unbounded gallery that will scroll, and it widens the page's content
cap as it goes. A radio group is a bounded set of options inside a form section; the only
question is how many fit across the box it was handed, and it must never widen the page around
it. `auto-fill` rather than `auto-fit` for the standing reason — `auto-fit` collapses the empty
tracks and lets six tiles share a 2560px row as six 420px slabs, which is the full-width-row
shape in a new costume. `min(…, 100%)` is what keeps the 200px floor from becoming a horizontal
scrollbar in the Narrow View.

**The floor is a custom property, not an interpolated class**, for the reason `Card`'s accent
edge is: Tailwind scans source text for complete class strings, so `` `grid-cols-[…${n}px…]` ``
generates nothing, paints nothing and reports nothing.

## What this deliberately does not cover

- **A multi-select tile.** bambuddy's plate picker and spoolbuddy's slot picker toggle per
  tile. That is `MultiplePicker`, a checkbox group, and a different record.
- **A tile that navigates.** mux-magic's "Pick a tool" tiles are `<a href>` and points-market's
  are `<Link>`. A link is not a radio, and giving one `aria-checked` would be worse than the
  paint it replaced. **This is now `ActionTiles`**
  ([2026-09-01](2026-09-01-a-tile-that-acts-is-its-own-component-and-shares-only-the-box.md)),
  which shares this shape's box through `tileStyles.ts` and nothing else.
- **A tile with artwork.** That is `MediaTile`, and it stays that.

## Evidence

The survey commands were run with `rg -uu` from `/mnt/TrueNAS-Apps/Repos`; a plain `rg` from a
parent directory is swallowed by ignore rules and returns zero hits across every child repo,
which is indistinguishable from "the fleet does not do this".

Gates on the change: 1,514 tests pass, 113 contrast pairs clear AA in every variant and scheme,
and the seven new tests read `getComputedStyle` in a real browser rather than class names —
the border width and the two colours that must differ, and a column count that changes with the
**container** while the window does not move. A class-name assertion would have passed the
whole time while the grid was one column, because the class really was in the DOM.
