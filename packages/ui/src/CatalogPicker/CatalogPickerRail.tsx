import type { ControlSize } from "@charcuterie/tokens"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  Ref,
} from "react"
import { useState } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { Tooltip } from "../Tooltip/Tooltip.tsx"
import { toClassName } from "../toClassName.ts"
import { CatalogPickerMark } from "./CatalogPickerMark.tsx"
import { RAIL_FAVORITE_STAR } from "./catalogPickerDrawings.tsx"
import type { CatalogPickerTab } from "./catalogPickerView.ts"

export type CatalogPickerRailProps = {
  /** The tab whose rows the list shows, or `undefined` while a search shows every group. */
  currentTabKey: string | undefined
  itemSize: ControlSize
  label: string
  /** Escape on a rail button: the same clear-then-close the search field does. */
  onEscape: (
    keyboardEvent: ReactKeyboardEvent<HTMLElement>,
  ) => void
  /** Tab or Shift+Tab out of the rail, back to the search field. */
  onLeave: () => void
  onShowTab: (tabKey: string) => void
  ref?: Ref<HTMLDivElement>
  tabs: readonly CatalogPickerTab[]
}

const RAIL_BUTTON_SIZE_CLASS: Record<ControlSize, string> =
  {
    lg: "size-(--control-height-lg)",
    md: "size-(--control-height-md)",
    sm: "size-(--control-height-sm)",
  }

/**
 * The vertical rail: Favorites, then one button per group.
 *
 * ### A toolbar of toggle buttons, not a `tablist`
 *
 * It looks like tabs, and the first build was going to be one. Two
 * things the picker has to do are things a tablist cannot say:
 *
 * - **While a search runs, no tab is current.** The list shows matches
 *   from every group, so claiming one tab is selected would be false,
 *   and an APG tablist always has a selected tab.
 * - **There is no tab panel.** What the tab changes is the contents of
 *   a listbox that the search field also drives; the listbox is not
 *   the tab's panel and cannot be `role="tabpanel"` as well.
 *
 * A `role="toolbar"` of `aria-pressed` buttons says exactly what is
 * true: a set of switches, at most one pressed, that change what the
 * list shows. The APG toolbar pattern also gives the keyboard contract
 * for free — one tab stop, arrows move focus (vertically here), Home
 * and End jump, Enter and Space press.
 *
 * ### The pointer keeps focus in the search field
 *
 * A mouse press on a rail button is prevented from taking focus, the
 * way an option's is, so a click changes the list and the caret stays
 * where the person can keep typing or arrowing. A keyboard user who
 * tabbed onto the rail keeps focus on it.
 *
 * Each button's accessible name is the group's label, and the same
 * text is its `Tooltip`, because the mark alone is an icon or two
 * letters.
 */
export const CatalogPickerRail = ({
  currentTabKey,
  itemSize,
  label,
  onEscape,
  onLeave,
  onShowTab,
  ref,
  tabs,
}: CatalogPickerRailProps): ReactNode => {
  // The roving tab stop: the current tab while browsing, and whichever
  // button the arrows last reached otherwise.
  const [focusKey, setFocusKey] = useState(currentTabKey)

  const tabStopKey =
    tabs.find((tab) => tab.key === focusKey)?.key ??
    tabs.find((tab) => tab.key === currentTabKey)?.key ??
    tabs[0]?.key

  // Wraps at both ends, as the APG toolbar allows. The buttons are
  // found from the one that has focus, so two open pickers could never
  // reach into each other's rail.
  const moveFocus = (from: HTMLElement, index: number) => {
    const wrappedIndex = (index + tabs.length) % tabs.length

    const tab = tabs[wrappedIndex]

    if (tab === undefined) {
      return
    }

    setFocusKey(tab.key)

    from
      .closest('[role="toolbar"]')
      ?.querySelectorAll<HTMLElement>("button")
      [wrappedIndex]?.focus()
  }

  const handleKeyDown = (
    keyboardEvent: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    switch (keyboardEvent.key) {
      case "ArrowDown": {
        keyboardEvent.preventDefault()
        moveFocus(keyboardEvent.currentTarget, index + 1)

        return
      }
      case "ArrowUp": {
        keyboardEvent.preventDefault()
        moveFocus(keyboardEvent.currentTarget, index - 1)

        return
      }
      case "Home": {
        keyboardEvent.preventDefault()
        moveFocus(keyboardEvent.currentTarget, 0)

        return
      }
      case "End": {
        keyboardEvent.preventDefault()
        moveFocus(
          keyboardEvent.currentTarget,
          tabs.length - 1,
        )

        return
      }
      case "Escape": {
        onEscape(keyboardEvent)

        return
      }
      case "Tab": {
        keyboardEvent.preventDefault()
        onLeave()

        return
      }
      default:
    }
  }

  return (
    <div
      aria-label={label}
      aria-orientation="vertical"
      className="charcuterie-scrollbar flex shrink-0 flex-col gap-1 overflow-y-auto overscroll-contain border-border-subtle border-e p-1.5"
      ref={ref}
      role="toolbar"
    >
      {tabs.map((tab, index) => {
        const isCurrent = tab.key === currentTabKey

        return (
          <Tooltip
            key={tab.key}
            label={tab.label}
            placement="right"
          >
            <button
              aria-label={tab.label}
              aria-pressed={isCurrent}
              className={toClassName(
                "flex shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-(--duration-fast) ease-standard",
                RAIL_BUTTON_SIZE_CLASS[itemSize],
                isCurrent
                  ? "bg-intent-accent-surface text-intent-accent-content"
                  : "text-content-secondary hover:bg-intent-neutral-surface-hover hover:text-content-primary",
                FOCUS_RING_CLASS,
              )}
              onClick={() => {
                setFocusKey(tab.key)
                onShowTab(tab.key)
              }}
              onKeyDown={(keyboardEvent) => {
                handleKeyDown(keyboardEvent, index)
              }}
              onMouseDown={(mouseEvent) => {
                mouseEvent.preventDefault()
              }}
              tabIndex={tab.key === tabStopKey ? 0 : -1}
              type="button"
            >
              {tab.kind === "favorites" ? (
                RAIL_FAVORITE_STAR
              ) : (
                <CatalogPickerMark
                  accentColor={tab.group.accentColor}
                  icon={tab.group.icon}
                  initialsOf={tab.group.label}
                  size={itemSize}
                />
              )}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
