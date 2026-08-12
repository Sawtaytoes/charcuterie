import type { ReactNode } from "react"

import { IconButton } from "../IconButton/IconButton.tsx"

export type QueryBuilderRowProps<Leaf> = {
  /** The accessible name of the row's delete control. */
  label: string
  nodeId: string
  onChange: (value: Leaf) => void
  onRemove: () => void
  renderLeaf: (args: {
    nodeId: string
    onChange: (value: Leaf) => void
    value: Leaf
  }) => ReactNode
  value: Leaf
}

/**
 * A single leaf row: the app's own leaf UI, plus the builder's delete
 * control. Its own file for the same reason `ListboxOption` is —
 * rendered inside the group's `.map`, so it cannot be an inline
 * component — and it is a member file (`QueryBuilder*.tsx`, not
 * `QueryBuilder/QueryBuilder.tsx`), so it stays out of the barrel and
 * the component count by rule.
 *
 * The delete control is an `IconButton` because a bare glyph is not an
 * accessible name; its required `label` is what makes each row's
 * remove button findable and unique per condition.
 */
export const QueryBuilderRow = <Leaf,>({
  label,
  nodeId,
  onChange,
  onRemove,
  renderLeaf,
  value,
}: QueryBuilderRowProps<Leaf>): ReactNode => (
  <div className="flex items-start gap-2">
    <div className="grow">
      {renderLeaf({ nodeId, onChange, value })}
    </div>

    <IconButton
      appearance="ghost"
      intent="danger"
      label={label}
      onClick={onRemove}
      size="sm"
    >
      ✕
    </IconButton>
  </div>
)
