import type { ReactNode } from "react"
import { createContext, useContext } from "react"

import { AnchorLink } from "./AnchorLink.tsx"
import type { RouterLinkComponent } from "./routerLink.ts"

/**
 * The router seam: one injection at the app root, and every
 * `TextLink` / `ButtonLink` in the tree navigates the app's own way.
 *
 * ### Why the library cannot just pick a router
 *
 * The fleet has five answers at once — react-router v8 (mux-magic),
 * react-router-dom v7 (bambuddy), wouter-preact (spoolbuddy), two
 * hand-rolled routers, and five apps with no router at all. A
 * dependency on any one of them would be wrong for four of the five,
 * and `@charcuterie/ui` taking a router as a runtime dependency is a
 * thing every consumer inherits.
 *
 * So the shape is the one `ColorSchemeSwitcher` already uses for the
 * browser: **the seam has a working default**. Nothing injected means
 * `AnchorLink` — a real `<a href>` that navigates by reloading, which
 * is correct, just not soft. An app that wants soft navigation
 * injects its router's link once:
 *
 * ```tsx
 * import { RouterLinkProvider } from "@charcuterie/ui"
 * import { ReactRouterLink } from "@charcuterie/ui/react-router"
 *
 * <RouterLinkProvider link={ReactRouterLink}>
 *   <App />
 * </RouterLinkProvider>
 * ```
 *
 * A router with no adapter here needs no adapter *from* here — the
 * contract is a component taking `href`, so a four-line wrapper in
 * the app is the whole integration. `Guides/Routing` shows both.
 *
 * ### It is deliberately not a hook the app calls
 *
 * `useNavigate` + `onClick` is what mux-magic and plex-channels do
 * today, and it is how a nav item stops being a link: no middle-click,
 * no ctrl-click, no "open in new tab", no status bar, nothing to copy.
 * Injecting a *component* keeps the `<a href>` — the router only gets
 * to intercept the plain-left-click that it can actually improve.
 */
const RouterLinkContext =
  createContext<RouterLinkComponent>(AnchorLink)

export const useRouterLink = (): RouterLinkComponent =>
  useContext(RouterLinkContext)

export const RouterLinkProvider = ({
  children,
  link,
}: {
  children: ReactNode
  /**
   * The app's link component, taking `href`. `ReactRouterLink` from
   * `@charcuterie/ui/react-router`, or the app's own four-line
   * wrapper around whatever it routes with.
   */
  link: RouterLinkComponent
}): ReactNode => (
  <RouterLinkContext.Provider value={link}>
    {children}
  </RouterLinkContext.Provider>
)
