import type { ReactNode } from "react"

import { useRouterLink } from "../RouterLink/RouterLinkProvider.tsx"
import { getIsRoutedHref } from "../RouterLink/routerLink.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import type {
  TabLinkItem,
  TabsOrientation,
} from "./tabItems.ts"
import { toTabTriggerClass } from "./tabStyles.ts"

export type TabLinkProps = {
  isCurrent: boolean
  item: TabLinkItem
  orientation: TabsOrientation
}

/**
 * One routed tab — and it is a real `<a href>`, through the same
 * `RouterLinkProvider` seam `NavLink` uses.
 *
 * ### It carries no `role="tab"`, and that is the whole point
 *
 * `role="tab"` on an anchor **overrides** the link role. A screen
 * reader then announces "tab", the reader expects a panel to appear
 * beside it, and instead the address changes and the page under it
 * is replaced. The APG tab pattern describes a disclosure inside one
 * document; it does not describe navigation, and `aria-controls`
 * has nothing to point at here because the section's content comes
 * from the router — an `<Outlet />` the app renders somewhere this
 * component cannot see.
 *
 * So a routed bar is what it actually is: a list of links inside a
 * named `<nav>`, with `aria-current="page"` on the one you are on.
 * That is `Nav`'s answer, and reusing it rather than restating it is
 * why `resolveActiveKey` decides the current item.
 *
 * What the tab pattern was *really* supplying here was the paint,
 * and the paint is shared through `toTabTriggerClass` — so this
 * looks identical to the `<button>` beside it in Storybook and is
 * announced correctly.
 */
export const TabLink = ({
  isCurrent,
  item,
  orientation,
}: TabLinkProps): ReactNode => {
  const RouterLink = useRouterLink()

  const { href, icon, isDisabled = false, label } = item

  const isExternal = item.isExternal === true

  const className = toTabTriggerClass({
    isDisabled,
    isSelected: isCurrent,
    orientation,
  })

  const content = (
    <>
      {icon === undefined ? null : (
        // Decoration beside the item's own text. An icon that
        // announces itself turns "Settings" into "gear Settings".
        <span
          aria-hidden="true"
          className="flex shrink-0 text-content-secondary"
        >
          {icon}
        </span>
      )}

      {label}

      {isExternal ? (
        <VisuallyHidden>
          {" "}
          (opens in a new tab)
        </VisuallyHidden>
      ) : null}
    </>
  )

  if (isDisabled) {
    // Not a link at all, rather than a link with a `disabled`
    // attribute an anchor does not have. `aria-disabled` alone on a
    // real `<a href>` still navigates on Enter, which is the version
    // of this that looks right and is not.
    return (
      <span
        aria-disabled="true"
        className={toClassName(
          "inline-flex shrink-0 items-center gap-2",
          className,
        )}
      >
        {content}
      </span>
    )
  }

  const LinkElement =
    isExternal || !getIsRoutedHref(href) ? "a" : RouterLink

  return (
    <LinkElement
      // The platform's own "you are here", and the reason the paint
      // is never the only signal: an underline is invisible to a
      // screen reader and to anyone who cannot tell the two colours
      // apart.
      aria-current={isCurrent ? "page" : undefined}
      className={toClassName(
        "inline-flex shrink-0 items-center gap-2 no-underline",
        className,
      )}
      href={href}
      // No `onClick`, deliberately — unlike `NavLink`, which has a
      // panel to close behind the reader. A routed tab bar stays on
      // screen across the navigation, so there is nothing to react
      // to and a handler here would only be something to keep.
      //
      // `noreferrer` beside `noopener` on purpose: one closes the
      // `window.opener` hole, the other stops this app's address
      // leaking as the referrer to a product it does not own.
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {content}
    </LinkElement>
  )
}
