import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { PANEL_ITEM_SIZE_CLASS } from "../controlStyles.ts"
import { toClassName } from "../toClassName.ts"
import { CatalogPickerMark } from "./CatalogPickerMark.tsx"
import {
  CHOSEN_CHECK,
  ROW_FAVORITE_STAR,
} from "./catalogPickerDrawings.tsx"
import type {
  CatalogPickerGroup,
  CatalogPickerItem,
} from "./catalogPickerView.ts"

export type CatalogPickerOptionProps = {
  group: CatalogPickerGroup | undefined
  /** The DOM id the search field's `aria-activedescendant` points at. */
  id: string
  isActive: boolean
  isFavorite: boolean
  isSelected: boolean
  item: CatalogPickerItem
  /** Already stepped down for a short window by `usePanelItemSize`. */
  itemSize: ControlSize
  onChoose: (value: string) => void
  /** The pointer moved over the row. */
  onPoint: () => void
}

/**
 * One row of the catalog's listbox: the mark, the label, the optional
 * description, a star on a favorite, and the check gutter.
 *
 * The contract is `ComboboxOption`'s, for the same reasons: focus stays
 * in the search field, so the row is `role="option"` with
 * `tabIndex={-1}` and the active row is announced by
 * `aria-activedescendant`; `aria-selected` is the chosen value; a
 * mouse press is prevented from moving focus, so the caret stays in the
 * field while the click lands.
 *
 * The pointer moves the active row on `pointermove` (as in
 * `CommandPalette`), so the pointer and the arrow keys share one
 * highlight and Enter's target is never ambiguous. The chosen row keeps
 * its accent tint whenever the highlight is elsewhere.
 *
 * The check is always laid out and only hidden on an unchosen row, so
 * choosing never moves the star or the label. It is drawn, not the
 * `✓` `ComboboxOption` types: that glyph measures blank where the font
 * lacks it.
 */
export const CatalogPickerOption = ({
  group,
  id,
  isActive,
  isFavorite,
  isSelected,
  item,
  itemSize,
  onChoose,
  onPoint,
}: CatalogPickerOptionProps): ReactNode => {
  const {
    description,
    icon,
    isDisabled = false,
    label,
    value,
  } = item

  return (
    <button
      aria-selected={isSelected}
      className={toClassName(
        "flex w-full cursor-pointer items-center rounded-sm text-start",
        PANEL_ITEM_SIZE_CLASS[itemSize],
        isDisabled
          ? "cursor-not-allowed text-content-disabled"
          : "text-content-primary",
        isActive && "bg-intent-neutral-surface-hover",
        isSelected &&
          !isActive &&
          "bg-intent-accent-surface",
      )}
      disabled={isDisabled}
      id={id}
      onClick={() => {
        onChoose(value)
      }}
      onMouseDown={(mouseEvent) => {
        mouseEvent.preventDefault()
      }}
      onPointerMove={onPoint}
      role="option"
      tabIndex={-1}
      type="button"
    >
      <CatalogPickerMark
        accentColor={group?.accentColor}
        icon={icon ?? group?.icon}
        initialsOf={group?.label}
        size={itemSize}
      />

      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span className="min-w-0 wrap-anywhere">
          {label}
        </span>

        {description === undefined ||
        description === "" ? null : (
          <span
            className={toClassName(
              "min-w-0 text-sm wrap-anywhere",
              isDisabled
                ? "text-content-disabled"
                : "text-content-muted",
            )}
          >
            {description}
          </span>
        )}
      </span>

      {isFavorite ? ROW_FAVORITE_STAR : null}

      <span
        aria-hidden="true"
        className={toClassName(
          "flex w-4 shrink-0 items-center justify-center text-intent-accent-content",
          !isSelected && "invisible",
        )}
      >
        {CHOSEN_CHECK}
      </span>
    </button>
  )
}
