import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { PANEL_ITEM_SIZE_CLASS } from "../controlStyles.ts"
import type { ListboxItem } from "../Listbox/Listbox.tsx"
import { toClassName } from "../toClassName.ts"

export type ComboboxOptionProps = {
  /** The stable DOM id `aria-activedescendant` points at. */
  id: string
  isActive: boolean
  isSelected: boolean
  /** Already stepped down for a short window by `usePanelItemSize`. */
  itemSize: ControlSize
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
  itemSize,
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
        // No base `bg-transparent`: it is a plain `background-color`
        // utility at the same specificity as the state tints below, and
        // Tailwind emits it *after* them, so it silently won every row —
        // the active option and the selected option both rendered with no
        // fill and the keyboard cursor was invisible (it read as "arrows
        // do nothing"). A button's background is transparent by default;
        // the tint classes only ever add one.
        "flex w-full cursor-pointer items-center justify-between rounded-sm text-start",
        // Height, inline padding, gap and type from the row-size system,
        // so an option matches the search field above it and the trigger
        // that opened it, rather than being visibly the smaller thing in
        // its own panel.
        PANEL_ITEM_SIZE_CLASS[itemSize],
        // The base sets no text colour: a plain `text-content-primary`
        // clobbers a conditional `text-content-disabled` at equal
        // specificity (Tailwind emits the base last), so a disabled option
        // rendered full-strength instead of greyed. Pick one colour.
        isDisabled
          ? "text-content-disabled"
          : "text-content-primary",
        // The row highlight sits on `surface-overlay`, and on that panel
        // `intent-neutral-surface` is *darker* than the surface in every
        // dark scheme (it is a base-surface tint) — so the visible token
        // is `-hover`. Active is the keyboard cursor; hover is the
        // pointer's; both use it.
        !isDisabled &&
          "hover:bg-intent-neutral-surface-hover",
        isActive && "bg-intent-neutral-surface-hover",
        // The accent tint marks selection when the cursor is elsewhere;
        // the active row keeps its own highlight (the ✓ still marks it as
        // selected), so the two are never fighting for one row's fill.
        isSelected &&
          !isActive &&
          "bg-intent-accent-surface",
        isDisabled && "cursor-not-allowed",
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

      {/*
        The ✓ is rendered **always**, only hidden with `invisible` when
        the row is unselected — never unmounted. If it appeared only on
        selection the label's available width would change the instant a
        row became selected, and a consumer whose label pins a trailing
        element (a category tag) to the row's right edge would see it jump
        left. A fixed-width, always-present gutter keeps selection a
        paint-only change. `aria-hidden` throughout: selection is conveyed
        by the button's `aria-selected`, so the glyph is decoration.
      */}
      <span
        aria-hidden="true"
        className={toClassName(
          "flex w-4 shrink-0 justify-center text-intent-accent-content",
          !isSelected && "invisible",
        )}
      >
        ✓
      </span>
    </button>
  )
}
