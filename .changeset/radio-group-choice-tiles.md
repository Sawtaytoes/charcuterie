---
"@charcuterie/ui": minor
---

`RadioGroup` draws choice tiles: `itemShape="tile"`, plus `hint` and `icon` on an item

A bordered card carrying a name, a line of help and a selected surface, laid out in a grid
that gains columns with its **container**. The control does not change — same `radiogroup`
of `radio`s, same roving tab stop, same selection-follows-focus, same `isReadOnly` — so it
is a prop and not a third component. `minTileInlineSize` (CSS px, default 200) is the grid's
floor.

Four apps in the fleet had each hand-painted this shape, ten instances between them, and not
one carried `aria-checked`: every one was a bare `<button>` or `<a>` whose selection was
visible only as colour. Eight of the ten put a second line under the name, which is also why
none of them reached for `RadioGroup` — a plain-text `label` could not express it. `hint`
renders on a row as readily as on a tile.

Nothing here is breaking. `itemShape` defaults to `row`, and an item with no `hint` and no
`icon` renders exactly the markup it did before.
