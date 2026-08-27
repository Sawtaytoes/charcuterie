---
"@charcuterie/ui": minor
---

`ReorderList` — a list put in a different order, written once instead of four times

A vertical list whose rows move by two buttons or by dragging a handle.

The shape existed four times before this component did. Docket wrote it twice — a subtask
checklist on HTML5 `draggable`, and a phase queue with the buttons and no drag at all — and
`Board` wrote it once, properly, on Pointer Events. Four implementations of one behaviour is
the case the fleet's build-it-here rule exists for, and the HTML5 one is not merely a
duplicate: `draggable="true"` **does not fire on touch at all**, so that checklist cannot be
reordered on the tablet its owner reads it on.

So this does not fork the geometry. It **calls** `useBoardDrag` with a single registered
lane and the item selector pointed at its own rows, the way `VirtualizedGrid` calls
`useAdaptiveColumns`. The snapshot, the movement threshold, the pointer capture and
`toSettledIndex` exist once in this package, and a fix to any of them reaches the board and
the list together.

`useBoardDrag` gains one optional `itemSelector`, defaulting to the board's own
`[data-board-card]`, so `Board` behaves exactly as it did.

The two move buttons are the PRIMARY path and the drag is the enhancement, per WCAG 2.5.7
and per the board's own decision — `renderItem` receives `moveBy`, `isFirst` and `isLast`
before it receives `gripProps`, and a host that draws no handle at all is supported. A
one-row list gets an empty `gripProps`, so no host can leave a dead handle on it by
forgetting to check, which is the part every hand-rolled copy did forget.

It renders no row, no handle, no buttons and no glyph. That is what lets one component serve
a checklist, a queue and a card list whose CSS grids have nothing in common.

Every commit writes the destination **position** into a named `role="status"` region —
"Moved Sand the cut edge to position 2 of 5" — because "moved" leaves a screen-reader user
unable to tell the top of a list from the bottom of thirty.

No new dependency. The board priced four drag-and-drop libraries at 7–32 KB gzipped and took
none of them; this adds nothing to that arithmetic.
