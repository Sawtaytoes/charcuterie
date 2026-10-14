import type { ReactNode } from "react"

import { AdaptiveGrid } from "../AdaptiveGrid/AdaptiveGrid.tsx"
import { useTrackMeasurements } from "../LaneTimeline/useTrackMeasurements.ts"
import { toClassName } from "../toClassName.ts"
import { ScheduleDayCards } from "./ScheduleDayCards.tsx"
import { ScheduleHourGrid } from "./ScheduleHourGrid.tsx"
import {
  type ScheduleEntry,
  ScheduleItem,
} from "./ScheduleItem.tsx"

export type ScheduleDay = {
  key: string
  label: string
  dateLabel: string
  isCurrent?: boolean
  isQuiet?: boolean
  emptyLabel?: string
}

export type ScheduleBand = {
  key: string
  label: string
  detail?: string
  startMinute: number
  endMinute: number
}
export type ScheduleLayout = "bands" | "hours" | "cards"
export type ScheduleBoardProps = {
  label: string
  days: readonly ScheduleDay[]
  items: readonly ScheduleEntry[]
  bands: readonly ScheduleBand[]
  layout?: ScheduleLayout
  className?: string
  onSelect?: (key: string) => void
  formatHour?: (minute: number) => string
  /** Axis height, in pixels. A minimum preserves short appointments. */
  hourGridBlockSize?: number
}

/** Aligned time bands or an exact hour axis; folds to day cards on measured width. */
export const ScheduleBoard = ({
  label,
  days,
  items,
  bands,
  layout = "bands",
  className,
  onSelect,
  formatHour = (minute) => `${Math.floor(minute / 60)}:00`,
  hourGridBlockSize = 480,
}: ScheduleBoardProps): ReactNode => {
  const { trackRef, inlineSize, fontSize, isMeasured } =
    useTrackMeasurements()
  const isFolded =
    isMeasured &&
    inlineSize < (days.length * 8 + 4) * fontSize
  const template = `5.5rem ${days.map((day) => (day.isQuiet ? "minmax(0, .65fr)" : "minmax(0, 1fr)")).join(" ")}`
  const dayHeader = (
    <div
      className="grid gap-2 border-b border-border-subtle pb-2"
      style={{ gridTemplateColumns: template }}
    >
      <span />
      {days.map((day) => (
        <div
          className={toClassName(
            "min-w-0 wrap-anywhere",
            day.isCurrent
              ? "text-intent-accent-content"
              : "text-content-secondary",
          )}
          key={day.key}
        >
          <span className="block text-sm">
            {day.label}
            {day.isCurrent ? " · Today" : ""}
          </span>
          <strong className="text-2xl leading-tight">
            {day.dateLabel}
          </strong>
        </div>
      ))}
    </div>
  )
  const untimed = items.filter(
    (item) => item.startMinute === null,
  )
  return (
    <section
      aria-label={label}
      className={toClassName(
        "@container flex min-w-0 flex-col gap-2",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="h-0"
        ref={trackRef}
      />
      {layout === "cards" || isFolded ? (
        <AdaptiveGrid
          itemBlockSize={320}
          itemCount={days.length}
          maxColumns={7}
          minColumnInlineSize={230}
        >
          {days.map((day) => (
            <ScheduleDayCards
              day={day}
              items={items.filter(
                (item) => item.dayKey === day.key,
              )}
              key={day.key}
              onSelect={onSelect}
            />
          ))}
        </AdaptiveGrid>
      ) : (
        <>
          {dayHeader}
          {untimed.length > 0 ? (
            <div
              className="grid gap-2 border-b border-border-subtle pb-2"
              style={{ gridTemplateColumns: template }}
            >
              <span className="text-xs text-content-muted">
                All day / due
              </span>
              {days.map((day) => (
                <div
                  className="flex min-w-0 flex-col gap-2"
                  key={day.key}
                >
                  {untimed
                    .filter(
                      (item) => item.dayKey === day.key,
                    )
                    .map((item) => (
                      <ScheduleItem
                        item={item}
                        key={item.key}
                        onSelect={onSelect}
                      />
                    ))}
                </div>
              ))}
            </div>
          ) : null}
          {layout === "hours" ? (
            <ScheduleHourGrid
              blockSize={hourGridBlockSize}
              days={days}
              formatHour={formatHour}
              items={items}
              onSelect={onSelect}
              template={template}
            />
          ) : (
            bands.map((band) => (
              // biome-ignore lint/a11y/useSemanticElements: this names schedule entries, not form controls.
              <div
                aria-label={band.label}
                className="grid gap-2 border-b border-border-subtle pb-2"
                key={band.key}
                role="group"
                style={{ gridTemplateColumns: template }}
              >
                <div className="min-w-0 wrap-anywhere text-xs text-content-secondary">
                  <strong className="block">
                    {band.label}
                  </strong>
                  <span className="text-content-muted">
                    {band.detail}
                  </span>
                </div>
                {days.map((day) => (
                  <div
                    className="flex min-w-0 flex-col gap-2"
                    key={day.key}
                  >
                    {items
                      .filter(
                        (item) =>
                          item.dayKey === day.key &&
                          item.startMinute !== null &&
                          item.startMinute >=
                            band.startMinute &&
                          item.startMinute < band.endMinute,
                      )
                      .sort(
                        (first, second) =>
                          (first.startMinute ?? 0) -
                          (second.startMinute ?? 0),
                      )
                      .map((item) => (
                        <ScheduleItem
                          item={item}
                          key={item.key}
                          onSelect={onSelect}
                        />
                      ))}
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}
    </section>
  )
}
