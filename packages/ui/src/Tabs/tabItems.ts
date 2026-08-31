import type { ReactNode } from "react"

import type { NavItem } from "../Nav/navItems.ts"

export type TabsActivation = "automatic" | "manual"

export type TabsOrientation = "horizontal" | "vertical"

/**
 * A tab that reveals a panel this component renders. The section
 * lives in memory, so leaving the screen and coming back starts over
 * — which is correct for a disclosure and wrong for a place.
 */
export type TabItem = {
  content: ReactNode
  /**
   * A disabled tab is simply **not registered** with the roving
   * group. Registration is membership, so the arrow keys skip it
   * without any command in `RovingFocus` having to know what
   * "disabled" means.
   */
  isDisabled?: boolean
  key: string
  label: ReactNode
}

/**
 * A tab that is a **place** — it has an address, and choosing it
 * changes the address.
 *
 * It is a `NavItem` with `isDisabled` added, and that is not
 * convenience: it means `resolveActiveKey` decides which routed tab
 * is current with the exact rule `Nav` uses, rather than a second
 * implementation of segment matching that drifts from it. `label`
 * narrows to `string` for the same reason it does on `NavItem` — it
 * is the accessible name of a link.
 */
export type TabLinkItem = NavItem & {
  isDisabled?: boolean
}
