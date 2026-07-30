import type { ReactNode } from "react"
import { useEffect } from "react"

import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { TabItem, TabsOrientation } from "./Tabs.tsx"

/**
 * The selected marker runs along the edge the tab list itself
 * sits on — under a horizontal bar, down the inline-end of a
 * vertical rail — and the negative margin pulls it over the
 * list's own border so the two read as one line rather than two.
 *
 * Logical properties throughout, which is the house rule and also
 * the only way a vertical rail lands on the correct side in RTL.
 */
const ORIENTATION_EDGE_CLASS: Record<
  TabsOrientation,
  { base: string; selected: string }
> = {
  horizontal: {
    base: "-mb-px border-b-2",
    selected: "border-b-intent-accent-solid",
  },
  vertical: {
    base: "-me-px border-e-2 text-start",
    selected: "border-e-intent-accent-solid",
  },
}

export type TabTriggerProps = {
  id: string
  isSelected: boolean
  onSelect: (key: string) => void
  orientation: TabsOrientation
  panelId: string
  /** `RovingFocus.register` — membership of the arrow-key group. */
  registerFocus: (value: string) => () => void
  /** `VisibilityGroup.register` — membership of the panel group. */
  registerPanel: (key: string) => () => void
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
 * joins the *panel* group — it still owns a panel and an id — and
 * stays out of the *focus* group, so the arrow keys skip it
 * without any command in `RovingFocus` having to know what
 * "disabled" means. Registration is membership; that is the whole
 * mechanism.
 */
export const TabTrigger = ({
  id,
  isSelected,
  onSelect,
  orientation,
  panelId,
  registerFocus,
  registerPanel,
  tab,
  tabIndex,
  trackElement,
}: TabTriggerProps): ReactNode => {
  const { isDisabled = false, key, label } = tab

  const edge = ORIENTATION_EDGE_CLASS[orientation]

  useEffect(() => registerPanel(key), [key, registerPanel])

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
        "cursor-pointer border-transparent px-3 py-2 font-medium text-sm whitespace-nowrap transition-colors duration-(--duration-fast) ease-standard",
        edge.base,
        // Two entries rather than one interpolated string:
        // `tailwindCandidates.test.ts` rejects a template literal
        // in a className outright, because Tailwind's scanner
        // cannot see a class that only exists at runtime.
        isSelected && edge.selected,
        isSelected
          ? "text-content-primary"
          : "text-content-secondary hover:text-content-primary",
        isDisabled &&
          "cursor-not-allowed text-content-disabled hover:text-content-disabled",
        FOCUS_RING_CLASS,
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
