# The board owns the move, and takes no drag-and-drop dependency

- **Status:** Accepted
- **Date:** 2026-08-19
- **Type:** Component design / dependency policy
- **Supersedes:** —
- **Superseded by:** —

## Decision

`Board` ships with **no drag-and-drop library in its dependency list**. Moving a card is a
first-class operation the component owns, with two drivers on one control:

1. **A `Menu` on every card**, listing the other lanes. This is the **primary** path, not an
   accessible alternative to a real one.
2. **Pointer dragging from the same handle** — Pointer Events, `setPointerCapture`,
   ~1.4 KB gzipped, in `useBoardDrag.ts`.

Both commit through the same `onMove`, which hands back a `toIndex` **already corrected for
the card's own removal**. Every move is announced in a `role="status"` region that names the
destination lane *and* the position within it.

Four more lines are drawn at the same time:

- **Lanes, counts, `+ n more` truncation and empty states are the component's job.**
- **Data, sorting, filtering and virtualisation are the consumer's.** A lane truncates by
  construction, so there is nothing left to window.
- **The cross-lane "needs attention" panel is _not_ part of `Board`.** It composes from
  `Alert` above the board, and the `InBoardScreen` story is the copy-wholesale template.
- **A lane is a `role="group"`, not a landmark**, and it is a `<div>` rather than a
  `<section>`.

## Context

Charcuterie's first consumer for this is **Docket**, the owner's own task tracker, whose board
is its primary surface. He reviewed the deployed first build against an HTML prototype he had
already approved and said:

> "Wow, that's barebones. Nothing like the original prototype HTML version."

Asked how closely the rebuild should track the prototype, he chose **"Rethink the design
against real components"** — the prototype as direction, not specification, with latitude on
arrangement but none to ship something thinner.

A board without dragging feels broken. A published design system's dependency list, however,
is inherited by every consumer — including `castkit/packages/slatecast`, which has 60 KB
gzipped to spend in total — and drag-and-drop is notoriously inaccessible, in a repo where
accessibility is a gate rather than an aspiration.

## Why

### The dependency, priced rather than guessed

Every candidate was checked for licence and provenance first, then **measured**: installed,
bundled with esbuild, minified, gzipped, with React external.

| Package | Licence | Origin | Bundled, minified + gzip |
| --- | --- | --- | --- |
| `@dnd-kit/core` + `@dnd-kit/sortable` | MIT | Claudéric Demers (Canada) | **17.3 KB** |
| `@hello-pangea/dnd` (the maintained `react-beautiful-dnd`) | Apache-2.0 | Atlassian fork, community-maintained | **31.6 KB** |
| `@atlaskit/pragmatic-drag-and-drop` | Apache-2.0 | Atlassian (Australia) | **7.0 KB** |
| `react-dnd` | MIT | react-dnd org (US) | not measured — HTML5 backend, see below |
| **This component's `useBoardDrag.ts` + `boardMove.ts`** | — | — | **1.4 KB** |

None is AGPL or GPL, and none trips the
[Chinese-origin constraint](https://github.com/Sawtaytoes/charcuterie) — that was checked
before the sizes were, because an unclear provenance would have ended the evaluation
regardless of cost.

So the cheapest credible library is **five times** the hand-rolled code and the popular one is
**twelve times** it. What that buys is sensors, collision-detection strategies, multiple
backends, and sortable transition animation: a general solution to a general problem. This
component has a specific one — *one card, from one lane, into one other lane, with an
indicator* — and the general machinery is not free to any consumer that never drags anything.

The repo already has this instinct written down as
[store injection, not a hard Jotai dependency](2026-07-29-store-injection-not-a-jotai-dependency.md).
Same shape, same answer.

### `draggable="true"` is the zero-dependency instinct and it is the wrong one

Native HTML5 drag-and-drop costs nothing and was rejected on three counts:

- **It does not fire on touch at all.** That is the Narrow View, the `kiosk` density, and the
  tablet this consumer's owner actually reads on.
- Its drag image is a browser-drawn ghost with no styling hook worth using.
- `dataTransfer` is readable only inside a real `drop` event, which makes a live drop
  indicator awkward for no gain.

Pointer Events cost the same — nothing — and are one code path for mouse, touch and pen.
`setPointerCapture` keeps the drag alive after the pointer leaves the card, the lane, and the
window.

### The keyboard move is primary, not a fallback

A drag-only board is unusable by keyboard and by screen reader, and this repo gates on both.
But the menu is not here to satisfy the gate — it is the better control on its own merits:

- It is the **only** path available in the Narrow View, where the other lanes are not on
  screen to drop onto. A board that requires dragging simply cannot be operated below `cq-lg`.
- It works on touch without a long-press convention nobody discovers.
- It is discoverable. A drag affordance advertises nothing about *where* a card can go; a
  menu lists the destinations by name.
- It reuses `Menu`, which already owns the roving-focus model and the ARIA — so there is no
  second keyboard implementation in this component to drift out of step with the first.

The announcement names the **position** as well as the lane. "Moved to In Progress" leaves a
screen-reader user unable to tell the top of a lane from the bottom of thirty; that is the one
piece of feedback a sighted user gets free from watching the card land, and it is the piece
every drag implementation forgets to say out loud.

### Where the component's job ends

- **Virtualisation is not the primitive's job, because the requirement removed the need for
  it.** *"Long lanes truncate with an honest `+ n more` rather than scrolling forever."* The
  lane takes `itemCount` — the true total — and `items`, whatever the consumer chose to paint;
  the difference is the overflow line. A lane therefore never grows a scrollbar and never
  holds more rows than the consumer decided to hand it. Adding a windowing library on top of
  a list that is capped at a dozen rows would be a dependency for a case that cannot occur.
- **The "needs attention" panel is a different component, and the argument is that it is not a
  lane.** It reaches across every lane, so nothing about lane identity applies to it; it is
  absent when empty, so the board cannot reserve room for it without becoming furniture; and
  it is *already* `Alert`, which this library shipped for exactly this shape. Absorbing it
  would make `Board` responsible for a summary of data it does not own, and would make the
  banner unavailable above a list that is not a board.
- **A lane is a `group`.** A named `<section>` is a landmark, and a board with four of them
  buries a page's real ones — the same call the
  [accordion panel](2026-07-31-an-accordion-panel-is-a-group-not-a-landmark.md) made. It is a
  `<div role="group">` and not a `<section role="group">` because axe's `landmark-unique`
  matches `section[aria-labelledby]` on the **element** and keeps auditing it as a landmark
  after the role has been overridden. That failed here before the element changed.

### Container queries, restated because it is the thing most likely to get "fixed"

`Board` and each lane declare `@container`; nothing in the component declares a media query,
and a `@media (max-width: …)` appearing in one of these files is a defect rather than a
shortcut. Two facts compound to make window width useless:

- **A lane in a three-up board is narrow on any monitor** — three lanes across 1600px is
  ~500px each.
- **The owner browses zoomed in** — a 1500px window at 175% zoom is ~860 effective CSS pixels,
  so the number a media query reads is not the number of pixels anything has.

The cramped layout is therefore the **Narrow View**, named for the width, and the identifier
is `isVisibleWhenNarrow` — never `isMobile`
([workspace decision](https://github.com/Sawtaytoes/charcuterie)).

## Evidence

The reaction that started it, and the direction chosen (owner, 2026-08-19):

> "Wow, that's barebones. Nothing like the original prototype HTML version."

> *Asked how closely to match the prototype:* **"Rethink the design against real components."**

On row shape, which is why the card is container-queried rather than fixed:

> "2-line looks good for phases because if you look at the narrow view… looks good with 1 line
> when wide… For a really wide view, I think we should make them cards or something."

From Docket's own requirements, on lanes and scrolling:

> "The Backlog queue is always the largest. Having these in columns where 1 column is way
> taller than the rest makes no sense."

> "No horizontal scroll, ever. The board becomes a segmented control, never a pan surface."

The bundle numbers in the table above were measured on 2026-08-19 with:

```sh
npm i @dnd-kit/core @dnd-kit/sortable @hello-pangea/dnd @atlaskit/pragmatic-drag-and-drop
esbuild entry.js --bundle --minify --format=esm --external:react --external:react-dom
gzip -9 -c
```

The token trap this component is built to avoid, from Docket's first board: every priority bar
was painted `--color-danger-9`, a Radix-style scale `@charcuterie/tokens` has never had, so
every bar rendered transparent while every "is it rendered" assertion passed. Only looking at
the image caught it. `BoardItem.accentIntent` is typed as `IntentName` so the same mistake is a
compile error, and `Board.test.tsx` asserts that the bar's meaning is also present as text —
because a colour bar alone fails WCAG 1.4.1 whether or not the colour exists.
