import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { useCallback } from "react"

import { GridRows } from "./GridRows.tsx"
import { useScrollMargin } from "./virtualizedGridScroll.ts"
import type { GridWindowProps } from "./virtualizedGridTypes.ts"

export const WindowGrid = <Item,>(
  props: GridWindowProps<Item>,
) => {
  const { gridElement, scrollMargin } = useScrollMargin({
    kind: "window",
  })

  const measureRow = useCallback(
    (element: Element) =>
      element.getBoundingClientRect().height + props.gap,
    [props.gap],
  )

  const rowVirtualizer = useWindowVirtualizer({
    count: props.rowCount,
    estimateSize: () => props.itemBlockSize + props.gap,
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
