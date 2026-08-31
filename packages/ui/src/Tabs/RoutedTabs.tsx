import type { ReactNode } from "react"

import {
  getNavItemKey,
  resolveActiveKey,
} from "../Nav/navItems.ts"
import { toClassName } from "../toClassName.ts"
import { TabLink } from "./TabLink.tsx"
import type { TabsLinkProps } from "./Tabs.tsx"
import { toTabListClass } from "./tabStyles.ts"

/**
 * The routed bar: a named `<nav>` of real links wearing the tab
 * paint.
 *
 * There is **no state here at all**, and that is the difference that
 * matters rather than a saving. A panel bar owns its choice because
 * nothing else knows it; a routed bar's choice is the address, so
 * owning a copy would give the app two answers that can disagree —
 * the Back button being the first thing to prove it.
 *
 * `resolveActiveKey` is `Nav`'s rule, imported rather than restated:
 * whole-segment matching, the deepest match wins, the root is exact,
 * an external item is never current, and the query string is not
 * part of the answer.
 */
export const RoutedTabs = ({
  activeHref,
  className,
  label,
  orientation = "horizontal",
  tabs,
}: TabsLinkProps): ReactNode => {
  const activeKey = resolveActiveKey(tabs, activeHref)

  return (
    <nav
      aria-label={label}
      className={toClassName(
        toTabListClass(orientation),
        className,
      )}
    >
      {tabs.map((tab) => {
        const key = getNavItemKey(tab)

        return (
          <TabLink
            isCurrent={key === activeKey}
            item={tab}
            key={key}
            orientation={orientation}
          />
        )
      })}
    </nav>
  )
}
