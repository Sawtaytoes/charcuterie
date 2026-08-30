# `VirtualizedGrid` windows `AdaptiveGrid`'s layout rather than forking it

- **Status:** Accepted
- **Date:** 2026-08-21
- **Type:** Component
- **Supersedes:** —
- **Superseded by:** [VirtualizedGrid follows the nearest vertical scroll region](2026-08-30-virtualizedgrid-follows-the-nearest-vertical-scroll-region.md) (point 5 only)

## Decision

`VirtualizedGrid` is a second grid component that mounts only the rows in view. It
**calls `useAdaptiveColumns`** — the same hook `AdaptiveGrid` calls — rather than deciding
columns for itself.

1. `AdaptiveGrid` stays the default and is unchanged. It renders everything it is handed.
2. `VirtualizedGrid` is for lists whose length is unbounded — a library listing, an inbox, a
   backlog that grows.
3. The window is **padding**, not absolute positioning. One real CSS grid holds the visible
   items as ordinary `<li>` children; the rows above and below are `padding-block-start` and
   `padding-block-end`.
4. Rows are **measured**, so tile heights may vary. `itemBlockSize` is a starting estimate,
   not a commitment.
5. `useWindowVirtualizer`. The page scrolls; the component does not grow a scroll box.

## Context

QueuePilot's Pending page, measured on the live server at 1920x1080: **2,162** tiles,
19,933 DOM nodes, 2,162 `<img>`, 4,371 `<button>`, 111 MB of JS heap, 1,308 ms of blocked
main thread during load. Nothing about the page was wrong except how much of it existed at
once.

`@tanstack/react-virtual` was already a dependency — `Combobox` has windowed its option list
since it shipped — so this adds no new one.

## Why

**Why one column rule and not two.** A windowed grid that answered the column question
differently from a flow grid would be a fleet where the same content lays out two ways
depending on how many of it there are. Sharing the hook also keeps the two-box structure
that `chooseColumns` requires — an uncapped outer box is measured, an inner box carries the
content cap — which is the one part of this layout that fails silently when it is wrong
(one column, forever, with no error anywhere).

**Why padding and not absolute positioning.** Positioning a wrapper per row is the obvious
build. It makes the `<ul>`'s children positioning devices rather than cards, so the cards
stop being `<li>` and the structure a screen reader walks becomes a fiction maintained by
ARIA roles. Biome's `useSemanticElements` refuses that markup and is right to. With padding
there are no row elements at all, and the grid keeps doing its own job: tracks on the inline
axis, rows sized to their tallest item.

**How a row is measured without existing.** A CSS grid stretches every cell to its row's
height, so measuring the leading cell measures the row. The row gap sits between two measured
boxes and is in neither, so `measureRow` adds it back — leave it out and the offsets drift by
one gap per row, which on two thousand rows is half a page of scrollbar.

**Why `data-index` is on every cell.** Putting it only on the measured cell is tidier and
warns on every resize. The virtualizer keeps a `ResizeObserver` on whatever it measured and
re-reads the attribute when that node changes size; a cell that stops being the leading one
is still observed, now with nothing to resolve. `data-index` names the **row**, and every
cell is in that row, so the attribute is true of all of them.

**What windowing costs.** Stated rather than hidden: the browser's `Ctrl+F` searches only
what is mounted, and so does "select all". A page that needs either owes its users a search
field of its own. Scrolling also costs main thread that a static list does not — measured at
276 ms against 168 ms over an identical 60-step scroll — which is the trade, not a defect.
It buys 94% fewer DOM nodes and a quarter of the memory.

## Evidence

Measured before and after at the **same** 2,162 items, 1920x1080, headless Chromium:

| | Every item | Windowed |
| --- | --- | --- |
| DOM nodes | 19,933 | 1,266 |
| `<img>` | 2,162 | 77 |
| `<button>` | 4,371 | 202 |
| JS heap | 111 MB | 28 MB |
| Blocked main thread, load | 1,308 ms | 209 ms |
| Blocked main thread, 60-step scroll | 168 ms | 276 ms |

- Story `Default` holds 2,000 items. Driven in a real browser: 39 cells at the top, row 666
  (the last) at the bottom, `padding-block-end` falling to 0, and item "Bay 721" at row 240 —
  the arithmetic checked against the DOM rather than asserted.
- 5 browser tests, all of them about windowing rather than about columns, which
  `chooseColumns.test.ts` and `AdaptiveGrid.test.tsx` already prove.
