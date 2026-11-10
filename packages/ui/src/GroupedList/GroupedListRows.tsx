import type { ReactNode } from "react"

import { useListMotion } from "../Motion/useListMotion.ts"
import type {
  GroupedListItem,
  GroupedListSize,
} from "./GroupedList.tsx"
import { GroupedListRow } from "./GroupedListRow.tsx"

/**
 * One group's rows, in their own component so each group can hold the
 * `useListMotion` hook: an added row enters, a removed one leaves, and
 * the rest slide, which a `map` over groups cannot do inline.
 */
export const GroupedListRows = ({
  headingId,
  isTextTruncated,
  items,
  onExitEnd,
  size,
}: {
  headingId: string
  isTextTruncated: boolean
  /** A row finished leaving; the groups below are about to move. */
  onExitEnd: () => void
  items: readonly GroupedListItem[]
  size: GroupedListSize
}): ReactNode => {
  const { entries } = useListMotion({
    getKey: (item: GroupedListItem) => item.key,
    items,
    onExitEnd,
  })

  return (
    <ul
      aria-labelledby={headingId}
      className="m-0 flex list-none flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-surface-raised p-0"
    >
      {entries.map(({ item, key, motionProps }) => (
        <GroupedListRow
          isTextTruncated={isTextTruncated}
          item={item}
          key={key}
          motionProps={motionProps}
          size={size}
        />
      ))}
    </ul>
  )
}
