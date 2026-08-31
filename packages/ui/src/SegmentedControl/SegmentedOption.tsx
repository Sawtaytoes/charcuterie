import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect } from "react"

import { CONTROL_SIZE_CLASS } from "../controlStyles.ts"
import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { SegmentedItem } from "./SegmentedControl.tsx"

export type SegmentedOptionProps = {
  isChecked: boolean
  isFullWidth: boolean
  item: SegmentedItem
  onChoose: (value: string) => void
  /** `RovingFocus.register` — membership of the arrow-key group. */
  registerFocus: (value: string) => () => void
  /** `SinglePicker.register` — membership of the choice. */
  registerSelection: (value: string) => () => void
  size: ControlSize
  tabIndex: number
  trackElement: (
    value: string,
    element: HTMLButtonElement | null,
  ) => void
}

/**
 * Its own file for the same reason `TabTrigger` is: **both
 * registrations are effects**, and an effect cannot run in a loop.
 * Any member of a registering group ends up shaped like this.
 *
 * The checked option is filled rather than merely tinted. A
 * segmented control's whole job is to be readable at a glance from
 * across a room — rip-deck's lives above a nine-bay grid on a wall
 * display — and a one-shade difference does not survive that or a
 * `daylight` theme in sunlight.
 */
export const SegmentedOption = ({
  isChecked,
  isFullWidth,
  item,
  onChoose,
  registerFocus,
  registerSelection,
  size,
  tabIndex,
  trackElement,
}: SegmentedOptionProps): ReactNode => {
  const { isDisabled = false, label, value } = item

  useEffect(
    () => registerSelection(value),
    [registerSelection, value],
  )

  useEffect(() => {
    if (isDisabled) {
      return
    }

    return registerFocus(value)
  }, [isDisabled, registerFocus, value])

  return (
    // biome-ignore lint/a11y/useSemanticElements: `<input type="radio">` owns `checked` *and* owns arrow-key navigation within a `name` group. That is the self-owning-control conflict `Modal` already has with `<dialog>`, except here it collides with both state kinds at once — the browser and `SinglePicker` would each believe they hold the choice, and native roving would fight `RovingFocus`. APG's radio-group pattern exists for exactly this case.
    <button
      aria-checked={isChecked}
      className={toClassName(
        "cursor-pointer rounded-sm border border-transparent font-medium tabular-nums transition-colors duration-(--duration-fast) ease-standard",
        isFullWidth && "min-w-0 flex-1 basis-0",
        CONTROL_SIZE_CLASS[size],
        // Two entries rather than one interpolated string:
        // `tailwindCandidates.test.ts` rejects a template literal in
        // a className outright, because Tailwind's scanner cannot
        // see a class that only exists at runtime.
        isChecked
          ? "bg-intent-accent-solid text-intent-accent-on-solid"
          : "text-content-secondary hover:bg-intent-neutral-surface hover:text-content-primary",
        isDisabled &&
          "cursor-not-allowed text-content-disabled hover:bg-transparent hover:text-content-disabled",
        FOCUS_RING_CLASS,
      )}
      disabled={isDisabled}
      onClick={() => {
        onChoose(value)
      }}
      ref={(element) => {
        trackElement(value, element)
      }}
      role="radio"
      tabIndex={tabIndex}
      type="button"
    >
      {label}
    </button>
  )
}
