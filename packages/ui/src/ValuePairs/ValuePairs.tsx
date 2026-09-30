import type { ReactNode } from "react"

import { toClassName } from "../toClassName.ts"

export type ValuePair = {
  id: string
  label: ReactNode
  value: ReactNode
}

export type ValuePairsProps = {
  className?: string
  items: readonly ValuePair[]
  label: string
}

/** Compact label-over-value pairs. Wrap whole pairs rather than splitting their units. */
export const ValuePairs = ({
  className,
  items,
  label,
}: ValuePairsProps): ReactNode => (
  <dl
    aria-label={label}
    className={toClassName(
      "m-0 flex flex-wrap gap-x-6 gap-y-3 text-start",
      className,
    )}
  >
    {items.map((item) => (
      <div
        className="flex min-w-0 flex-col gap-0.5"
        key={item.id}
      >
        <dt className="whitespace-nowrap text-content-secondary text-xs">
          {item.label}
        </dt>
        <dd className="m-0 whitespace-nowrap font-semibold text-content-primary text-lg tabular-nums">
          {item.value}
        </dd>
      </div>
    ))}
  </dl>
)
