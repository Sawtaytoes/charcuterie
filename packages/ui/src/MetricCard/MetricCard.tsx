import type { CategoricalIndex } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { Card, type CardProps } from "../Card/Card.tsx"
import { CATEGORICAL_CONTENT_CLASS } from "../categoricalStyles.ts"
import { toClassName } from "../toClassName.ts"

export type MetricCardProps = Omit<CardProps, "actions"> & {
  /** A stable category colour, independent of success/failure intent. */
  categorical?: CategoricalIndex
  /** App-supplied decoration; the visible heading names the metric. */
  icon?: ReactNode
  /** Already formatted by the app, including the unit when needed. */
  value: ReactNode
}

/** One prominent measure, a coloured icon and edge, and app-owned supporting content. */
export const MetricCard = ({
  categorical,
  children,
  icon,
  value,
  ...cardProps
}: MetricCardProps): ReactNode => (
  <Card
    {...cardProps}
    accentEdge={
      cardProps.accentEdge ??
      (categorical ? { categorical } : undefined)
    }
    actions={
      icon ? (
        <span
          aria-hidden="true"
          className={toClassName(
            "inline-flex size-7 items-center justify-center",
            categorical
              ? CATEGORICAL_CONTENT_CLASS[categorical]
              : undefined,
          )}
        >
          {icon}
        </span>
      ) : undefined
    }
  >
    <p className="min-w-0 wrap-anywhere font-semibold text-2xl tabular-nums">
      {value}
    </p>
    {children}
  </Card>
)
