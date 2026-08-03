import type { ReactNode } from "react"
import { useEffect } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { ListboxItem } from "./Listbox.tsx"

export type ListboxOptionProps = {
  isSelected: boolean
  item: ListboxItem
  onSelect: (value: string) => void
  /** `RovingFocus.register` — membership of the arrow-key group. */
  registerFocus: (value: string) => () => void
  /** `SinglePicker.register` — membership of the choice. */
  registerSelection: (value: string) => () => void
  tabIndex: number
  trackElement: (
    value: string,
    element: HTMLButtonElement | null,
  ) => void
}

/**
 * Its own file for the same reason as `MenuAction` and `TabTrigger`:
 * **both registrations are effects**, and an effect cannot run in a
 * loop.
 *
 * The two registrations are separate on purpose, exactly as
 * `TabTrigger` splits them. A disabled option joins the *choice* — it
 * can still be the seeded `selectedValue` and still announces
 * `aria-selected` — and stays out of the *focus* group, so the arrow
 * keys and type-ahead skip it without `RovingFocus` having to know
 * what "disabled" means.
 *
 * ### `option`, not `menuitem`
 *
 * An `option` **is** something — the value being chosen — where a
 * `menuitem` **does** something. So this carries `aria-selected`
 * (which a menuitem must not), and a screen reader announces
 * "listbox, selected, 2 of 4" rather than "menu, 4 items". It is a
 * `<button>` with `role="option"` so it is natively focusable for the
 * roving-tabindex move, the same shape `Menu` uses.
 */
export const ListboxOption = ({
  isSelected,
  item,
  onSelect,
  registerFocus,
  registerSelection,
  tabIndex,
  trackElement,
}: ListboxOptionProps): ReactNode => {
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
    <button
      aria-selected={isSelected}
      className={toClassName(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm bg-transparent px-2 py-1.5 text-start text-content-primary text-sm transition-colors duration-(--duration-fast) ease-standard",
        "hover:bg-intent-neutral-surface",
        isSelected && "bg-intent-accent-surface",
        isDisabled &&
          "cursor-not-allowed text-content-disabled hover:bg-transparent",
        FOCUS_RING_CLASS,
      )}
      disabled={isDisabled}
      onClick={() => {
        onSelect(value)
      }}
      ref={(element) => {
        trackElement(value, element)
      }}
      role="option"
      tabIndex={tabIndex}
      type="button"
    >
      {label}

      {isSelected ? (
        <span
          // Decoration: the announced state is `aria-selected`, so the
          // check must not also read out.
          aria-hidden="true"
          className="shrink-0 text-intent-accent-content"
        >
          ✓
        </span>
      ) : null}
    </button>
  )
}
