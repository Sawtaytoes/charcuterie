# The move handle wears the gesture that can succeed

**Status:** Accepted
**Date:** 2026-08-27
**Type:** Component · Container queries · Accessibility
**Supersedes:** —
**Superseded by:** —

## Decision

`Board`'s move handle shows **two different things at two widths**, and the width it asks
about is the **board's**, not the lane's.

| The board is | The handle shows |
| --- | --- |
| `cq-lg` (48rem) and wider — the lanes are side by side | the app's `moveIcon` |
| narrower — one lane and a segmented control | the word **Move** |

An app with no `moveIcon` is unchanged: the word at every width.

Three rules come with it.

1. **CSS picks, not JavaScript.** Both affordances are in the DOM at every width. There is
   no `ResizeObserver` and no measurement, so the first paint is right.
2. **The accessible name is one sentence at every width.** Both visible affordances are
   `aria-hidden`; the whole name — `Move <title>, currently in <lane>` — is a
   `VisuallyHidden` beside them.
3. **The board's container is NAMED `board`.** The handle queries
   `@min-[48rem]/board:`, never a bare `cq-lg:`.

## Context

QueuePilot's rules editor puts three trays — required, optional, roster — in a `Board`
inside a modal. It passed `moveIcon="≡"`, which is that app's own grip glyph, and the modal
was narrow enough that the board was in its one-lane form. The owner could not move
anybody:

> *"For this Rules called 'Shorts', I can't seem to drag 'n drop the names from Everyone
> Else anywhere else. There's no right-click or anything. How do I move these?"*

The first fix took the glyph away at every width and let the library's default word stand.
That fixed the narrow board and broke the wide one:

> *"I think the drag handles were fine, but now you have it in a 3-column mode, so dragging
> would work, but it has this 'move' button instead. The 'move' button would be best in that
> mobile view I showed you in the screenshot."*

Two reports, one rule between them, and it is not a QueuePilot preference — it is a fact
about the component. Whether a drag can land depends on whether another lane is on screen,
and the board is the only thing that knows.

## Why

**A grip glyph is a promise.** `≡` and `⋮` mean *drag me*. In the wide board that promise is
kept: the other lanes are right there, `useBoardDrag` is listening, and dragging is the
fastest thing a pointer user can do. In the one-lane board there is nothing on screen to
drop onto, so the glyph teaches the single gesture that cannot work — and it teaches it
instead of the one that can. The word **Move** reads as a button, and pressing it opens the
menu of the other lanes, which is the path that works from the keyboard, from a screen
reader, on touch, and at that width.

**The lane cannot answer this question — it answers it backwards.** A container query
matches the nearest ancestor container, and between the board and a card sits the lane's own
container, which decides what shape a card is. Measured through it:

| | lane width | a bare `cq-lg:` inside the card |
| --- | --- | --- |
| 920px modal, three lanes across | ~280px | false |
| 920px modal, one lane | ~870px | **true** |
| 390px phone, one lane | ~340px | false |

Rows two and three are the same layout — one lane, nothing to drop onto — and the nearer
container disagrees with itself about them. So the query has to reach past the lane, which
is what naming the board's container buys. A named container still answers an unnamed
query, so every existing `cq-lg:` on the segmented control and the lanes is unaffected.

**`48rem` is written out twice, and a test holds the two together.** A container query's
threshold is resolved before custom properties exist, so
`@container board (min-inline-size: var(--cq-lg))` is not valid CSS. The lanes get their
literal from the generated `cq-lg` variant and the handle writes Tailwind's own
`@min-[48rem]/board:`, which is the only form that can name a container.
`boardMoveHandleContainer.test.ts` asserts the handle's literal equals `containerQuery.lg`
and that `Board` declares the container the handle names — a named query with no matching
container matches nothing, silently.

**The name had to stop depending on CSS.** The handle used to build its accessible name out
of the visible word plus a `VisuallyHidden` qualifier. With two visible affordances that
would have been `Move X` wide and `Move Move X` narrow — one control with two names, and one
`getByRole` query that works in one layout only.

**`sizing` stays `control` and takes `icon` back with a variant.** `sizing` is a prop and
cannot be two values at once. The button keeps the padding the word needs and re-applies
`ICON_CONTROL_SIZE_CLASS`'s two utilities at the width where the glyph is showing. Tailwind
orders a variant after the utility it varies, so this is deterministic rather than a
specificity coin-flip — the same thing `BoardLaneList`'s own `cq-lg:p-0` already relies on.

The price is honest: `moveIcon` now saves ~35px a row rather than ~55px, because the button
is control-sized underneath. A handle nobody can find costs more.

## Evidence

- Owner, 2026-08-27: *"For this Rules called 'Shorts', I can't seem to drag 'n drop the
  names from Everyone Else anywhere else. There's no right-click or anything. How do I move
  these?"*
- Owner, 2026-08-27: *"I think the drag handles were fine, but now you have it in a 3-column
  mode, so dragging would work, but it has this 'move' button instead. The 'move' button
  would be best in that mobile view I showed you in the screenshot."*
- Superseded on the app side: QueuePilot's
  `2026-08-27-the-tray-move-handle-says-move-it-does-not-wear-the-drag-glyph.md`, which read
  the first report as a blanket rule against the glyph.
- Tests: `Board.test.tsx` — *"a wide board's handle is the app's grip, not the word"*, *"a
  one-lane board's handle says Move, whatever the app passed"*, *"the handle has one name at
  both widths"*. Story: `Board.stories.tsx` → `MoveHandleByWidth`.
