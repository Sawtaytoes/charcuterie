import type { ControlSize } from "@charcuterie/tokens"
import type { Placement } from "@floating-ui/react"
import type { ReactNode } from "react"

import { Nav } from "../Nav/Nav.tsx"
import type { NavItem } from "../Nav/navItems.ts"

/**
 * @deprecated Use `Nav`'s `NavItem`. Removed in the next major.
 */
export type NavBarItem = NavItem

/**
 * @deprecated Use `NavProps` with `layout="bar"`. Removed in the
 * next major.
 */
export type NavBarProps = {
  className?: string
  currentHref?: string
  isMenuVisible?: boolean
  items: readonly NavBarItem[]
  label: string
  menuAlign?: "end" | "start"
  menuIcon?: ReactNode
  menuLabel?: string
  menuPlacement?: Placement
  size?: ControlSize
}

/**
 * @deprecated Use `Nav` with `layout="bar"` — which is `Nav`'s
 * default, so `<Nav activeHref={…} items={…} label="Main" />` is the
 * whole migration. **Removed in the next major.**
 *
 * This is now a thin adapter over `Nav` and keeps every behaviour it
 * shipped with: the measured whole-row fold, the real `<a href>` in
 * both the bar and the panel, and the same props under the same
 * names. Only two things differ, and both are fixes:
 *
 * 1. `currentHref` is `activeHref` on `Nav`.
 * 2. **Two items can no longer both be current.** This component
 *    asked the question once per item, so a bar holding `/settings`
 *    and `/settings/labels` marked *both* while the reader was on
 *    the deeper one — against its own decision record, which says a
 *    nav with two current items has stopped saying anything. `Nav`
 *    takes the deepest match. If an app was relying on the parent
 *    also lighting up, it was relying on a defect.
 *
 * ## Why it went away
 *
 * It answered half the question. A horizontal row that folds is one
 * shape an app's destinations take; a labelled side rail, a
 * collapsed icon rail and a Narrow-View bottom strip are the others,
 * and this component could not become any of them — so an app that
 * wanted a rail was back to hand-rolling, which is the state this
 * was built to end. `Nav` is the same list drawn in whichever of the
 * five places fits, and `useNavLayout` is the width rule that says
 * which.
 */
export const NavBar = ({
  className,
  currentHref,
  isMenuVisible,
  items,
  label,
  menuAlign,
  menuIcon,
  menuLabel,
  menuPlacement,
  size,
}: NavBarProps): ReactNode => (
  <Nav
    activeHref={currentHref}
    className={className}
    isMenuVisible={isMenuVisible}
    items={items}
    label={label}
    layout="bar"
    menuAlign={menuAlign}
    menuIcon={menuIcon}
    menuLabel={menuLabel}
    menuPlacement={menuPlacement}
    size={size}
  />
)
