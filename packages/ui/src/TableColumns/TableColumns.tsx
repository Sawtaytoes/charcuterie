import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import { Checkbox } from "../Checkbox/Checkbox.tsx"
import { Popover } from "../Popover/Popover.tsx"
import { ReorderList } from "../ReorderList/ReorderList.tsx"

export type TableColumnChoice = {
  key: string
  label: string
  isVisible: boolean
  isRequired?: boolean
}
export type TableColumnsProps = {
  columns: readonly TableColumnChoice[]
  onChange: (columns: TableColumnChoice[]) => void
  label?: string
}

/** Column visibility and ordering, with keyboard moves as the primary path. */
export const TableColumns = ({
  columns,
  onChange,
  label = "Columns",
}: TableColumnsProps) => {
  const [isVisible, setIsVisible] = useState(false)
  return (
    <Popover
      heading="Table columns"
      isVisible={isVisible}
      onDismiss={() => setIsVisible(false)}
      trigger={
        <Button
          intent="neutral"
          appearance="soft"
          onClick={() => setIsVisible(!isVisible)}
        >
          {label}
        </Button>
      }
    >
      <ReorderList
        label="Column order"
        items={columns}
        onReorder={(from, to) => {
          const next = [...columns]
          const [column] = next.splice(from, 1)
          next.splice(to, 0, column)
          onChange(next)
        }}
        renderItem={({ item, isFirst, isLast, moveBy }) => (
          <div className="flex flex-wrap items-center justify-between gap-2 py-1">
            <Checkbox
              label={item.label}
              isChecked={item.isVisible}
              isDisabled={item.isRequired}
              onChange={(isChecked) =>
                onChange(
                  columns.map((column) =>
                    column.key === item.key
                      ? { ...column, isVisible: isChecked }
                      : column,
                  ),
                )
              }
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                intent="neutral"
                appearance="ghost"
                aria-label={`Move ${item.label} earlier`}
                isDisabled={isFirst}
                onClick={() => moveBy(-1)}
              >
                Earlier
              </Button>
              <Button
                size="sm"
                intent="neutral"
                appearance="ghost"
                aria-label={`Move ${item.label} later`}
                isDisabled={isLast}
                onClick={() => moveBy(1)}
              >
                Later
              </Button>
            </div>
          </div>
        )}
      />
    </Popover>
  )
}
