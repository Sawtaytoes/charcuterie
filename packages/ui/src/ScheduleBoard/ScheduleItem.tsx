import type { CategoricalIndex } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import {
  CATEGORICAL_APPEARANCE_CLASS,
  CATEGORICAL_HOVER_CLASS,
} from "../categoricalStyles.ts"
import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type ScheduleEntry = {
  key: string
  dayKey: string
  title: string
  timeLabel: string
  sourceLabel: string
  sourceMarker?: string
  categorical?: CategoricalIndex
  /** Minutes since the start of this displayed day. Null is the untimed row. */
  startMinute: number | null
  endMinute: number | null
}

export const ScheduleItem = ({
  item,
  isClipped = false,
  onSelect,
}: {
  item: ScheduleEntry
  isClipped?: boolean
  onSelect?: (key: string) => void
}): ReactNode => {
  const categorical = item.categorical ?? 1
  const label = `${item.timeLabel}, ${item.title}, ${item.sourceLabel}`
  const content = (
    <>
      <span className="flex items-baseline justify-between gap-1">
        <strong className="min-w-0 wrap-anywhere text-sm leading-tight tabular-nums">
          {item.timeLabel}
        </strong>
        {item.sourceMarker ? (
          <span aria-hidden="true" className="text-xs">
            {item.sourceMarker}
          </span>
        ) : null}
      </span>
      <span
        className={
          isClipped
            ? "line-clamp-2 text-sm leading-tight"
            : "wrap-anywhere text-sm leading-tight"
        }
      >
        {item.title}
      </span>
    </>
  )
  const className = toClassName(
    "flex w-full min-w-0 flex-col gap-1 overflow-hidden rounded-md border p-2 text-start",
    isClipped ? "h-full" : undefined,
    CATEGORICAL_APPEARANCE_CLASS[categorical].soft,
    onSelect
      ? CATEGORICAL_HOVER_CLASS[categorical].soft
      : undefined,
    FOCUS_RING_CLASS,
  )
  return onSelect ? (
    <button
      aria-label={label}
      className={className}
      onClick={() => {
        onSelect(item.key)
      }}
      title={label}
      type="button"
    >
      {content}
    </button>
  ) : (
    <article
      aria-label={label}
      className={className}
      title={label}
    >
      {content}
    </article>
  )
}
