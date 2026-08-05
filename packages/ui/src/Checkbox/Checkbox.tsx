import type { ControlSize } from "@charcuterie/tokens"
import type { ChangeEvent, ReactNode } from "react"

import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
} from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type CheckboxProps = {
  className?: string
  /**
   * The caller's own id, when it has one — a stable target for an
   * autofill hint or a deep link. Left to React's `useId` on the
   * `<input>` otherwise, which is enough for the wrapping `<label>`.
   */
  id?: string
  /**
   * **Initial** only. The `<input>` is the store from then on — the
   * DOM owns a checkbox's checkedness, and a controlled `checked`
   * prop is the thing this library refuses to have
   * (`SegmentedControl` says the same about `selectedValue`).
   */
  isChecked?: boolean
  isDisabled?: boolean
  /**
   * The visible text beside the box, and the checkbox's accessible
   * name — the `<label>` wraps the control, so there is no `for` to
   * get wrong. A box with no label is a control a screen reader
   * cannot announce, which is why this is required.
   */
  label: ReactNode
  onChange?: (isChecked: boolean) => void
  size?: ControlSize
}

const BOX_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
}

const CHECK_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "size-2.5",
  md: "size-3",
  lg: "size-3.5",
}

const TEXT_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "text-sm",
  md: "text-md",
  lg: "text-lg",
}

/**
 * A single boolean, on or off, that owns nothing but itself.
 *
 * This is the primitive mux-magic's `BooleanField` hand-rolled in
 * `bg-slate-700 accent-blue-500` because the library had no checkbox
 * to reach for — palette colours with no light mode, the exact M6
 * defect the token layer exists to delete. Here the box is
 * `bg-surface-sunken` and the fill is `bg-intent-accent-solid`, so
 * one control reads correctly in `daylight`, `midnight`, and on the
 * kiosk with no per-app override.
 *
 * ### The `<label>` wraps the control
 *
 * A checkbox reads to the *left* of its text, which is why it is not
 * a `Field` — `Field` stacks label above control in a `flex-col`,
 * right for a text input and wrong for a boolean, and stacking every
 * checkbox in a step card would double the card's height. Wrapping is
 * also the one label association that needs no `for` at all, so there
 * is no minted-then-dropped id to get wrong.
 *
 * ### The `<input>` is the store
 *
 * `defaultChecked`, not `checked`. The DOM owns a checkbox's state
 * natively, so there is no second copy to keep in step and no
 * controlled-prop round-trip — `onChange` reports the new state to a
 * consumer that wants to persist it, and reading it back is the
 * `<input>`'s job. `isChecked` seeds the first paint and nothing
 * after.
 */
export const Checkbox = ({
  className,
  id,
  isChecked = false,
  isDisabled = false,
  label,
  onChange,
  size = "md",
}: CheckboxProps): ReactNode => (
  <label
    className={toClassName(
      "inline-flex cursor-pointer items-center gap-2 text-content-secondary select-none",
      TEXT_SIZE_CLASS[size],
      isDisabled &&
        "cursor-not-allowed text-content-disabled",
      className,
    )}
  >
    <span className="relative grid shrink-0 place-items-center">
      <input
        className={toClassName(
          "peer cursor-pointer appearance-none rounded-sm border border-border-strong bg-surface-sunken transition-colors duration-(--duration-fast) ease-standard",
          "checked:border-intent-accent-solid checked:bg-intent-accent-solid",
          BOX_SIZE_CLASS[size],
          DISABLED_CLASS,
          FOCUS_RING_CLASS,
        )}
        defaultChecked={isChecked}
        disabled={isDisabled}
        id={id}
        onChange={(
          event: ChangeEvent<HTMLInputElement>,
        ) => {
          onChange?.(event.target.checked)
        }}
        type="checkbox"
      />

      <svg
        aria-hidden="true"
        className={toClassName(
          "pointer-events-none invisible absolute text-intent-accent-on-solid peer-checked:visible",
          CHECK_SIZE_CLASS[size],
        )}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        viewBox="0 0 24 24"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>

    <span>{label}</span>
  </label>
)
