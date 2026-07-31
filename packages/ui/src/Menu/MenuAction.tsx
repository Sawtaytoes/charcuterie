import type { ReactNode } from "react"
import { useEffect } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { MenuItem } from "./Menu.tsx"

export type MenuActionProps = {
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
        "flex w-full cursor-pointer items-center gap-2 rounded-sm bg-transparent px-2 py-1.5 text-start text-content-primary text-sm transition-colors duration-(--duration-fast) ease-standard",
        "hover:bg-intent-neutral-surface",
        isDisabled &&
          "cursor-not-allowed text-content-disabled hover:bg-transparent",
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
