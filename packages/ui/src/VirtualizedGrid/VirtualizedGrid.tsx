import { useWindowVirtualizer } from "@tanstack/react-virtual"
import type { ReactNode } from "react"
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { getContentMaxInlineSize } from "../AdaptiveGrid/chooseColumns.ts"
import type { BlockSizeResolver } from "../AdaptiveGrid/useAdaptiveColumns.ts"
import { useAdaptiveColumns } from "../AdaptiveGrid/useAdaptiveColumns.ts"
import { toClassName } from "../toClassName.ts"
import { DEFAULT_GRID_GAP_PX } from "./gridGap.ts"

export type VirtualizedGridProps<Item> = {
  /**
   * Where the available block size is read from. Defaults to the
   * viewport, which is the only thing that can answer "will this
   * scroll".
   */
  blockSizeResolver?: BlockSizeResolver
  /**
   * Everything down the page that is not this grid, in CSS px —
   * header, rails, filter rows. Subtracted before asking how many
   * items stack.
   */
  chromeBlockSize?: number
  className?: string
  /**
   * Draw this many columns instead of the automatic answer — the
   * manual override, for a page that hoisted `useAdaptiveColumns`
   * itself.
   */
  columns?: number
  /** The gap between tracks and rows, in CSS px. */
  gap?: number
  /**
   * A stable identity per item. Without one the key is the index,
   * which is wrong the moment the list is filtered or an item
   * leaves the middle — React reuses the mounted subtree and the
   * wrong tile inherits the wrong open menu.
   */
  getItemKey?: (
    item: Item,
    index: number,
  ) => string | number
  /**
   * One row's block size in CSS px, as a starting guess.
   *
   * Unlike `AdaptiveGrid`'s, this is an *estimate* and not a
   * commitment: every mounted row is measured and the estimate
   * corrected. It still wants to be close, because it is what the
   * scrollbar is sized from before anything has been measured — a
   * bad guess makes the bar jump under the thumb on first scroll.
   */
  itemBlockSize: number
  /** Every item, mounted or not. */
  items: readonly Item[]
  /**
   * An accessible name for the list. Worth giving: a windowed list
   * is one whose length a reader cannot count for itself.
   */
  label?: string
  /** The most columns the automatic answer will take. */
  maxColumns?: number
  /** The narrowest a column may be, in CSS px. */
  minColumnInlineSize?: number
  /**
   * How many rows to mount above and below the viewport.
   *
   * Four rather than `@tanstack/react-virtual`'s default of one:
   * these are media tiles whose images load over the network, and
   * a row that mounts at the moment it becomes visible shows a
   * blank box while the image arrives. Overscan buys the load a
   * head start.
   */
  overscanRows?: number
  /** Draw one item. */
  renderItem: (item: Item, index: number) => ReactNode
  /**
   * The `localStorage` key a manual column choice is remembered
   * under. Namespace it to the app; omit it and nothing is
   * written.
   */
  storageKey?: string
}

/**
 * `AdaptiveGrid`'s layout, with only the rows you can see mounted.
 *
 * The fleet's grids render every item they are given. That is the
 * right default, and it stops being right somewhere in the low
 * thousands: QueuePilot's Pending page put **2,162** tiles on one
 * screen — 19,933 DOM nodes, 2,162 `<img>`, 4,371 `<button>`, 7.8
 * seconds to settle, and roughly 43fps while scrolling on a machine
 * with no GPU to lose. Nothing about that page was wrong except how
 * much of it existed at once.
 *
 * ### It is the same grid, and deliberately so
 *
 * Columns come from `useAdaptiveColumns` — the identical
 * height-first rule `AdaptiveGrid` uses, with the identical two-box
 * structure protecting it (an uncapped outer box is measured, an
 * inner box carries the cap). Windowing is the only difference. A
 * second column heuristic that windowed lists followed and flow
 * lists did not would be a fleet where the same content lays out
 * two ways depending on how many of it there are.
 *
 * ### The window is padding, not absolute positioning
 *
 * The obvious build — absolutely position a row per visible row —
 * is the one this does not do, and the reason is the markup. A
 * `<ul>` whose children are positioning wrappers is not a list any
 * more; the cards stop being `<li>`, and the structure a screen
 * reader walks becomes a fiction maintained by ARIA roles.
 *
 * So there are no row elements at all. One real CSS grid holds the
 * visible items as ordinary `<li>` children, and the thousands of
 * rows above and below it are two numbers:
 * `padding-block-start` for everything scrolled past and
 * `padding-block-end` for everything still to come. The grid then
 * does its own job — tracks on the inline axis, rows sized to
 * their tallest item — instead of being reimplemented in
 * `transform`s.
 *
 * ### How a row gets measured without existing
 *
 * A CSS grid stretches every cell in a row to the row's height
 * (`align-items: stretch`, which is the default and is not
 * overridden here). So **any** cell in a row is exactly as tall as
 * the row, and measuring the first one measures the row. That is
 * what `data-index` and the `measureElement` ref are doing on the
 * leading cell of each row, and it is why tile heights are allowed
 * to vary — a two-line title, a wrapped pair of buttons, a badge
 * only some items carry.
 *
 * The row gap sits between two measured boxes and so is in
 * neither. `measureRow` adds it back, which keeps the virtualizer's
 * idea of the distance from one row to the next and the browser's
 * the same number.
 *
 * ### Why the window and not a scroll box of its own
 *
 * `useWindowVirtualizer`, so the page scrolls the way every other
 * page in the fleet scrolls — the header leaves, the scrollbar is
 * the browser's, `Ctrl+End` works. A component that grew its own
 * `overflow: auto` well would trap the wheel and strand the page
 * header above it. The cost is `scrollMargin`: the virtualizer has
 * to be told how far down the document the grid starts, which is
 * measured below.
 *
 * ### What windowing costs, and what is done about it
 *
 * The true length is stated rather than implied — `aria-setsize` on
 * every cell carries the full count and `aria-posinset` its real
 * position, so a reader announces "3 of 2,162" instead of "3 of
 * 40". Two costs have no fix at this layer and are the caller's to
 * answer: the browser's `Ctrl+F` only searches what is mounted, and
 * so does "select all". A page that needs either owes its users a
 * search field of its own.
 */
export const VirtualizedGrid = <Item,>({
  blockSizeResolver,
  chromeBlockSize,
  className,
  columns,
  gap = DEFAULT_GRID_GAP_PX,
  getItemKey,
  itemBlockSize,
  items,
  label,
  maxColumns,
  minColumnInlineSize,
  overscanRows = 4,
  renderItem,
  storageKey,
}: VirtualizedGridProps<Item>): ReactNode => {
  const layout = useAdaptiveColumns({
    blockSizeResolver,
    chromeBlockSize,
    itemBlockSize,
    itemCount: items.length,
    maxAutoColumns: maxColumns,
    minColumnInlineSize,
    storageKey,
  })

  const drawnColumns = columns ?? layout.columns

  // Folded from what is DRAWN rather than read off the hook, so an
  // override widens the page cap with it — the same rule
  // `AdaptiveGrid` follows, and wrong in the same way if it does
  // not.
  const contentMaxInlineSize = getContentMaxInlineSize({
    columns: drawnColumns,
  })

  const rowCount = Math.ceil(items.length / drawnColumns)

  /**
   * How far down the document the grid starts.
   *
   * `useWindowVirtualizer` measures against the document, so
   * without this every row is placed as though the grid began at
   * the top of the page, and the whole list sits shifted by the
   * height of the header above it.
   *
   * State and not a ref, because it feeds `scrollMargin` and a
   * change has to re-render. Measured on every commit rather than
   * on a dependency list: a filter row that grows a line moves the
   * grid down the page, and nothing in this component's own props
   * would report that.
   */
  const gridElement = useRef<HTMLUListElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const element = gridElement.current

    if (!element) {
      return
    }

    const next =
      element.getBoundingClientRect().top + window.scrollY

    setScrollMargin((current) =>
      current === next ? current : next,
    )
  })

  /**
   * A row's height, plus the gap that follows it.
   *
   * The gap is added here rather than left to the estimate because
   * it is real distance the next row starts after: leave it out
   * and the virtualizer's offsets drift by one gap per row, which
   * on a list of two thousand is a scrollbar off by half a page.
   */
  const measureRow = useCallback(
    (element: Element) =>
      element.getBoundingClientRect().height + gap,
    [gap],
  )

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => itemBlockSize + gap,
    measureElement: measureRow,
    overscan: overscanRows,
    scrollMargin,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  const firstRow = virtualRows[0]
  const lastRow = virtualRows[virtualRows.length - 1]

  // Everything scrolled past, and everything still to come. The two
  // numbers that stand in for the rows that do not exist.
  const paddingBlockStart = firstRow?.start ?? 0

  const paddingBlockEnd = lastRow
    ? Math.max(
        0,
        rowVirtualizer.getTotalSize() - lastRow.end,
      )
    : 0

  return (
    <div
      className={toClassName(
        "flex justify-center",
        className,
      )}
      ref={layout.containerRef}
    >
      <ul
        aria-label={label}
        className="grid w-full list-none p-0 [&>*]:min-w-0"
        ref={gridElement}
        style={{
          gap: `${gap}px`,
          gridTemplateColumns: `repeat(${drawnColumns}, minmax(0, 1fr))`,
          maxInlineSize: contentMaxInlineSize,
          // Offset by `scrollMargin` because `start` is measured
          // from the top of the document, and this padding is
          // measured from the top of the grid.
          paddingBlockEnd: `${paddingBlockEnd}px`,
          paddingBlockStart: `${Math.max(0, paddingBlockStart - scrollMargin)}px`,
        }}
      >
        {virtualRows.flatMap((row) => {
          const firstIndex = row.index * drawnColumns

          return items
            .slice(firstIndex, firstIndex + drawnColumns)
            .map((item, offset) => {
              const index = firstIndex + offset

              return (
                <li
                  aria-posinset={index + 1}
                  aria-setsize={items.length}
                  // `data-index` names the ROW, so it goes on
                  // every cell in it — they all sit in that row
                  // and the attribute is true of all of them.
                  //
                  // Putting it only on the measured cell is the
                  // version that looks tidier and warns on every
                  // resize: the virtualizer keeps a
                  // `ResizeObserver` on whatever it measured and
                  // re-reads the attribute whenever that node
                  // changes size. Let the node stop being the
                  // leading cell — a column count change is all it
                  // takes — and it is still observed, now with no
                  // attribute to resolve.
                  data-index={row.index}
                  key={getItemKey?.(item, index) ?? index}
                  // Measured on the leading cell alone. A CSS grid
                  // stretches every cell to its row's height, so
                  // one is enough — and measuring all of them
                  // would have the virtualizer record the same row
                  // once per column.
                  ref={
                    offset === 0
                      ? rowVirtualizer.measureElement
                      : undefined
                  }
                >
                  {renderItem(item, index)}
                </li>
              )
            })
        })}
      </ul>
    </div>
  )
}
