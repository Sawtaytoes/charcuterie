import type { ReactNode } from "react"

import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { toClassName } from "../toClassName.ts"

export type ComboboxOptionProps = {
  /** The stable DOM id `aria-activedescendant` points at. */
  id: string
  isActive: boolean
  isSelected: boolean
  item: ListboxItem
  onSelect: (value: string) => void
  /**
   * `aria-posinset`/`aria-setsize`, required when the list is
   * virtualized: most of it is not in the DOM, so a screen reader
   * would otherwise announce "2 of 12" for a 4,000-item list.
   */
  posInSet?: number
  setSize?: number
}

/**
 * `role="option"` with **`tabIndex={-1}`**, and both halves matter.
 * The APG combobox keeps focus in the text input and tracks the
 * active option with `aria-activedescendant`, so no option is ever a
 * tab stop — `tabIndex={-1}` is that. It is a `<button>` (which
 * ARIA-in-HTML allows `role="option"` on, and `Listbox` uses too)
 * rather than a `<div>`, so `onClick` carries its own keyboard route
 * and the package keeps its no-Biome-suppression record.
 *
 * The one caveat is not to run `expectAgentDrivable` on an individual
 * option: its roving-tabindex rule would (correctly) reject a native
 * control with `tabIndex={-1}`, and a combobox legitimately has zero
 * tab stops in its popup. Tests query the options with `getByRole`.
 *
 * "Active" is a visual state only — the option the arrow keys have
 * moved to, highlighted because nothing here holds real focus.
 */
export const ComboboxOption = ({
  id,
  isActive,
  isSelected,
  item,
  onSelect,
  posInSet,
  setSize,
}: ComboboxOptionProps): ReactNode => {
  const { isDisabled = false, label, value } = item

  return (
    <button
      aria-posinset={posInSet}
      aria-selected={isSelected}
      aria-setsize={setSize}
      className={toClassName(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm bg-transparent px-2 py-1.5 text-start text-content-primary text-sm",
        isActive && "bg-intent-neutral-surface",
        isSelected && "bg-intent-accent-surface",
        isDisabled &&
          "cursor-not-allowed text-content-disabled",
      )}
      disabled={isDisabled}
      id={id}
      // `onMouseDown` rather than `onClick`: the input holds focus, and
      // a click would blur it first. Prevented default keeps the caret
      // in the input while the choice is made.
      onMouseDown={(mouseEvent) => {
        mouseEvent.preventDefault()

        onSelect(value)
      }}
      role="option"
      tabIndex={-1}
      type="button"
    >
      {label}

      {isSelected ? (
        <span
          aria-hidden="true"
          className="shrink-0 text-intent-accent-content"
        >
          ✓
        </span>
      ) : null}
    </button>
  )
}
