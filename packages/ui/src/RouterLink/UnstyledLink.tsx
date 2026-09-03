import type { ReactNode } from "react"

import { AnchorLink } from "./AnchorLink.tsx"
import { useRouterLink } from "./RouterLinkProvider.tsx"
import {
  getIsRoutedHref,
  type RouterLinkProps,
} from "./routerLink.ts"

export type UnstyledLinkProps = RouterLinkProps

/**
 * A router-aware link that owns no paint.
 *
 * Use this only when the caller already owns the complete visual
 * treatment. `TextLink` and `ButtonLink` remain the defaults for the
 * two link appearances the library owns.
 *
 * An in-app destination goes through the injected router. Another
 * origin, another scheme, or a same-page fragment stays a platform
 * anchor. With no provider, the injected component is `AnchorLink`,
 * so this remains a working `<a href>` in Storybook and tests.
 */
export const UnstyledLink = ({
  href,
  ...linkProps
}: UnstyledLinkProps): ReactNode => {
  const RouterLink = useRouterLink()
  const LinkElement = getIsRoutedHref(href)
    ? RouterLink
    : AnchorLink

  return <LinkElement {...linkProps} href={href} />
}
