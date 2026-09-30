import type { ReactNode } from "react"

import type { ScheduleDay } from "./ScheduleBoard.tsx"
import {
  type ScheduleEntry,
  ScheduleItem,
} from "./ScheduleItem.tsx"
import { placeScheduleIntervals } from "./scheduleGeometry.ts"

export const ScheduleHourGrid = ({
  blockSize,
  days,
  formatHour,
  items,
  onSelect,
  template,
}: {
  blockSize: number
  days: readonly ScheduleDay[]
  formatHour: (minute: number) => string
  items: readonly ScheduleEntry[]
  onSelect?: (key: string) => void
  template: string
}): ReactNode => {
  const timed = items.filter(
    (item) => item.startMinute !== null,
  )
  const start =
    Math.floor(
      Math.min(
        480,
        ...timed.map((item) => item.startMinute ?? 480),
      ) / 60,
    ) * 60
  const end = Math.min(
    1440,
    Math.ceil(
      Math.max(
        1080,
        ...timed.map(
          (item) =>
            item.endMinute ??
            (item.startMinute ?? 1080) + 30,
        ),
      ) / 60,
    ) * 60,
  )
  const height = Math.max(360, blockSize)
  const scale = height / Math.max(60, end - start)
  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_unused, index) => start + index * 60,
  )
  return (
    <div
      className="grid gap-2 pb-6"
      style={{ gridTemplateColumns: template }}
    >
      <div
        className="relative text-xs text-content-muted tabular-nums"
        style={{ blockSize: height }}
      >
        {hours.map((minute) => (
          <span
            className="absolute start-0"
            key={minute}
            style={{
              insetBlockStart: (minute - start) * scale,
            }}
          >
            {formatHour(minute)}
          </span>
        ))}
      </div>
      {days.map((day) => {
        const entries = timed.filter(
          (item) => item.dayKey === day.key,
        )
        // Minimum painted height participates in packing, so short adjacent items cannot hide each other.
        const placed = placeScheduleIntervals(
          entries.map((item) => ({
            key: item.key,
            startMinute: item.startMinute ?? 0,
            endMinute: Math.max(
              item.endMinute ??
                (item.startMinute ?? 0) + 30,
              (item.startMinute ?? 0) + 30 / scale,
            ),
          })),
        )
        return (
          // biome-ignore lint/a11y/useSemanticElements: this names schedule entries, not form controls.
          <div
            aria-label={`${day.label}, ${day.dateLabel}`}
            className="relative min-w-0 border-s border-border-subtle"
            key={day.key}
            role="group"
            style={{ blockSize: height }}
          >
            {hours.map((minute) => (
              <div
                aria-hidden="true"
                className="absolute w-full border-t border-border-subtle"
                key={minute}
                style={{
                  insetBlockStart: (minute - start) * scale,
                }}
              />
            ))}
            {placed.map((position) => {
              const item = entries.find(
                (entry) => entry.key === position.key,
              )
              return item ? (
                <div
                  className="absolute min-w-0 pe-1"
                  key={item.key}
                  style={{
                    insetBlockStart:
                      (position.startMinute - start) *
                      scale,
                    blockSize: Math.max(
                      30,
                      ((item.endMinute ??
                        position.startMinute + 30) -
                        position.startMinute) *
                        scale,
                    ),
                    insetInlineStart: `${(position.column / position.columnCount) * 100}%`,
                    inlineSize: `${100 / position.columnCount}%`,
                  }}
                >
                  <ScheduleItem
                    isClipped
                    item={item}
                    onSelect={onSelect}
                  />
                </div>
              ) : null
            })}
          </div>
        )
      })}
    </div>
  )
}
