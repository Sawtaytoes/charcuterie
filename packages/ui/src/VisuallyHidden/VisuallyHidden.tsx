import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { toClassName } from "../toClassName.ts"

export type VisuallyHiddenProps =
  ComponentPropsWithRef<"span"> & {
    children: ReactNode
  }

/**
 * Text for assistive technology and for nobody else.
 *
 * A Layer-0 primitive, and the one every other component in M3
 * leans on: it is how a `Spinner` says "Loading…" without printing
 * it, how an `IconButton`'s glyph gets a name, and how a
 * `ProgressBar`'s label stays discoverable when the design does not
 * show it. Without it the alternative is `aria-label` everywhere,
 * which silently loses translation and cannot hold markup.
 *
 * `sr-only` is Tailwind's own — the clip-rect technique, unchanged
 * since it was `.visuallyhidden` in HTML5 Boilerplate. There is
 * nothing to own here, and owning it would mean maintaining a
 * clip-rect against browsers that have already agreed.
 *
 * Never `display: none` and never `visibility: hidden`: both remove
 * the node from the accessibility tree, which is the exact opposite
 * of the requirement.
 */
export const VisuallyHidden = ({
  children,
  className,
  ...spanProps
}: VisuallyHiddenProps): ReactNode => (
  <span
    {...spanProps}
    className={toClassName("sr-only", className)}
  >
    {children}
  </span>
)
