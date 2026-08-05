import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { RadioItem } from "./RadioGroup.tsx"

export type RadioGroupOptionProps = {
  isChecked: boolean
  item: RadioItem
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

const RING_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
}

const DOT_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
}

const TEXT_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "text-sm",
  md: "text-md",
  lg: "text-lg",
}

/**
 * Its own file for the same reason `SegmentedOption` is: **both
 * registrations are effects**, and an effect cannot run in a loop.
 *
 * The ring and the dot are two elements rather than a bordered box
 * with a background, so the checked dot can be centred by the grid
 * and sized independently of the ring — a filled `bg-intent-accent`
 * ring with no inner dot reads as a checkbox, not a radio.
 */
export const RadioGroupOption = ({
  isChecked,
  item,
  onChoose,
  registerFocus,
  registerSelection,
  size,
  tabIndex,
  trackElement,
}: RadioGroupOptionProps): ReactNode => {
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
    // biome-ignore lint/a11y/useSemanticElements: `<input type="radio">` owns `checked` *and* owns arrow-key navigation within a `name` group — the same self-owning-control conflict `SegmentedOption` documents, where the browser and `SinglePicker` would each believe they hold the choice and native roving would fight `RovingFocus`. APG's radio-group pattern is built for exactly this.
    <button
      aria-checked={isChecked}
      className={toClassName(
        "inline-flex cursor-pointer items-center gap-2 rounded-sm text-start transition-colors duration-(--duration-fast) ease-standard",
        TEXT_SIZE_CLASS[size],
        isDisabled
          ? "cursor-not-allowed text-content-disabled"
          : "text-content-secondary hover:text-content-primary",
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
      <span
        className={toClassName(
          "grid shrink-0 place-items-center rounded-full border transition-colors duration-(--duration-fast) ease-standard",
          isDisabled
            ? "border-border-subtle"
            : isChecked
              ? "border-intent-accent-solid"
              : "border-border-strong",
          RING_SIZE_CLASS[size],
        )}
      >
        <span
          className={toClassName(
            "rounded-full transition-transform duration-(--duration-fast) ease-standard",
            isChecked ? "scale-100" : "scale-0",
            isDisabled
              ? "bg-content-disabled"
              : "bg-intent-accent-solid",
            DOT_SIZE_CLASS[size],
          )}
        />
      </span>

      <span>{label}</span>
    </button>
  )
}
