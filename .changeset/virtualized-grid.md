---
"@charcuterie/ui": minor
---

`VirtualizedGrid`: `AdaptiveGrid`'s layout with only the visible rows mounted

**Minor.** A new component and one new exported constant. Nothing existing changes
behaviour — `AdaptiveGrid` is untouched and still renders everything it is handed, which
remains the right default.

The prompting measurement, taken on QueuePilot's live Pending page at 1920x1080: 2,162
items, 19,933 DOM nodes, 2,162 `<img>`, 4,371 `<button>`, 7.8 s to settle, ~43 fps while
scrolling on a machine with no GPU to lose. Nothing about the page was wrong except how
much of it existed at once.

- **Columns are `useAdaptiveColumns`, not a second heuristic.** The identical
  height-first rule, with the identical two-box structure protecting it — an uncapped
  outer box is measured, an inner box carries the content cap. A windowed list and a flow
  list lay the same content out the same way; windowing is the whole of the difference.
- **The window is padding, not absolute positioning.** There are no row elements. One
  real CSS grid holds the visible items as ordinary `<li>` children, and the thousands of
  rows above and below are `padding-block-start` and `padding-block-end`. The obvious
  build — a positioned wrapper per row — makes the `<ul>`'s children positioning devices
  rather than cards, so the structure a screen reader walks becomes a fiction maintained
  by ARIA roles. This way the grid keeps doing its own job: tracks on the inline axis,
  rows sized to their tallest item.
- **Rows are measured without existing.** A CSS grid stretches every cell to its row's
  height, so measuring the leading cell measures the row. That is what lets tile heights
  vary — a two-line title, a wrapped pair of buttons, a badge only some items carry.
  `itemBlockSize` is an estimate that gets corrected rather than a commitment.
- **`data-index` names the row and goes on every cell in it.** Putting it only on the
  measured cell is the tidier version that warns on every resize: the virtualizer keeps a
  `ResizeObserver` on whatever it measured and re-reads the attribute when that node
  changes size, so a cell that stops being the leading one is still observed with nothing
  left to resolve.
- **`useWindowVirtualizer`, so the page scrolls.** The header leaves, the scrollbar is
  the browser's, `Ctrl+End` works. A component with its own `overflow: auto` well would
  trap the wheel and strand the page header above it. The cost is `scrollMargin`, measured
  in a layout effect on every commit — a filter row that grows a line moves the grid down
  the page and no prop of this component would report it.
- **The true length reaches assistive technology.** `aria-setsize` on every cell carries
  the full count and `aria-posinset` its real position, so a reader announces "3 of 2,162"
  rather than "3 of 40".
- **`DEFAULT_GRID_GAP_PX`** is exported from `@charcuterie/ui`, so a consumer measuring
  its own `itemBlockSize` off a running page can account for the row gap rather than
  rediscovering the number.

Two costs have no fix at this layer and belong to the caller: the browser's `Ctrl+F` only
searches what is mounted, and so does "select all". A page that needs either owes its
users a search field of its own. `@tanstack/react-virtual` was already a dependency —
`Combobox` has windowed its option list since it shipped — so this adds no new one.
