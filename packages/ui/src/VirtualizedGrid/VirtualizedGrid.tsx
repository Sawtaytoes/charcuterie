import type { ReactNode } from "react"
import { useLayoutEffect, useState } from "react"

import type { BlockSizeResolver } from "../AdaptiveGrid/useAdaptiveColumns.ts"
import { useAdaptiveColumns } from "../AdaptiveGrid/useAdaptiveColumns.ts"
import { toClassName } from "../toClassName.ts"
import { ElementGrid } from "./ElementGrid.tsx"
import { DEFAULT_GRID_GAP_PX } from "./gridGap.ts"
import { findScrollOwner } from "./virtualizedGridScroll.ts"
import type {
  GridWindowProps,
  ScrollOwner,
} from "./virtualizedGridTypes.ts"
import { WindowGrid } from "./WindowGrid.tsx"

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
 * ### It follows the page's existing scroll owner
 *
 * A standalone grid follows the browser window. Inside `Shell`, it
 * follows `Main`, which is the shell's one vertical scroll region.
 * It never creates a scroll box of its own. The cost is
 * `scrollMargin`: the virtualizer has to be told how far down its
 * scroll owner the grid starts, which is measured below.
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

  const rowCount = Math.ceil(items.length / drawnColumns)

  /**
   * Main owns vertical scrolling inside an app Shell. Older pages
   * and a standalone grid still use the window. Resolve the owner
   * from the actual tree rather than making every app wire a ref
   * between two Charcuterie components.
   */
  const [scrollOwner, setScrollOwner] =
    useState<ScrollOwner | null>(null)

  useLayoutEffect(() => {
    const element = layout.containerRef.current

    if (!element) {
      return
    }

    setScrollOwner(findScrollOwner(element))
  }, [layout.containerRef])

  const gridProps: GridWindowProps<Item> = {
    drawnColumns,
    gap,
    getItemKey,
    itemBlockSize,
    items,
    label,
    overscanRows,
    renderItem,
    rowCount,
  }

  return (
    <div
      className={toClassName(
        "flex justify-center",
        className,
      )}
      ref={layout.containerRef}
    >
      {scrollOwner?.kind === "element" ? (
        <ElementGrid
          {...gridProps}
          scrollOwner={scrollOwner}
        />
      ) : scrollOwner?.kind === "window" ? (
        <WindowGrid {...gridProps} />
      ) : null}
    </div>
  )
}
