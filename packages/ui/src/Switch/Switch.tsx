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
  /**
   * Shows the state at full contrast but refuses to flip it — a
   * setting you may read here and change elsewhere. Unlike
   * `isDisabled` it does not dim, and it announces `aria-readonly`.
   */
  isReadOnly?: boolean
  /** The visible text, and the switch's accessible name. */
  label: ReactNode
  onChange?: (isChecked: boolean) => void
  size?: ControlSize
}

// Track and thumb are sized so `p-1` (4px) breathes evenly on every
// side and the thumb is centred by arithmetic, not by eye: inner
// height (track − 2·padding) equals the thumb, and the on-translate is
// (track width − 2·padding − thumb). Break one of those and the thumb
// clips an edge, which is what the first cut did.
const TRACK_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "h-5 w-9",
  md: "h-6 w-11",
  lg: "h-7 w-14",
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
  sm: "translate-x-4",
  md: "translate-x-5",
  lg: "translate-x-7",
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
 * ### The thumb is one colour, the track carries the state
 *
 * `bg-surface-raised` in both positions — the knob is the same object
 * sliding, not two differently-painted dots, which is what the first
 * cut looked like when off was `content-secondary` and on was
 * `on-solid`. A themed system has no single colour that is "light" in
 * both schemes, so consistency lives *within* a scheme: `surface-raised`
 * is a white knob in a light one and a raised charcoal knob in a dark
 * one, off and on identical either way. The **track** shows the state —
 * `bg-intent-accent-solid` on, `bg-surface-sunken` with a `ring-2`
 * outline off — which is where a switch's state belongs, and the ring
 * gives the off track the defined edge a bare well would miss on a pale
 * theme.
 */
export const Switch = ({
  className,
  isChecked = false,
  isDisabled = false,
  isReadOnly = false,
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
        // Disabled turns the whole control down with `opacity-60`, the
        // same family treatment as `Checkbox` and `RadioGroup` — the
        // track keeps its full-contrast state colour underneath.
        isDisabled && "opacity-60",
        className,
      )}
    >
      <button
        aria-checked={isOn}
        aria-labelledby={labelId}
        aria-readonly={isReadOnly || undefined}
        className={toClassName(
          // `p-1` is the breathing room; `ring-inset` draws the off
          // outline without changing the box size, so the centring
          // arithmetic above stays exact.
          "inline-flex shrink-0 items-center rounded-full p-1 transition-colors duration-(--duration-fast) ease-standard",
          // The track carries the state at full contrast whether or not
          // it is disabled; `opacity-60` on the wrapper does the dimming.
          // Read-only swaps the accent for the neutral intent and softens
          // the off outline — readable, plainly not an actionable accent,
          // the same language as `Checkbox` and `RadioGroup`.
          isReadOnly
            ? isOn
              ? "bg-intent-neutral-solid"
              : "bg-surface-sunken ring-2 ring-border-default ring-inset"
            : isOn
              ? "bg-intent-accent-solid"
              : "bg-surface-sunken ring-2 ring-border-strong ring-inset",
          isDisabled
            ? "cursor-not-allowed"
            : isReadOnly
              ? "cursor-default"
              : "cursor-pointer",
          TRACK_SIZE_CLASS[size],
          FOCUS_RING_CLASS,
        )}
        disabled={isDisabled}
        onClick={() => {
          // Read-only shows the state but will not flip it — the switch
          // owns its value, so the guard is just an early return.
          if (isReadOnly) {
            return
          }

          const isNextOn = !isOn

          setIsOn(isNextOn)

          onChange?.(isNextOn)
        }}
        role="switch"
        type="button"
      >
        <span
          className={toClassName(
            "rounded-full bg-surface-raised transition-transform duration-(--duration-fast) ease-standard",
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
