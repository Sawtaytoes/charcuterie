---
"@charcuterie/ui": minor
---

`DropRail` — every move destination at once, brought to the pointer

`Board` moves a card with a `Menu` on the card, and at three or four lanes that is the
right control. It stops being the right control at the size the fleet's real lists reach:
Docket's Backlog draws 34 project groups down one page, of which about four fit on a
display. Dragging from the first to the thirty-fourth means holding a pointer down while
the page scrolls, and a menu of 34 items is a scrolling list inside a popup — the same
problem in a smaller box.

`DropRail` pins every destination to the top for the length of a move, so nothing is off
screen and every target is the same short distance away. It is a `listbox` that three
things drive — pointer, tap, and the arrow keys — all committing through one `onPick`. It
reads `event.buttons` to tell a drag from a tap, so a host says only whether a move is in
flight.

It takes **no drag-and-drop dependency**, holding the line the
[board's decision](../docs/decisions/2026-08-19-the-board-owns-the-move-and-takes-no-drag-and-drop-dependency.md)
drew: a chip is a box under the pointer, so `elementFromPoint` answers the only geometric
question a rail has. No snapshot, no collision strategy, no sortable transform.

`Board` is unchanged — its `Menu` remains correct for a board.
