import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import {
  TILE_BOX_CLASS,
  TILE_HINT_TEXT_CLASS,
  TILE_PADDING_CLASS,
  TILE_TEXT_SIZE_CLASS,
} from "../tileStyles.ts"
import { toClassName } from "../toClassName.ts"
import type {
  RadioItem,
  RadioItemShape,
} from "./RadioGroup.tsx"

export type RadioGroupOptionProps = {
  isChecked: boolean
  isReadOnly: boolean
  item: RadioItem
  itemShape: RadioItemShape
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

/**
 * Its own file for the same reason `SegmentedOption` is: **both
 * registrations are effects**, and an effect cannot run in a loop.
 *
 * The ring and the dot are two elements rather than a bordered box
 * with a background, so the checked dot can be centred by the grid
 * and sized independently of the ring — a filled `bg-intent-accent`
 * ring with no inner dot reads as a checkbox, not a radio.
 *
 * ### The tile shape is the same element with a border
 *
 * `itemShape="tile"` swaps `inline-flex` for `flex` — a grid item
 * stretches to its track, and an inline box would sit at
 * max-content inside it — adds the card's padding and border, and
 * moves the ring to the top of a two-line label. The radio dot is
 * still there and is still the thing a screen reader reads: a tile
 * with its border taken away is this row, which is why the two are
 * one component.
 */
export const RadioGroupOption = ({
  isChecked,
  isReadOnly,
  item,
  itemShape,
  onChoose,
  registerFocus,
  registerSelection,
  size,
  tabIndex,
  trackElement,
}: RadioGroupOptionProps): ReactNode => {
  const {
    hint,
    icon,
    isDisabled = false,
    label,
    value,
  } = item

  const isTile = itemShape === "tile"

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
        "gap-2 text-content-secondary text-start transition-colors duration-(--duration-fast) ease-standard",
        isTile
          ? toClassName(
              "flex min-w-0 items-start",
              TILE_BOX_CLASS,
              TILE_PADDING_CLASS[size],
            )
          : toClassName(
              "inline-flex rounded-sm",
              // A hint puts a second line under the label, and a ring
              // centred against both sits beside neither.
              hint === undefined
                ? "items-center"
                : "items-start",
            ),
        TILE_TEXT_SIZE_CLASS[size],
        // Disabled turns the whole option down with `opacity-60`, the
        // same family treatment as `Checkbox` and `Switch`, rather than
        // fading the ring to a token that disappeared on a pale theme.
        // Read-only keeps full contrast — only the cursor and the hover
        // affordance say it will not move.
        isDisabled
          ? "cursor-not-allowed opacity-60"
          : isReadOnly
            ? "cursor-default"
            : isTile
              ? "cursor-pointer hover:border-border-strong"
              : "cursor-pointer hover:text-content-primary",
        // The selected tile carries the accent on its EDGE and lifts
        // its surface. A tile that said "chosen" with a background
        // alone would be the one state a monochrome ePaper build
        // cannot show at all.
        isTile && isChecked
          ? isReadOnly
            ? "border-intent-neutral-solid bg-surface-overlay"
            : "border-intent-accent-solid bg-surface-overlay"
          : "",
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

      {hint === undefined && !isTile ? (
        <span>{label}</span>
      ) : (
        // `min-w-0` and `wrap-anywhere` together, because a grid
        // item's automatic minimum is its min-content width: one
        // unbroken token — a path, a URL, a title with no spaces —
        // otherwise sets the track's floor and shoves the grid out
        // of its container.
        <span className="flex min-w-0 flex-col gap-0.5 wrap-anywhere">
          {icon !== undefined && isTile ? (
            // Decorative by construction: the name it sits beside is
            // in the same button, so an announced icon is the label
            // read twice.
            <span aria-hidden className="flex">
              {icon}
            </span>
          ) : null}

          <span
            className={
              isTile
                ? "font-semibold text-content-primary"
                : undefined
            }
          >
            {label}
          </span>

          {hint === undefined ? null : (
            <span
              className={toClassName(
                "font-normal text-content-muted",
                TILE_HINT_TEXT_CLASS[size],
              )}
            >
              {hint}
            </span>
          )}
        </span>
      )}
    </button>
  )
}
