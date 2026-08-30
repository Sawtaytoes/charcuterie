import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback } from "react"

import { GridRows } from "./GridRows.tsx"
import { useScrollMargin } from "./virtualizedGridScroll.ts"
import type {
  GridWindowProps,
  ScrollOwner,
} from "./virtualizedGridTypes.ts"

export const ElementGrid = <Item,>(
  props: GridWindowProps<Item> & {
    scrollOwner: Extract<ScrollOwner, { kind: "element" }>
  },
) => {
  const { gridElement, scrollMargin } = useScrollMargin(
    props.scrollOwner,
  )

  const measureRow = useCallback(
    (element: Element) =>
      element.getBoundingClientRect().height + props.gap,
    [props.gap],
  )

  const rowVirtualizer = useVirtualizer({
    count: props.rowCount,
    estimateSize: () => props.itemBlockSize + props.gap,
    getScrollElement: () => props.scrollOwner.element,
    measureElement: measureRow,
    overscan: props.overscanRows,
    scrollMargin,
  })

  return (
    <GridRows
      {...props}
      gridElement={gridElement}
      measureElement={rowVirtualizer.measureElement}
      scrollMargin={scrollMargin}
      totalSize={rowVirtualizer.getTotalSize()}
      virtualRows={rowVirtualizer.getVirtualItems()}
    />
  )
}
