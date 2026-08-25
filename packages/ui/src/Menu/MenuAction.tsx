import type { ControlSize } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect } from "react"

import { PANEL_ITEM_SIZE_CLASS } from "../controlStyles.ts"
import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { MenuItem } from "./Menu.tsx"

export type MenuActionProps = {
  /** Already stepped down for a short window by `usePanelItemSize`. */
  itemSize: ControlSize
  item: MenuItem
  onDismiss: () => void
  /** `RovingFocus.register` — membership of the arrow-key group. */
  register: (value: string) => () => void
  tabIndex: number
  trackElement: (
    key: string,
    element: HTMLButtonElement | null,
  ) => void
}

/**
 * Its own file because **registration is an effect**, and an effect
 * cannot run in a loop — the same reason `TabTrigger` and
 * `AccordionSection` are separate. Any member of a registering group
 * ends up shaped like this.
 *
 * A disabled item is simply not registered, so the arrow keys skip
 * it without any command in `RovingFocus` knowing what "disabled"
 * means. It stays in the DOM and stays announced, which is the
 * difference between "you cannot do this right now" and "this does
 * not exist".
 */
export const MenuAction = ({
  item,
  itemSize,
  onDismiss,
  register,
  tabIndex,
  trackElement,
}: MenuActionProps): ReactNode => {
  const {
    icon,
    isDisabled = false,
    key,
    label,
    onSelect,
  } = item

  useEffect(() => {
    if (isDisabled) {
      return
    }

    return register(key)
  }, [isDisabled, key, register])

  return (
    <button
      className={toClassName(
        // No base `bg-transparent`: it is a plain `background-color`
        // utility at the same specificity as the hover tint and Tailwind
        // emits it last, so it wins — the same clobber that made a
        // `Combobox`'s keyboard cursor invisible. A button's background is
        // transparent already.
        "flex w-full cursor-pointer items-center rounded-sm text-start text-content-primary transition-colors duration-(--duration-fast) ease-standard",
        // Height, inline padding, gap and type all come from the row-size
        // system, so a `md` menu item is exactly as tall as a `md`
        // `Button` and the kiosk density grows both together.
        PANEL_ITEM_SIZE_CLASS[itemSize],
        // `-hover`, not plain `intent-neutral-surface`: this panel is
        // `surface-overlay`, which every dark scheme paints *lighter*
        // than the base-surface tint — so the plain one reads as no
        // change. `ListboxOption` and `ComboboxOption` were corrected on
        // 2026-08-05 and this was missed.
        !isDisabled &&
          "hover:bg-intent-neutral-surface-hover",
        isDisabled &&
          "cursor-not-allowed text-content-disabled",
        FOCUS_RING_CLASS,
      )}
      disabled={isDisabled}
      onClick={() => {
        onSelect()

        // Choosing dismisses. A menu that stays open after an action
        // has fired is the one interaction users read as "it didn't
        // work", and every one of the fleet's menus closes here
        // today by unmounting its whole parent.
        onDismiss()
      }}
      ref={(element) => {
        trackElement(key, element)
      }}
      role="menuitem"
      tabIndex={tabIndex}
      type="button"
    >
      {icon === undefined ? null : (
        <span
          // Decoration beside the item's own text. An icon that
          // announces itself turns "Delete" into "trash Delete".
          aria-hidden="true"
          className="shrink-0 text-content-secondary"
        >
          {icon}
        </span>
      )}

      {label}
    </button>
  )
}
