import { useVisibility } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { Placement } from "@floating-ui/react"
import {
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"
import { useRef } from "react"

import { Button } from "../Button/Button.tsx"
import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
import { usePanelItemSize } from "../Overlay/usePanelItemSize.ts"
import { toClassName } from "../toClassName.ts"
import { CatalogPickerMark } from "./CatalogPickerMark.tsx"
import { CatalogPickerPanel } from "./CatalogPickerPanel.tsx"
import type {
  CatalogPickerGroup,
  CatalogPickerItem,
} from "./catalogPickerView.ts"

export type {
  CatalogPickerGroup,
  CatalogPickerItem,
} from "./catalogPickerView.ts"

/**
 * A constant element rather than a component, as in `Picker`: a
 * second component in this file trips the house rule, and this never
 * varies.
 */
const CHEVRON_DOWN = (
  <svg
    aria-hidden="true"
    className="size-4"
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
)

export type CatalogPickerProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "disabled" | "onChange" | "value"
> & {
  /**
   * The glyph inside the search field's clear button — the app's own,
   * as for `SearchInput`. Without one there is no clear button, and
   * Escape clears the query.
   */
  clearIcon?: ReactNode
  /** The trigger. As in `Picker`, the outermost box this renders. */
  className?: string
  /** Shown when a search matches nothing. Default "No matches". */
  emptyLabel?: string
  /** Item values, in the order the Favorites tab lists them. No favorites, no Favorites tab. */
  favorites?: readonly string[]
  /** The Favorites tab's accessible name and tooltip. Default "Favorites". */
  favoritesLabel?: string
  /** The rail, top to bottom (after Favorites). A group with no rows is left off. */
  groups: readonly CatalogPickerGroup[]
  isDisabled?: boolean
  /** Everything that can be chosen. A group's rows keep this order. */
  items: readonly CatalogPickerItem[]
  /**
   * What the control is FOR — "Agent", "Model". Not the current value.
   * The trigger is named `"<label>: <chosen label>"`, as in `Picker`,
   * and the search field and the list are named `label`.
   */
  label: string
  onChange: (value: string) => void
  /** The trigger's text when nothing is chosen. */
  placeholder?: string
  /** Where the panel opens against the trigger. Default `bottom-start`. */
  placement?: Placement
  /** The search field's placeholder. Default "Search…". */
  searchPlaceholder?: string
  /** The trigger's size, and the size of every row in the panel. Default `md`. */
  size?: ControlSize
  value?: string
}

/** Tall enough for about nine rows at `md`, and never taller than the window leaves. */
const PANEL_MAX_HEIGHT_PX = 448

/** Wide enough for a rail and a long model name; capped to the window on a phone. */
const PANEL_MAX_WIDTH_PX = 416

/**
 * A picker over a large catalog: browsed by group on a rail, or
 * searched across everything at once.
 *
 * The trigger is a `Picker`-style button showing the chosen item's mark
 * and label. The panel has a vertical rail on the inline start — a
 * Favorites tab, then one tab per group — and, beside it, a search
 * field over the list. Browsing a tab lists that group's rows; typing
 * lists matches from every group, under group headings.
 *
 * ### Why not `Combobox` or `Picker`
 *
 * Both are one flat list. Forty-odd rows that differ only after a
 * shared provider prefix are exactly what neither helps with: `Picker`
 * has no filter, and `Combobox` filters one label string and has no
 * way to browse a part of the list. The rail is the browse half, and
 * the search crosses the rail, because a person who types a model's
 * name should not have to know its provider first.
 *
 * ### The ARIA contract
 *
 * The trigger opens a `role="dialog"` named by the trigger. Inside, the
 * search field is the `role="combobox"` controlling a `role="listbox"`,
 * focus stays in the field, and the arrows move
 * `aria-activedescendant` — the `Combobox` contract. The rail is a
 * vertical `role="toolbar"` of `aria-pressed` buttons, and Tab moves
 * between the field and the rail. Escape clears a query, then closes,
 * and focus returns to the trigger.
 *
 * ### Opening
 *
 * The panel lands on Favorites when the chosen value is a favorite or a
 * pinned row, else on the chosen row's group, else on Favorites, else
 * on the first group; and the chosen row is centred in the list, as a
 * `Combobox` opens on its chosen option.
 *
 * ### Not windowed
 *
 * Every row of the current view is rendered. `Combobox` windows only
 * above 100 rows, and the catalogs this was built for are 40 to 60; a
 * catalog that needs windowing is a change to this component, recorded
 * in its decision.
 */
export const CatalogPicker = ({
  className,
  clearIcon,
  emptyLabel = "No matches",
  favorites = [],
  favoritesLabel = "Favorites",
  groups,
  isDisabled = false,
  items,
  label,
  onChange,
  placeholder,
  placement,
  searchPlaceholder = "Search…",
  size = "md",
  value,
  ...buttonProps
}: CatalogPickerProps): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility()

  const isOpen = isVisible && !isDisabled

  const itemSize = usePanelItemSize(size)

  const inputRef = useRef<HTMLInputElement>(null)

  const chosen =
    value === undefined
      ? undefined
      : items.find((item) => item.value === value)

  const chosenGroup =
    chosen?.groupId == null
      ? undefined
      : groups.find((group) => group.id === chosen.groupId)

  const triggerText = chosen?.label ?? placeholder ?? ""

  const hasChosenMark =
    chosen !== undefined &&
    (chosen.icon !== undefined || chosenGroup !== undefined)

  const {
    clonedTrigger,
    context,
    floatingStyles,
    getFloatingProps,
    isExiting,
    isMounted,
    motionClassName,
    setFloating,
    triggerId,
  } = useAnchoredOverlay({
    // Escape belongs to the panel: it clears a query before it closes.
    isEscapeDismissable: false,
    isVisible: isOpen,
    maxHeightPx: PANEL_MAX_HEIGHT_PX,
    maxWidthPx: PANEL_MAX_WIDTH_PX,
    offsetValue: 4,
    onDismiss: hide,
    placement,
    role: "dialog",
    trigger: (
      <Button
        {...buttonProps}
        appearance="outline"
        aria-label={`${label}: ${triggerText}`}
        className={toClassName(
          "justify-between",
          className,
        )}
        iconEnd={CHEVRON_DOWN}
        intent="neutral"
        isDisabled={isDisabled}
        onClick={(clickEvent) => {
          buttonProps.onClick?.(clickEvent)

          toggle()
        }}
        size={size}
        type="button"
      >
        {triggerText === "" && !hasChosenMark ? null : (
          <span className="flex min-w-0 grow items-center gap-2">
            {hasChosenMark ? (
              <CatalogPickerMark
                accentColor={chosenGroup?.accentColor}
                icon={chosen?.icon ?? chosenGroup?.icon}
                initialsOf={chosenGroup?.label}
                size="sm"
              />
            ) : null}

            {/* Not `truncate`, for the reason `Picker` gives: its
                `overflow: hidden` clips glyph edges. */}
            <span className="-mx-1 min-w-0 grow overflow-x-clip px-1 text-start text-ellipsis whitespace-nowrap">
              {triggerText}
            </span>
          </span>
        )}
      </Button>
    ),
  })

  const choose = (nextValue: string) => {
    onChange(nextValue)

    hide()
  }

  return (
    <>
      {clonedTrigger}

      {isMounted ? (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            disabled={isExiting}
            initialFocus={inputRef}
            modal={false}
          >
            <div
              {...getFloatingProps()}
              aria-hidden={isExiting ? true : undefined}
              aria-labelledby={triggerId}
              className={toClassName(
                PANEL_SURFACE_CLASS,
                "z-[var(--layer-modal)] flex h-[28rem] w-[26rem] overflow-hidden",
                motionClassName,
              )}
              inert={isExiting ? true : undefined}
              ref={setFloating}
              // `useRole` already wrote this through the spread; restated
              // so the lint can see the role `aria-labelledby` belongs to.
              role="dialog"
              style={floatingStyles}
            >
              <CatalogPickerPanel
                clearIcon={clearIcon}
                emptyLabel={emptyLabel}
                favorites={favorites}
                favoritesLabel={favoritesLabel}
                groups={groups}
                inputRef={inputRef}
                itemSize={itemSize}
                items={items}
                label={label}
                onDismiss={hide}
                onSelect={choose}
                searchPlaceholder={searchPlaceholder}
                value={value}
              />
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}
