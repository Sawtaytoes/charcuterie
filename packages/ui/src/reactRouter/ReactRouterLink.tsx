import type { ReactNode } from "react"
import { Link } from "react-router"

import type { RouterLinkProps } from "../RouterLink/routerLink.ts"

/**
 * react-router's `<Link>`, wearing the seam's `href`.
 *
 * The entire adapter, and that is the point: the seam's contract is
 * "a component that takes `href`", so an adapter is a rename. wouter,
 * TanStack Router, and a hand-rolled router each get the same four
 * lines, written in the app rather than here.
 *
 * `to` versus `href` is the only mismatch worth naming. Everything
 * else — `className`, `rel`, `target`, `aria-*`, the ref — passes
 * through untouched, because react-router renders a real `<a>` and
 * forwards what it does not understand.
 *
 * Imported from `react-router`, not `react-router-dom`. v7 and v8
 * both export `Link` from the former, and `react-router-dom` v7 (what
 * bambuddy has) is a re-export shim over exactly that module — so one
 * import covers both installs, while naming `react-router-dom` would
 * cover only one.
 */
export const ReactRouterLink = ({
  href,
  ...linkProps
}: RouterLinkProps): ReactNode => (
  <Link {...linkProps} to={href} />
)
