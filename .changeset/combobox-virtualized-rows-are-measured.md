---
"@charcuterie/ui": patch
---

Combobox: virtualized option rows are measured, not pinned to the 36px
estimate — so a wrapping (two-line) label no longer overlaps the row below it.

The windowed list gave each row a fixed `height: virtualRow.size` from the
`estimateSize: 36` guess. A long option label wraps to ~56px, so the row's
content overran its 36px box and the next row (positioned at estimate pitch)
was drawn on top of it — the popup rendered as overlapping text in a narrow
panel with many long entries (a media library of long folder names). Each row
now carries `ref={rowVirtualizer.measureElement}` + `data-index` and no fixed
height, so the virtualizer reads its real height and lays the rest out below.
Adds a `VirtualizedLongOptions` story as the regression guard.
