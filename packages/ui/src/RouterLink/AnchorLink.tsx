import type { ReactNode } from "react"

import type { RouterLinkProps } from "./routerLink.ts"

/**
 * A plain `<a href>`, and the default every link component falls
 * back to.
 *
 * It is the context's default value rather than a `null` check at
 * each call site, which is what makes "no router installed" a
 * configuration rather than a code path: `TextLink` and `ButtonLink`
 * render `useRouterLink()` unconditionally and behave identically
 * with and without a provider.
 *
 * It is also what a routed component falls back *to* for a
 * destination the router must not intercept — see `getIsRoutedHref`.
 */
export const AnchorLink = ({
  href,
  ...anchorProps
}: RouterLinkProps): ReactNode => (
  <a {...anchorProps} href={href} />
)
