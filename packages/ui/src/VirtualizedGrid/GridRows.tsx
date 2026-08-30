import { getContentMaxInlineSize } from "../AdaptiveGrid/chooseColumns.ts"
import type { GridRowsProps } from "./virtualizedGridTypes.ts"

/** The shared markup. Only the scroll observer differs between the two owners. */
export const GridRows = <Item,>({
  drawnColumns,
  gap,
  getItemKey,
  gridElement,
  items,
  label,
  measureElement,
  renderItem,
  scrollMargin,
  totalSize,
  virtualRows,
}: GridRowsProps<Item>) => {
  const firstRow = virtualRows[0]
  const lastRow = virtualRows[virtualRows.length - 1]

  // Everything scrolled past, and everything still to come. The two
  // numbers that stand in for the rows that do not exist.
  const paddingBlockStart = firstRow?.start ?? 0

  const paddingBlockEnd = lastRow
    ? Math.max(0, totalSize - lastRow.end)
    : 0

  return (
    <ul
      aria-label={label}
      className="grid w-full list-none p-0 [&>*]:min-w-0"
      ref={gridElement}
      style={{
        gap: `${gap}px`,
        gridTemplateColumns: `repeat(${drawnColumns}, minmax(0, 1fr))`,
        maxInlineSize: getContentMaxInlineSize({
          columns: drawnColumns,
        }),
        // Offset by `scrollMargin` because `start` is measured
        // from the top of the scroll owner, and this padding is
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
                  offset === 0 ? measureElement : undefined
                }
              >
                {renderItem(item, index)}
              </li>
            )
          })
      })}
    </ul>
  )
}
