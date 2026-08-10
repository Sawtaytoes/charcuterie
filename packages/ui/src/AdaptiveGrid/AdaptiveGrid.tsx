import type { ReactNode } from "react"
import { Children } from "react"

import { toClassName } from "../toClassName.ts"
import { getContentMaxInlineSize } from "./chooseColumns.ts"
import type { BlockSizeResolver } from "./useAdaptiveColumns.ts"
import { useAdaptiveColumns } from "./useAdaptiveColumns.ts"

export type AdaptiveGridProps = {
  /**
   * Where the available block size is read from. Defaults to the
   * viewport, which is the only thing that can answer "will this
   * scroll".
   */
  blockSizeResolver?: BlockSizeResolver
  children: ReactNode
  /**
   * Everything down the page that is not this grid, in CSS px —
   * header, rails, filter rows. Subtracted before asking how many
   * items stack.
   */
  chromeBlockSize?: number
  className?: string
  /**
   * Draw this many columns instead of the automatic answer — the
   * manual override, for a picker or a page that hoisted
   * `useAdaptiveColumns` itself.
   */
  columns?: number
  /**
   * One item's block size in CSS px. **The one genuinely
   * app-specific number.** Measure it off a running page and err
   * high: a page that scrolls when it did not have to is the
   * complaint this component exists to answer.
   */
  itemBlockSize: number
  /**
   * How many items to lay out. Defaults to the number of children,
   * and is worth passing explicitly when the rendered count churns
   * — a grid that reflowed every time one item finished loading
   * would be worse than one that is an item out.
   */
  itemCount?: number
  /** The most columns the automatic answer will take. */
  maxColumns?: number
  /** The narrowest a column may be, in CSS px. */
  minColumnInlineSize?: number
  /**
   * The `localStorage` key a manual choice is remembered under.
   * Namespace it to the app; omit it and nothing is written.
   */
  storageKey?: string
}

/**
 * A wrapping grid that spends height before it spends width.
 *
 * The fleet's grids are `auto-fill, minmax()`: they take every
 * column the window allows and land on seven items strung across an
 * ultrawide. This one adds a column only when the items will not
 * stack inside the viewport, and caps the content at a reading
 * measure the rest of the time —
 *
 * > "The idea is that, if you're going to vertically scroll, it's
 * > best to widen the displayed items. If not, then keep them in a
 * > smaller grid, so they all still fit on screen."
 *
 * The rule itself is `chooseColumns`; the measuring is
 * `useAdaptiveColumns`. This is the markup, and it exists because
 * three separate things about that markup are easy to get wrong and
 * silent when you do.
 *
 * ### Two boxes, and why it is not one
 *
 * The outer box is measured and **never capped**; the inner box
 * carries the cap and the tracks. Collapsing them is a real bug
 * with no error message: the cap narrows the content when the item
 * count is low, so an element that is both measured and capped
 * feeds the fold its own output and can never widen again. One
 * column, forever.
 *
 * ### `min-w-0` on every child
 *
 * `[&>*]:min-w-0`, because a grid item's automatic minimum size is
 * `min-content` — so one long unbroken string (a file path, a URL)
 * pushes its track wider than its share and shoves the whole grid
 * out of the viewport. The rule that stops it has to be on the
 * children, and they belong to the caller, so it is applied from
 * here rather than asked for.
 *
 * ### The tracks are an inline style
 *
 * `repeat(N, minmax(0, 1fr))` is interpolated, which a className
 * may not be: Tailwind v4 scans source *text* for complete class
 * strings, so `grid-cols-${columns}` generates nothing at all — no
 * error, no warning, an unstyled element. A class-per-count would
 * need every count to survive the scan; an inline style needs
 * none.
 */
export const AdaptiveGrid = ({
  blockSizeResolver,
  children,
  chromeBlockSize,
  className,
  columns,
  itemBlockSize,
  itemCount,
  maxColumns,
  minColumnInlineSize,
  storageKey,
}: AdaptiveGridProps): ReactNode => {
  const layout = useAdaptiveColumns({
    blockSizeResolver,
    chromeBlockSize,
    itemBlockSize,
    itemCount: itemCount ?? Children.count(children),
    maxAutoColumns: maxColumns,
    minColumnInlineSize,
    storageKey,
  })

  const drawnColumns = columns ?? layout.columns

  // Folded from what is DRAWN rather than read off the hook, so an
  // override widens the page cap with it. A four-column grid inside
  // a one-column cap is the same bug as no cap at all, upside down.
  const contentMaxInlineSize = getContentMaxInlineSize({
    columns: drawnColumns,
  })

  return (
    <div
      className={toClassName("flex justify-center", className)}
      ref={layout.containerRef}
    >
      <div
        className="grid w-full gap-4 [&>*]:min-w-0"
        style={{
          gridTemplateColumns: `repeat(${drawnColumns}, minmax(0, 1fr))`,
          maxInlineSize: contentMaxInlineSize,
        }}
      >
        {children}
      </div>
    </div>
  )
}
