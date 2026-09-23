import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { Card, type CardProps } from "../Card/Card.tsx"
import { INTENT_APPEARANCE_CLASS } from "../intentStyles.ts"
import { ProgressBar } from "../ProgressBar/ProgressBar.tsx"
import { toClassName } from "../toClassName.ts"

export type ProgressCardMetric = {
  label: string
  value: ReactNode
}

export type ProgressCardLayout = "band" | "hierarchy"

export type ProgressCardProps = Omit<
  CardProps,
  "heading" | "footer"
> & {
  "aria-label": string
  /** App-owned identity: a title, an identifier, or a format mark. */
  header: ReactNode
  /** Whole-card intent is independent of the progress fill. */
  intent?: IntentName
  isIndeterminate?: boolean
  isValueEmphasized?: boolean
  layout?: ProgressCardLayout
  max?: number
  media?: ReactNode
  metrics?: readonly ProgressCardMetric[]
  progressIntent?: IntentName
  progressLabel: string
  status?: string
  value?: number
  /** App-formatted percentage or terminal state; never inferred from intent. */
  valueText: string
}

/** A progress-first card. The app owns state, formatting, actions, and diagnosis. */
export const ProgressCard = ({
  actions,
  children,
  className,
  header,
  intent = "neutral",
  isIndeterminate = false,
  isValueEmphasized = true,
  layout = "band",
  max,
  media,
  metrics = [],
  progressIntent = "accent",
  progressLabel,
  status,
  value,
  valueText,
  ...cardProps
}: ProgressCardProps): ReactNode => {
  const headline = (
    <div
      className={toClassName(
        "relative flex flex-wrap items-end justify-between gap-2",
        layout === "band" ? "p-3" : "mb-3",
      )}
    >
      {status ? (
        <span className="min-w-0 wrap-anywhere font-medium text-content-secondary text-sm">
          {status}
        </span>
      ) : null}
      <span
        className={toClassName(
          "min-w-0 wrap-anywhere text-end tabular-nums",
          isValueEmphasized
            ? "font-bold text-4xl leading-none tracking-tight cq-sm:text-[3.25rem]"
            : "font-semibold text-xl",
        )}
      >
        {valueText}
      </span>
    </div>
  )

  return (
    <Card
      {...cardProps}
      className={toClassName(
        "relative rounded-2xl",
        intent === "neutral"
          ? undefined
          : INTENT_APPEARANCE_CLASS[intent].soft,
        "text-content-primary",
        className,
      )}
    >
      <div className="flex gap-3.5">
        {media ? (
          <div className="flex shrink-0 flex-col items-start gap-2">
            {media}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 basis-40 wrap-anywhere">
              {header}
            </div>
            {actions ? (
              <div className="relative z-10 flex flex-wrap items-center gap-2">
                {actions}
              </div>
            ) : null}
          </div>
          <div className="mt-5">
            {layout === "hierarchy" ? headline : null}
            <ProgressBar
              intent={progressIntent}
              isIndeterminate={isIndeterminate}
              label={progressLabel}
              max={max}
              overlay={
                layout === "band" ? headline : undefined
              }
              value={value}
            />
          </div>
          {metrics.length > 0 ? (
            <dl className="mt-3 grid grid-cols-1 gap-2 cq-sm:grid-cols-3">
              {metrics.map(
                ({ label, value: metricValue }) => (
                  <div
                    className="flex items-baseline justify-between gap-2 rounded-lg border border-border-subtle bg-surface-sunken/70 px-2.5 py-2 cq-sm:block"
                    key={label}
                  >
                    <dt className="min-w-0 wrap-anywhere font-semibold text-content-muted text-xs uppercase tracking-wide">
                      {label}
                    </dt>
                    <dd className="m-0 min-w-0 wrap-anywhere font-semibold text-lg tabular-nums cq-sm:mt-1">
                      {metricValue ?? "—"}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          ) : null}
          {children}
        </div>
      </div>
    </Card>
  )
}
