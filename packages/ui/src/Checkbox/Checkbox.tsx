import type { ControlSize } from "@charcuterie/tokens"
import type { ChangeEvent, ReactNode } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
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
   * Shows the value at full contrast but refuses to change it — a
   * setting you may read here and edit elsewhere. Distinct from
   * `isDisabled`, which dims: a read-only box is not turned down,
   * because the whole point is that you can still read it. Announced
   * as `aria-readonly`, and the toggle is blocked on both pointer and
   * `Space`.
   */
  isReadOnly?: boolean
  /**
   * The visible text beside the box, and the checkbox's accessible
   * name — the `<label>` wraps the control, so there is no `for` to
   * get wrong. A box with no label is a control a screen reader
   * cannot announce, which is why this is required.
   */
  label: ReactNode
  onChange?: (isChecked: boolean) => void
  size?: ControlSize
  /**
   * The `<input>`'s `value` attribute — which member of a group this
   * box IS, as opposed to whether it is ticked.
   *
   * A lone boolean does not need this. A GROUP does: the browser
   * submits `name=value` for each ticked box in a form, and, more
   * relevantly here, a group is normally read back with one query —
   * `[...root.querySelectorAll("input")].filter(i => i.checked)
   * .map(i => i.value)`. Without a `value` every box in the group
   * reports the string `"on"` and the read is useless, which is why
   * queuepilot's library and ratings pickers were still hand-rolling
   * a raw `<input type="checkbox">` rather than adopting this
   * component.
   *
   * Passed straight through and otherwise inert. It is NOT the
   * checked state and does not become one: `isChecked` still seeds
   * the box, and `onChange` still reports a boolean.
   */
  value?: string
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
  isReadOnly = false,
  label,
  onChange,
  size = "md",
  value,
}: CheckboxProps): ReactNode => (
  <label
    className={toClassName(
      "inline-flex items-center gap-2 text-content-secondary select-none",
      TEXT_SIZE_CLASS[size],
      // One cursor, chosen by state — two cursor utilities of the same
      // specificity do not resolve by class-list order.
      isDisabled
        ? "cursor-not-allowed"
        : isReadOnly
          ? "cursor-default"
          : "cursor-pointer",
      // Disabled dims the whole control with opacity rather than fading
      // the box to a quieter token. The token scale has no step between
      // `border-default` and `border-strong`, so a muted outline was
      // either invisible or indistinguishable from enabled; `opacity-60`
      // keeps the full shape and colour and just turns them down, which
      // is the "present but inactive" the box actually is. Read-only is
      // *not* dimmed — its whole point is that the value stays readable.
      // The same treatment is on `Switch` and `RadioGroup`.
      isDisabled && "opacity-60",
      className,
    )}
  >
    <span className="relative grid shrink-0 place-items-center">
      <input
        aria-readonly={isReadOnly || undefined}
        className={toClassName(
          // `border-2` is the family's shared weight — the `Switch`
          // track's `ring-2` and the `RadioGroup` ring match it, so the
          // three read as one set — and a 2px edge is also what keeps a
          // disabled box visible where a 1px one washed out.
          "peer appearance-none rounded-sm border-2 bg-surface-sunken transition-colors duration-(--duration-fast) ease-standard",
          // Read-only wears the **neutral** intent, not the accent: full
          // contrast (so the value reads) but plainly not an actionable
          // accent control, with a softer `border-default` resting edge.
          // Three distinct states result — enabled (accent, crisp),
          // disabled (accent, dimmed by the wrapper), read-only (neutral).
          // No `disabled:` colour override; the wrapper's `opacity-60`
          // does the dimming, and doubling it on the box is what made a
          // disabled checkbox vanish.
          isReadOnly
            ? "border-border-default checked:border-intent-neutral-solid checked:bg-intent-neutral-solid"
            : "border-border-strong checked:border-intent-accent-solid checked:bg-intent-accent-solid",
          isDisabled
            ? "cursor-not-allowed"
            : isReadOnly
              ? "cursor-default"
              : "cursor-pointer",
          BOX_SIZE_CLASS[size],
          FOCUS_RING_CLASS,
        )}
        defaultChecked={isChecked}
        disabled={isDisabled}
        id={id}
        onChange={(
          event: ChangeEvent<HTMLInputElement>,
        ) => {
          if (isReadOnly) {
            return
          }

          onChange?.(event.target.checked)
        }}
        onClick={(clickEvent) => {
          // Native checkboxes have no `readonly`, so the toggle is
          // blocked here — `preventDefault` on the click stops the
          // checked flip a pointer would make.
          if (isReadOnly) {
            clickEvent.preventDefault()
          }
        }}
        onKeyDown={(keyEvent) => {
          // …and Space, the keyboard toggle a click block does not
          // cover.
          if (isReadOnly && keyEvent.key === " ") {
            keyEvent.preventDefault()
          }
        }}
        type="checkbox"
        value={value}
      />

      <svg
        aria-hidden="true"
        className={toClassName(
          "pointer-events-none invisible absolute peer-checked:visible",
          // Matches whichever fill the box wears, so the tick keeps its
          // guaranteed on-solid contrast in either intent.
          isReadOnly
            ? "text-intent-neutral-on-solid"
            : "text-intent-accent-on-solid",
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
