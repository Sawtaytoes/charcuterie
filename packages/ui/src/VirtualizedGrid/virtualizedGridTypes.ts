import type { VirtualItem } from "@tanstack/react-virtual"
import type { ReactNode, RefObject } from "react"

export type ScrollOwner =
  | { kind: "element"; element: HTMLElement }
  | { kind: "window" }

export type GridWindowProps<Item> = {
  drawnColumns: number
  gap: number
  getItemKey?: (
    item: Item,
    index: number,
  ) => string | number
  itemBlockSize: number
  items: readonly Item[]
  label?: string
  overscanRows: number
  renderItem: (item: Item, index: number) => ReactNode
  rowCount: number
}

export type GridRowsProps<Item> = Omit<
  GridWindowProps<Item>,
  "itemBlockSize" | "overscanRows" | "rowCount"
> & {
  gridElement: RefObject<HTMLUListElement | null>
  measureElement: (element: Element | null) => void
  scrollMargin: number
  totalSize: number
  virtualRows: VirtualItem[]
}
