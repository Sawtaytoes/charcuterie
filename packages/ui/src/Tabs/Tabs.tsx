import type { ReactNode } from "react"

import { PanelTabs } from "./PanelTabs.tsx"
import { RoutedTabs } from "./RoutedTabs.tsx"
import type {
  TabItem,
  TabLinkItem,
  TabsActivation,
  TabsOrientation,
} from "./tabItems.ts"

type TabsCommonProps = {
  className?: string
  /** The tab bar's accessible name. Required. */
  label: string
  orientation?: TabsOrientation
}

export type TabsPanelProps = TabsCommonProps & {
  /** **Initial** only. Charcuterie owns it from then on. */
  activeKey?: string
  /**
   * `automatic` — the ARIA Authoring Practices default — shows a
   * panel as soon as the arrow keys reach its tab. `manual` moves
   * focus only, and Enter or Space commits.
   *
   * The distinction exists because **focus is not selection**, and
   * it is the entire reason `RovingFocus` is its own state kind. A
   * tab whose panel costs a network request wants `manual`, and
   * the two modes differ by one line below — because two kinds are
   * composed rather than one kind doing both jobs badly.
   */
  activation?: TabsActivation
  onChange?: (activeKey: string | null) => void
  tabs: readonly TabItem[]
}

export type TabsLinkProps = TabsCommonProps & {
  /**
   * The address the app is at — usually `location.pathname`. The tab
   * whose `href` matches wears `aria-current="page"`.
   *
   * **Required, and it is the discriminant.** `Nav` leaves the
   * equivalent optional because a top-level bar is honest about
   * naming nothing on a screen it does not contain. A routed tab bar
   * is drawn *inside* the section it divides, so "none of these" is
   * not a state it has; an app that wants it passes a path that
   * matches no tab.
   */
  activeHref: string
  tabs: readonly TabLinkItem[]
}

/**
 * The union splits on `activeHref`, which only the routed member
 * has. `tabs` alone could not carry the split — TypeScript does not
 * narrow a union by the shape of an array's elements, so a mixed bar
 * would type-check and then render half a navigation.
 */
export type TabsProps = TabsLinkProps | TabsPanelProps

const getIsRoutedProps = (
  props: TabsProps,
): props is TabsLinkProps => "activeHref" in props

/**
 * One choice out of a handful, all of them on screen at once — and
 * the choice is either a **panel** this component reveals or a
 * **place** the router goes to.
 *
 * ```tsx
 * // A section of this screen. Nothing outside knows about it.
 * <Tabs label="Bay 3" tabs={[{ key: "log", label: "Log", content: … }]} />
 *
 * // A section that has an address.
 * <Tabs
 *   activeHref={pathname}
 *   label="Anime Release Watch sections"
 *   tabs={[{ href: "/projects/1/tasks", label: "Tasks" }]}
 * />
 * <Outlet />
 * ```
 *
 * ## Which one, and the question is not "how does it look"
 *
 * **Does this section have an address?** If reloading the page, or
 * opening it in a second tab, or pressing Back has to land the
 * reader back on the same section, it is routed and every tab is an
 * `<a href>`. If the section is a disclosure inside one screen —
 * Settings' groups, a card's detail — it is a panel and every tab is
 * a `<button>`.
 *
 * The two are drawn identically on purpose, through
 * `toTabTriggerClass`. Docket had one of each on adjacent screens
 * wearing different paint, because the routed one had to be built
 * out of `Nav` and `Nav`'s current item is a filled pill
 * ([decision](../../../../docs/decisions/2026-08-31-a-routed-tab-is-a-tab-with-an-href.md)).
 *
 * ## `Nav` is still the app's destinations
 *
 * This is **sub**-navigation: the sections of the screen you are
 * already on. The app's own destinations — the header row, the side
 * rail, the narrow view's menu — are `Nav` + `useNavLayout`, and
 * that has not moved
 * ([decision](../../../../docs/decisions/2026-08-27-nav-is-the-one-navigation-component-and-navbar-is-deprecated.md)).
 * A routed `Tabs` renders no rail, no fold and no menu, because a
 * bar dividing one screen has nowhere to fold to.
 *
 * ## The routed bar is not a `tablist`, and that is deliberate
 *
 * `role="tab"` on an anchor overrides the link role, so a screen
 * reader announces a disclosure and the address changes instead. See
 * `TabLink`. The routed bar is a `<nav>` of links with
 * `aria-current="page"`; the panel bar below keeps the full APG
 * pattern, `aria-controls` and all.
 *
 * ## The panel bar: kept at P0 as the state layer's falsification test
 *
 * Not on duplication grounds — the fifteen ad-hoc tab bars that used
 * to justify it were in the withdrawn evidence. What it has to prove
 * is that two kinds compose: one says which tab is **chosen**, the
 * other says which tab is **tabbable**, and a tab bar needs both at
 * once *and* needs them to disagree on purpose while a user arrows
 * around in `manual` mode. `PanelTabs` is where that lives.
 */
export const Tabs = (props: TabsProps): ReactNode =>
  getIsRoutedProps(props) ? (
    <RoutedTabs {...props} />
  ) : (
    <PanelTabs {...props} />
  )
