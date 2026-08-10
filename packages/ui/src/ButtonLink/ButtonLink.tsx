import type {
  ControlSize,
  IntentName,
} from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import { getControlClassName } from "../controlStyles.ts"
import type { IntentAppearance } from "../intentStyles.ts"
import { ARIA_DISABLED_CLASS } from "../intentStyles.ts"
import { useRouterLink } from "../RouterLink/RouterLinkProvider.tsx"
import { getIsRoutedHref } from "../RouterLink/routerLink.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

export type ButtonLinkProps = Omit<
  ComponentPropsWithRef<"a">,
  "href"
> & {
  appearance?: IntentAppearance
  /**
   * Required, and required even when disabled — a navigation that
   * cannot say where it goes is a button wearing a link's clothes.
   */
  href: string
  iconEnd?: ReactNode
  iconStart?: ReactNode
  intent?: IntentName
  isDisabled?: boolean
  isExternal?: boolean
  isFullWidth?: boolean
  /** What `isExternal` announces. Not shown. */
  newTabLabel?: string
  size?: ControlSize
}

/**
 * A navigation that looks like a button.
 *
 * This is Plex Channels' "Configure ›": it reads as the primary
 * action on the card, and it goes to another page — so it must be an
 * `<a href>` (middle-click, ctrl-click, "open in new tab", "copy link
 * address", and the status bar all come from the element, not from
 * the paint) while looking exactly like `Button`. Today that control
 * is a `<button onClick={() => navigate(…)}>`, which has none of
 * them.
 *
 * **Exactly like `Button` is structural, not aspirational.** Both
 * call `getControlClassName` with the same arguments, so there is one
 * class list, and `ButtonLink.test.tsx` compares the two elements'
 * *computed* styles rather than trusting that.
 *
 * Three things `Button` has that this deliberately does not:
 *
 *  - **`isLoading`.** A navigation has no pending state this
 *    component owns. The wait belongs to the destination — a router's
 *    transition, a `Suspense` boundary, a `ProgressBar` on the page
 *    being entered — and a spinner here would be this component
 *    lying about work it is not doing.
 *  - **`type`.** There is no form to submit.
 *  - **`sizing="icon"`.** An icon-only navigation is an `IconButton`
 *    problem — a glyph is not an accessible name — and solving it
 *    here would mean a second name-enforcing type.
 *
 * `isDisabled` drops `href` entirely rather than shipping a
 * focusable `<a>` that silently ignores clicks: an anchor with no
 * `href` is inert and out of the tab order by the platform's own
 * rules, and the explicit `role="link"` + `aria-disabled` keeps it
 * *announced* as a link that is currently unavailable rather than
 * vanishing from the accessibility tree. Reach for it rarely — a
 * destination that does not exist yet is usually better absent than
 * present-but-dead.
 */
export const ButtonLink = ({
  appearance = "solid",
  children,
  className,
  href,
  iconEnd,
  iconStart,
  intent = "accent",
  isDisabled = false,
  isExternal = false,
  isFullWidth = false,
  newTabLabel = "(opens in a new tab)",
  size = "md",
  ...anchorProps
}: ButtonLinkProps): ReactNode => {
  const RouterLink = useRouterLink()

  // An external destination or a fragment is never the router's, and
  // a disabled one goes nowhere at all — each falls back to the plain
  // anchor below rather than through the injected component.
  const LinkElement =
    isExternal || !getIsRoutedHref(href) ? "a" : RouterLink

  const controlClassName = getControlClassName({
    appearance,
    className,
    disabledClass: ARIA_DISABLED_CLASS,
    intent,
    isFullWidth,
    size,
    sizing: "control",
  })

  const content = (
    <>
      {iconStart}

      {children}

      {iconEnd}

      {isExternal ? (
        <VisuallyHidden>{newTabLabel}</VisuallyHidden>
      ) : null}
    </>
  )

  if (isDisabled) {
    return (
      <a
        {...anchorProps}
        aria-disabled="true"
        className={controlClassName}
        role="link"
      >
        {content}
      </a>
    )
  }

  return (
    <LinkElement
      {...anchorProps}
      className={controlClassName}
      href={href}
      // `noreferrer` alongside `noopener` on purpose: `noopener`
      // closes the `window.opener` hole, and `noreferrer` is what
      // keeps a private app's URL out of the destination's logs.
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {content}
    </LinkElement>
  )
}
