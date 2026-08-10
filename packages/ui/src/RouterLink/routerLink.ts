/**
 * The shape of the thing a router injects, and the one question the
 * link components ask before they use it.
 *
 * Types live here rather than beside either implementation so
 * `AnchorLink` (the default) and `RouterLinkProvider` (which defaults
 * to it) can both name them without importing each other.
 */

import type {
  ComponentPropsWithRef,
  ComponentType,
} from "react"

/**
 * `href`, not `to`.
 *
 * The library is router-agnostic and the platform's word for a
 * destination is `href` — so the contract is the DOM's, and each
 * adapter renames it on the way in (`ReactRouterLink` maps `href` to
 * react-router's `to`). Injecting a component whose prop is `to`
 * would make `@charcuterie/ui`'s own API a mirror of one router's.
 */
export type RouterLinkProps = Omit<
  ComponentPropsWithRef<"a">,
  "href"
> & {
  href: string
}

export type RouterLinkComponent =
  ComponentType<RouterLinkProps>

/**
 * Whether this destination is the injected router's to handle.
 *
 * A router's `<Link>` intercepts the click and pushes history, which
 * is right for `/settings` and wrong for three cases it cannot serve:
 *
 *  - **Another origin or another scheme** — `https://…`, `mailto:`,
 *    `tel:`, protocol-relative `//cdn…`. Pushing those onto the
 *    history stack navigates the SPA to a route that does not exist.
 *  - **A same-page fragment** — `#credits`. The browser's own
 *    scroll-to-id is the behaviour a reader expects; a router turns
 *    it into a route change.
 *
 * Everything else — `/x`, `x`, `?sort=name` — is the router's.
 *
 * Deliberately a *destination* test rather than a prop: a component
 * that routed whatever it was given would make `isExternal` a
 * correctness switch instead of a presentation one, and an app that
 * forgot it would ship a broken link rather than a slightly plain
 * one.
 */
export const getIsRoutedHref = (href: string): boolean =>
  !/^(?:[a-z][a-z\d+\-.]*:|\/\/|#)/i.test(href)
