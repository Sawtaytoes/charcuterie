import { useUniqueId } from "@charcuterie/logic"
import type { IntentName } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { INTENT_SOLID_FILL_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import type { ProgressThreshold } from "./progressValue.ts"
import {
  getProgressIntent,
  toProgressPercent,
  toProgressValue,
} from "./progressValue.ts"

export type ProgressBarSize = "lg" | "md" | "sm"

export type ProgressBarProps = Omit<
  ComponentPropsWithRef<"div">,
  "children"
> & {
  intent?: IntentName
  /**
   * Indeterminate means "working, no measurable progress yet" — not
   * zero and not unknown-therefore-full. rip-deck's is the
   * AACS/BD+ preamble: ~25 s of a real Blu-ray emitting nothing, in
   * which a full bar reads as a finished rip and an empty one as a
   * wedged drive.
   */
  isIndeterminate?: boolean
  isLabelVisible?: boolean
  isValueShown?: boolean
  /** Required. A progressbar with no name is a grey rectangle. */
  label: string
  max?: number
  size?: ProgressBarSize
  thresholds?: readonly ProgressThreshold[]
  value?: number
}

const TRACK_SIZE_CLASS: Record<ProgressBarSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
}

/**
 * The union of what the fleet has: rip-deck's ARIA and its
 * indeterminate sweep, plus threshold colours nobody has yet.
 *
 * Five repos hand-roll a progress bar and **only rip-deck's has
 * `role="progressbar"`** — the other four are a `<div>` with a
 * percentage width, invisible to assistive technology and to
 * `getByRole("progressbar")`.
 *
 * Three corrections to rip-deck's version, which is otherwise the
 * best in the fleet:
 *
 *  - **The role goes on the track, not the fill.** rip-deck puts
 *    `role="progressbar"` on the inner filled element, so the
 *    widget's box is the *filled portion* — a 4% rip is a
 *    progressbar 4px wide as far as AT and a Playwright bounding
 *    box are concerned.
 *  - **The name comes from a real label**, wired with
 *    `aria-labelledby` when it is visible and `VisuallyHidden` when
 *    it is not, rather than a hardcoded `aria-label` string that
 *    cannot be translated or reused.
 *  - **`aria-valuenow` is omitted while indeterminate**, which is
 *    what tells AT "unknown" rather than "zero". rip-deck gets this
 *    right by rendering a separate element; stating it on one
 *    element is the same answer without the duplication.
 */
export const ProgressBar = ({
  className,
  intent = "accent",
  isIndeterminate = false,
  isLabelVisible = false,
  isValueShown = false,
  label,
  max = 100,
  size = "md",
  thresholds,
  value = 0,
  ...divProps
}: ProgressBarProps): ReactNode => {
  const labelId = useUniqueId()

  const percent = toProgressPercent(value, max)

  const clampedValue = toProgressValue(value, max)

  const fillIntent = getProgressIntent(
    percent,
    intent,
    thresholds,
  )

  return (
    <div
      {...divProps}
      className={toClassName(
        "flex flex-col gap-1",
        className,
      )}
    >
      {isLabelVisible || isValueShown ? (
        <div className="flex items-baseline justify-between gap-2 text-sm">
          {isLabelVisible ? (
            <span
              className="text-content-secondary"
              id={labelId}
            >
              {label}
            </span>
          ) : (
            <VisuallyHidden id={labelId}>
              {label}
            </VisuallyHidden>
          )}

          {isValueShown && !isIndeterminate ? (
            <span className="text-content-muted tabular-nums">
              {percent}%
            </span>
          ) : null}
        </div>
      ) : (
        <VisuallyHidden id={labelId}>
          {label}
        </VisuallyHidden>
      )}

      <div
        aria-busy={isIndeterminate || undefined}
        aria-labelledby={labelId}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={
          isIndeterminate ? undefined : clampedValue
        }
        className={toClassName(
          "relative w-full overflow-hidden rounded-full bg-surface-sunken",
          TRACK_SIZE_CLASS[size],
        )}
        role="progressbar"
      >
        {isIndeterminate ? (
          <span
            className={toClassName(
              // The sweep animates `inset-inline-start`, so it runs
              // the other way in RTL for free — and its
              // reduced-motion fallback hatches the whole track
              // rather than parking at one end.
              "charcuterie-sweep absolute inset-y-0 w-2/5 rounded-full",
              INTENT_SOLID_FILL_CLASS[fillIntent],
            )}
          />
        ) : (
          <span
            className={toClassName(
              "block h-full rounded-full transition-[inline-size] duration-(--duration-normal) ease-standard",
              INTENT_SOLID_FILL_CLASS[fillIntent],
            )}
            style={{ inlineSize: `${percent}%` }}
          />
        )}
      </div>
    </div>
  )
}
