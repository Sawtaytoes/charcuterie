import type { CategoricalIndex } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { CATEGORICAL_APPEARANCE_CLASS } from "../categoricalStyles.ts"
import { toClassName } from "../toClassName.ts"

export type WeekdayIndicatorProps = {
  /** Monday is 0, Sunday is 6. These are observed weekdays, not an RRULE. */
  days: readonly number[]
  categorical?: CategoricalIndex
  className?: string
  label?: string
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

/** A named, noninteractive seven-day pattern, with letters as well as color. */
export const WeekdayIndicator = ({
  days,
  categorical = 1,
  className,
  label = "Repeats",
}: WeekdayIndicatorProps): ReactNode => (
  <span
    aria-label={`${label}: ${DAYS.filter((_day, index) => days.includes(index)).join(", ") || "no weekdays"}`}
    className={toClassName(
      "inline-flex flex-wrap gap-1",
      className,
    )}
    role="img"
    title={`${label}: ${DAYS.filter((_day, index) => days.includes(index)).join(", ") || "no weekdays"}`}
  >
    {DAYS.map((day, index) => (
      <span
        aria-hidden="true"
        className={toClassName(
          "flex size-6 items-center justify-center rounded-full border text-xs font-medium",
          days.includes(index)
            ? CATEGORICAL_APPEARANCE_CLASS[categorical]
                .solid
            : "border-border-subtle text-content-muted",
        )}
        key={day}
      >
        {day.slice(0, 1)}
      </span>
    ))}
  </span>
)
