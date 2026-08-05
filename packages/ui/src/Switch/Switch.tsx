import { useUniqueId } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useState } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type SwitchProps = {
  className?: string
  /**
   * **Initial** only. The `Switch` owns it from then on — the same
   * uncontrolled contract as `Checkbox` and `SegmentedControl`, so
   * `onChange` reports the new state and there is no controlled
   * `checked` prop to keep in step.
   */
  isChecked?: boolean
  isDisabled?: boolean
  /** The visible text, and the switch's accessible name. */
  label: ReactNode
  onChange?: (isChecked: boolean) => void
  size?: ControlSize
}

const TRACK_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "h-4 w-7",
  md: "h-5 w-9",
  lg: "h-6 w-11",
}

const THUMB_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
}

const THUMB_ON_TRANSLATE_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "translate-x-3",
  md: "translate-x-4",
  lg: "translate-x-5",
}

const TEXT_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "text-sm",
  md: "text-md",
  lg: "text-lg",
}

/**
 * A boolean that takes effect the moment it is flipped — a setting,
 * not a form value.
 *
 * A `Checkbox` and a `Switch` are the same state kind and a
 * different affordance, and the split is meaning rather than looks:
 * a checkbox is a value you submit ("I agree"), a switch is a state
 * you toggle and live with immediately ("dark mode on"). ARIA gives
 * the second its own role, and a screen reader announces "on/off"
 * for a `switch` where it announces "checked/unchecked" for a
 * checkbox.
 *
 * ### A `button role="switch"`, not an `input`
 *
 * The sliding track and thumb are the whole point of the affordance,
 * and a `<button>` styles them without fighting a native control's
 * own rendering. It carries `aria-checked`, `aria-labelledby`, and
 * nothing else the browser would try to own. The value lives in
 * React state seeded once from `isChecked` — the switch is the
 * store, the same as the DOM is for `Checkbox`.
 *
 * ### The thumb changes colour, not just position
 *
 * On `bg-intent-accent-solid`, off on `bg-surface-sunken`, and the
 * thumb picks a token that contrasts with whichever it is sitting on
 * — so the state survives a `daylight` theme in sunlight, which a
 * thumb that only *moved* would not read at a glance.
 */
export const Switch = ({
  className,
  isChecked = false,
  isDisabled = false,
  label,
  onChange,
  size = "md",
}: SwitchProps): ReactNode => {
  const [isOn, setIsOn] = useState(isChecked)

  const labelId = useUniqueId()

  return (
    <span
      className={toClassName(
        "inline-flex items-center gap-2 text-content-secondary select-none",
        TEXT_SIZE_CLASS[size],
        isDisabled && "text-content-disabled",
        className,
      )}
    >
      <button
        aria-checked={isOn}
        aria-labelledby={labelId}
        className={toClassName(
          // The border stays transparent when on so the accent fill
          // reaches the edge, and becomes a hairline when off so an
          // empty track is not a shapeless well on a pale theme.
          "inline-flex shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-(--duration-fast) ease-standard",
          // One `bg-`/`border-` pair, chosen by state — two utilities
          // of the same specificity do not resolve by class-list
          // order, so disabled has to win as the only one written.
          isDisabled
            ? "cursor-not-allowed border-border-subtle bg-surface-sunken"
            : isOn
              ? "border-transparent bg-intent-accent-solid"
              : "border-border-strong bg-surface-sunken",
          TRACK_SIZE_CLASS[size],
          FOCUS_RING_CLASS,
        )}
        disabled={isDisabled}
        onClick={() => {
          const isNextOn = !isOn

          setIsOn(isNextOn)

          onChange?.(isNextOn)
        }}
        role="switch"
        type="button"
      >
        <span
          className={toClassName(
            "rounded-full transition-transform duration-(--duration-fast) ease-standard",
            isDisabled
              ? "bg-content-disabled"
              : isOn
                ? "bg-intent-accent-on-solid"
                : "bg-content-secondary",
            isOn
              ? THUMB_ON_TRANSLATE_CLASS[size]
              : "translate-x-0",
            THUMB_SIZE_CLASS[size],
          )}
        />
      </button>

      <span id={labelId}>{label}</span>
    </span>
  )
}
