import type { ControlSize } from "@charcuterie/tokens"
import type {
  ChangeEvent,
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { CONTROL_SIZE_CLASS } from "../controlStyles.ts"
import {
  DISABLED_CLASS,
  FOCUS_RING_CLASS,
} from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"

export type SelectOption = {
  isDisabled?: boolean
  label: string
  value: string
}

export type SelectOptionGroup = {
  label: string
  options: readonly SelectOption[]
}

export type SelectItem = SelectOption | SelectOptionGroup

/**
 * The HTML attributes are passed through, and that is not
 * convenience — it is what makes the `Field` slot work at all.
 *
 * `Field` clones `id`, `aria-describedby`, `aria-invalid` and
 * `required` onto whatever control it is given. A component with a
 * closed prop list **silently drops all four**: the field renders,
 * the label still points at nothing, and every assertion about the
 * control's own props passes because they never arrived. Found by
 * the one test that asked the control what it had been handed.
 *
 * Same arrangement as `Button`, for the same reason.
 */
export type SelectProps = Omit<
  ComponentPropsWithRef<"select">,
  "disabled" | "onChange" | "size" | "value"
> & {
  /**
   * Goes on the **wrapper**, which is the box a caller means when
   * they size a control. See the component docblock — the chevron
   * is positioned against that wrapper, so a width anywhere else
   * leaves it behind.
   */
  className?: string
  /**
   * The escape hatch for the inner `<select>` itself, for the
   * things that genuinely are not the outer box: `font-mono` on the
   * option text, a `text-*` override, a `bg-*`.
   *
   * Sizing does **not** belong here. The inner element is `w-full`
   * and a width on it desynchronises it from the wrapper the
   * chevron is pinned to, which is the whole of #112.
   */
  controlClassName?: string
  isDisabled?: boolean
  /**
   * The accessible name, when this is **not** inside a `Field`. A
   * `<select>` with neither a `<label for>` nor an `aria-label` is
   * announced as "combobox" and is unfindable by
   * `getByRole("combobox", { name })` — twelve of the fleet's
   * fourteen native selects are in exactly that state.
   */
  label?: string
  onChange?: (value: string) => void
  /**
   * `readonly`, because a caller's list is usually a constant and
   * TypeScript will not hand a `readonly` array to a mutable
   * parameter — image-viewer hit `TS4104` on an `as const` options
   * table and had to spread a copy at every call. This component
   * only ever `.map`s over it, so demanding a mutable array was
   * asking for a permission it never uses.
   */
  options: readonly SelectItem[]
  /**
   * A disabled first entry, not a real option. Reads as a prompt to
   * a sighted user and cannot be submitted, which is what a
   * placeholder should mean — unlike an empty-valued option, which
   * is selectable and silently posts "".
   */
  placeholder?: string
  size?: ControlSize
  /** **Initial** only, like every other value prop in this library. */
  value?: string
}

const getIsGroup = (
  item: SelectItem,
): item is SelectOptionGroup => "options" in item

/**
 * A styled native `<select>`, and the fleet's fourteen hand-rolled
 * ones collapse onto it.
 *
 * ### Sizing: `className` is the wrapper, `controlClassName` is the select
 *
 * This renders a wrapper around the native `<select>` because the
 * chevron has to live somewhere, and the chevron is positioned
 * against that wrapper. `className` therefore lands on the wrapper
 * and the `<select>` stays `w-full` inside it, so
 * `className="w-44"` means "this control is 176px" — chevron
 * included — which is what a caller writing a width already assumes.
 *
 * Before this, `className` went to the inner element only. The
 * wrapper stayed `w-full`, the chevron stayed at *its* edge, and
 * mux-magic's rules builder measured the gap at **869.6px** with the
 * control's own text clipping beside it. The width never worked;
 * `ui@2.16.0`'s `tailwind-merge` only made half of it work and made
 * the other half visible.
 *
 * For the genuinely-inner things — `font-mono` on the option text, a
 * `bg-*` — there is `controlClassName`.
 *
 * ### There is no state kind here, and that is the finding
 *
 * Every other interactive component in this package owns its state
 * through `@charcuterie/logic`. This one owns none, because the
 * platform already does: a `<select>` holds the chosen option in the
 * DOM, and putting a `useSinglePicker` beside it would create the
 * exact conflict the state layer exists to prevent — two things
 * believing they hold `value`, which is the Radix argument from
 * `Popover` pointed at ourselves. So `value` seeds `defaultValue`
 * and changes are reported outward.
 *
 * The consequence worth knowing: **`Select` is uncontrolled and
 * `Tabs` is not**, and a reader should be able to tell why without
 * asking. A tab bar's selection has no DOM representation, so
 * something has to hold it; a select's does.
 *
 * ### Native, and what that rules out
 *
 * A `<select>` cannot render a rich option — an icon, two lines, a
 * badge — and cannot filter. mux-magic has six controls that need
 * one of those (`CommandPicker`, `PathPicker`, `LinkPicker`,
 * `EnumPicker`, `AssFieldPicker`, `RenameTargetPicker`), and every
 * one of them is a **`Combobox`**: a text input that filters a
 * listbox. That is a different pattern with a different ARIA
 * contract, it is P2 in the plan, and building a bare `Listbox`
 * here that none of the six could adopt would have shipped a
 * component with no caller.
 *
 * What native buys, and what a hand-rolled listbox has to rebuild
 * from nothing: type-ahead, Home/End, PageUp/PageDown, the mobile
 * wheel picker, form submission, `:invalid`, and autofill.
 */
export const Select = ({
  className,
  controlClassName,
  isDisabled = false,
  label,
  onChange,
  options,
  placeholder,
  size = "md",
  value,
  ...selectProps
}: SelectProps): ReactNode => (
  <div
    className={toClassName(
      "relative inline-grid w-full items-center",
      // `className` lands HERE, not on the `<select>`, and that is
      // the fix for #112 rather than a stylistic choice. The chevron
      // below is `absolute end-3` against this element, so a width
      // that reaches only the inner control moves the control and
      // leaves the chevron pinned to the old edge — measured at
      // 869.6px adrift in mux-magic's rules builder, with the
      // control's own text clipping at the same time.
      //
      // It also matches every other component in this package:
      // `className` is the outermost box. `ms-auto` — which mux-magic
      // passes and which did nothing on a `w-full` inner select — is
      // the tell that callers already believed this.
      className,
    )}
  >
    <select
      {...selectProps}
      aria-label={label}
      className={toClassName(
        "w-full cursor-pointer appearance-none rounded-md border border-border-default bg-surface-raised text-content-primary transition-colors duration-(--duration-fast) ease-standard",
        // Room for the chevron below, which sits in the same grid
        // cell. A `<select>`'s own arrow is what `appearance-none`
        // removes, and forgetting to put one back leaves a control
        // that looks exactly like a text input.
        "pe-9",
        // Height comes from the shared control-size/density system ONLY —
        // no per-component touch-target floor. Touch is the density axis's
        // job (`[data-density]` scales `--control-height-*` past 44px on a
        // kiosk), so forcing 44px here made Select taller than Button et al.
        // at desktop density. See the controls-share-one-height decision.
        CONTROL_SIZE_CLASS[size],
        "hover:border-border-strong",
        FOCUS_RING_CLASS,
        DISABLED_CLASS,
        // Inner-only, and deliberately not `className`. `w-full`
        // above keeps this element the same width as the wrapper the
        // chevron is measured from, so the two can never drift.
        controlClassName,
      )}
      defaultValue={
        value ??
        (placeholder === undefined ? undefined : "")
      }
      disabled={isDisabled}
      onChange={(
        changeEvent: ChangeEvent<HTMLSelectElement>,
      ) => {
        onChange?.(changeEvent.currentTarget.value)
      }}
    >
      {placeholder === undefined ? null : (
        <option disabled value="">
          {placeholder}
        </option>
      )}

      {options.map((item) =>
        getIsGroup(item) ? (
          <optgroup key={item.label} label={item.label}>
            {item.options.map((option) => (
              <option
                disabled={option.isDisabled}
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </optgroup>
        ) : (
          <option
            disabled={item.isDisabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </option>
        ),
      )}
    </select>

    <svg
      // Decoration. The control beside it already has a name, and an
      // announced "chevron" is noise on every select in the fleet.
      aria-hidden="true"
      className="pointer-events-none absolute end-3 size-4 text-content-secondary"
      fill="none"
      focusable={false}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
)
