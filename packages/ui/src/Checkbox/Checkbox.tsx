import { useUniqueId } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { ChangeEvent, ReactNode } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type CheckboxProps = {
  className?: string
  /**
   * Standing help under the box — units, a consequence, a warning
   * about what ticking it does. Same slot, same words and same
   * announcement order as `Field`'s: bound with `aria-describedby`,
   * so a screen reader reads it **with** the control rather than
   * announcing it from nowhere.
   *
   * It renders **outside** the `<label>` on purpose. A `<label>`'s
   * text content *is* the control's accessible name, so a hint put
   * inside it would be read twice — once as part of the name, once as
   * the description — and a pointer press anywhere on the hint would
   * toggle the box.
   */
  description?: ReactNode
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
 * The description hangs under the **label text**, not under the box,
 * so the hint and the words it explains share a left edge.
 *
 * Written out per size rather than computed, because the offset is
 * `BOX_SIZE_CLASS` plus the label row's `gap-2` and a class name is
 * never interpolated — `` `ps-${…}` `` generates nothing and fails
 * silently. sm is 0.875rem + 0.5rem, md is 1rem + 0.5rem, lg is
 * 1.25rem + 0.5rem.
 */
const DESCRIPTION_INDENT_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "ps-5.5",
  md: "ps-6",
  lg: "ps-7",
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
 * ### A description is the one thing that cannot go in the `<label>`
 *
 * `Field` has had a `description` since it shipped and this component
 * had none, so a hint could not follow its checkbox. Downstream that
 * meant one hint out of three in a group stayed an app-styled
 * paragraph and the box carried two hint typographies.
 *
 * The slot is here now, and it renders **outside** the `<label>`.
 * A `<label>`'s text content is the control's accessible name, so a
 * hint inside it is announced twice — once inside the name, once
 * again as the description — and a pointer press on the hint toggles
 * the box, which is not what a sentence of explanation should do. So
 * the `<label>` is no longer the outermost element: a `<div>` holds
 * the row and the hint, `className` moves out to it (`className` is
 * the outermost box a component renders, and that rule does not bend
 * for this one), and `aria-describedby` binds the two back together.
 *
 * There is no `error` here to go with it. `Field` derives
 * `aria-invalid` from its error, and a lone boolean is almost never
 * the invalid thing — a **group** of them is, and a group's error
 * belongs on the `FieldGroup` around it, described rather than
 * asserted. Adding one per box would put `aria-invalid` on a control
 * that is not itself wrong.
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
  description,
  id,
  isChecked = false,
  isDisabled = false,
  isReadOnly = false,
  label,
  onChange,
  size = "md",
  value,
}: CheckboxProps): ReactNode => {
  const baseId = useUniqueId()

  const descriptionId = `${baseId}-description`

  return (
    <div
      className={toClassName(
        // The row and its hint stack, and the box stays inline-level so
        // a `Checkbox` still sits in a sentence, a table cell or a flex
        // row exactly where the bare `<label>` used to.
        "inline-flex flex-col gap-1",
        className,
      )}
    >
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
          //
          // It stays on the `<label>` and does NOT reach the description
          // below, which is a contrast decision rather than an oversight.
          // axe exempts a disabled control and its own label from the
          // colour-contrast rule; a sibling paragraph gets no such
          // exemption, and `content-secondary` at 60% measures **3.77:1**
          // on `midnight` against a 4.5 threshold. A hint nobody can read
          // is worse than a hint that does not dim with its control, and
          // the hint is the part a user reads precisely when they are
          // asking why the box is turned off.
          isDisabled && "opacity-60",
        )}
      >
        <span className="relative grid shrink-0 place-items-center">
          <input
            aria-describedby={
              description === undefined
                ? undefined
                : descriptionId
            }
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
              // `indeterminate:` wears the same fill as `checked:`. It is
              // the state a *group* box is in when some of its members are
              // ticked, and it cannot be written in markup at all —
              // `indeterminate` is a DOM property with no HTML attribute —
              // so the only way to reach it is a consumer writing to the
              // input. `DataTable`'s select-all box does exactly that, and
              // before this line it painted **nothing**: the property was
              // set, screen readers announced "mixed", and the box on
              // screen was indistinguishable from empty.
              isReadOnly
                ? "border-border-default checked:border-intent-neutral-solid checked:bg-intent-neutral-solid indeterminate:border-intent-neutral-solid indeterminate:bg-intent-neutral-solid"
                : "border-border-strong checked:border-intent-accent-solid checked:bg-intent-accent-solid indeterminate:border-intent-accent-solid indeterminate:bg-intent-accent-solid",
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
              "pointer-events-none invisible absolute peer-checked:visible peer-indeterminate:invisible",
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

          {/* The mixed mark — a dash, not a tick. Its own element rather
          than a second `<path>` in the tick's `<svg>`, because the
          two states have to be able to hide independently and a
          `<path>` cannot carry a `peer-*` variant of its own. */}
          <svg
            aria-hidden="true"
            className={toClassName(
              "pointer-events-none invisible absolute peer-indeterminate:visible",
              isReadOnly
                ? "text-intent-neutral-on-solid"
                : "text-intent-accent-on-solid",
              CHECK_SIZE_CLASS[size],
            )}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path d="M6 12h12" />
          </svg>
        </span>

        <span>{label}</span>
      </label>

      {/*
        `text-sm` and `content-secondary`, the same two the `Field`
        description wears — one hint typography for the whole library,
        so a `Checkbox` and a `Field` in the same box do not disagree
        about how big a hint is. That disagreement is what kept
        queuepilot's dyn editor on an app-styled `<p>` for one hint out
        of three.
      */}
      {description === undefined ? null : (
        <p
          className={toClassName(
            "text-content-secondary text-sm",
            DESCRIPTION_INDENT_CLASS[size],
          )}
          id={descriptionId}
        >
          {description}
        </p>
      )}
    </div>
  )
}
