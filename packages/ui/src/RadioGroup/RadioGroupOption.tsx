import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { RadioItem } from "./RadioGroup.tsx"

export type RadioGroupOptionProps = {
  isChecked: boolean
  isReadOnly: boolean
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

// Deliberately the `Switch`'s `THUMB_SIZE_CLASS`, value for value — a
// radio's ring and a switch's knob are then the same circle at every
// density, which is what makes the family read as one set.
const RING_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "size-3",
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
  isReadOnly,
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
        "inline-flex items-center gap-2 rounded-sm text-content-secondary text-start transition-colors duration-(--duration-fast) ease-standard",
        TEXT_SIZE_CLASS[size],
        // Disabled turns the whole option down with `opacity-60`, the
        // same family treatment as `Checkbox` and `Switch`, rather than
        // fading the ring to a token that disappeared on a pale theme.
        // Read-only keeps full contrast — only the cursor and the hover
        // affordance say it will not move.
        isDisabled
          ? "cursor-not-allowed opacity-60"
          : isReadOnly
            ? "cursor-default"
            : "cursor-pointer hover:text-content-primary",
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
          // `border-2` matches the `Switch` thumb's ring weight and the
          // `Checkbox` box, and `RING_SIZE_CLASS` matches the thumb's
          // diameter — so a radio dot and a switch knob are the same
          // circle. A disabled ring holds `border-default` rather than
          // fading to the `border-subtle` that vanished on a pale theme.
          "grid shrink-0 place-items-center rounded-full border-2 transition-colors duration-(--duration-fast) ease-standard",
          // Read-only wears the neutral intent and a softer resting edge
          // — the same "readable but not an actionable accent" language
          // as `Checkbox` and `Switch`.
          isReadOnly
            ? isChecked
              ? "border-intent-neutral-solid"
              : "border-border-default"
            : isChecked
              ? "border-intent-accent-solid"
              : "border-border-strong",
          RING_SIZE_CLASS[size],
        )}
      >
        <span
          className={toClassName(
            "rounded-full transition-transform duration-(--duration-fast) ease-standard",
            isReadOnly
              ? "bg-intent-neutral-solid"
              : "bg-intent-accent-solid",
            isChecked ? "scale-100" : "scale-0",
            DOT_SIZE_CLASS[size],
          )}
        />
      </span>

      <span>{label}</span>
    </button>
  )
}
