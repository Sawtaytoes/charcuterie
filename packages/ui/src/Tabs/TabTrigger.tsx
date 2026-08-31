import type { ReactNode } from "react"
import { useEffect } from "react"

import { toClassName } from "../toClassName.ts"
import type {
  TabItem,
  TabsOrientation,
} from "./tabItems.ts"
import { toTabTriggerClass } from "./tabStyles.ts"

export type TabTriggerProps = {
  id: string
  isSelected: boolean
  onSelect: (key: string) => void
  orientation: TabsOrientation
  panelId: string
  /** `RovingFocus.register` — membership of the arrow-key group. */
  registerFocus: (value: string) => () => void
  /** `SinglePicker.register` — membership of the choice. */
  registerSelection: (value: string) => () => void
  tab: TabItem
  tabIndex: number
  trackElement: (
    key: string,
    element: HTMLButtonElement | null,
  ) => void
}

/**
 * Its own file for a reason that is not style: **both
 * registrations are effects**, and an effect cannot run in a loop.
 * Any member of a registering group ends up shaped like this, so
 * it is worth seeing on its own.
 *
 * The two registrations are separate on purpose. A disabled tab
 * joins the *choice* — it is still one of the options, still owns
 * a panel and an id, and can still be the one selected when a
 * consumer says so — and stays out of the *focus* group, so the
 * arrow keys skip it without any command in `RovingFocus` having
 * to know what "disabled" means. Registration is membership; that
 * is the whole mechanism.
 */
export const TabTrigger = ({
  id,
  isSelected,
  onSelect,
  orientation,
  panelId,
  registerFocus,
  registerSelection,
  tab,
  tabIndex,
  trackElement,
}: TabTriggerProps): ReactNode => {
  const { isDisabled = false, key, label } = tab

  useEffect(
    () => registerSelection(key),
    [key, registerSelection],
  )

  useEffect(() => {
    if (isDisabled) {
      return
    }

    return registerFocus(key)
  }, [isDisabled, key, registerFocus])

  return (
    <button
      aria-controls={panelId}
      aria-selected={isSelected}
      className={toClassName(
        "cursor-pointer",
        toTabTriggerClass({
          isDisabled,
          isSelected,
          orientation,
        }),
      )}
      disabled={isDisabled}
      id={id}
      onClick={() => {
        onSelect(key)
      }}
      ref={(element) => {
        trackElement(key, element)
      }}
      role="tab"
      tabIndex={tabIndex}
      type="button"
    >
      {label}
    </button>
  )
}
