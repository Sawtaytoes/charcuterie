import type { ReactNode } from "react"

import { Card } from "../Card/Card.tsx"
import type { ScheduleDay } from "./ScheduleBoard.tsx"
import {
  type ScheduleEntry,
  ScheduleItem,
} from "./ScheduleItem.tsx"

export const ScheduleDayCards = ({
  day,
  items,
  onSelect,
}: {
  day: ScheduleDay
  items: readonly ScheduleEntry[]
  onSelect?: (key: string) => void
}): ReactNode => (
  <Card padding="sm">
    <h3 className="font-semibold text-md">
      {day.label}, {day.dateLabel}
      {day.isCurrent ? " · Today" : ""}
    </h3>
    {items.length === 0 ? (
      <p className="text-sm text-content-muted">
        {day.emptyLabel ?? "Nothing scheduled"}
      </p>
    ) : (
      [...items]
        .sort(
          (first, second) =>
            (first.startMinute ?? -1) -
            (second.startMinute ?? -1),
        )
        .map((item) => (
          <ScheduleItem
            item={item}
            key={item.key}
            onSelect={onSelect}
          />
        ))
    )}
  </Card>
)
