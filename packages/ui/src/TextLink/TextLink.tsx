import type { IntentName } from "@charcuterie/tokens"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"

import {
  FOCUS_RING_CLASS,
  INTENT_CONTENT_CLASS,
} from "../intentStyles.ts"
import { useRouterLink } from "../RouterLink/RouterLinkProvider.tsx"
import { getIsRoutedHref } from "../RouterLink/routerLink.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

/**
 * Two ways a link sits in a layout, and the difference is real rather
 * than decorative.
 *
 *  - `inline` lives **inside a sentence**. It is `display: inline`, so
 *    it wraps across lines with the prose around it, it inherits the
 *    surrounding font size rather than declaring one, and it is
 *    underlined — because inside a paragraph, colour alone is the
 *    thing WCAG 1.4.1 says cannot carry the meaning on its own.
 *  - `standalone` is **its own element**: a back-link, a nav item, a
 *    "view all" beside a heading. It is an inline flex box so an
 *    `iconStart` sits on the text's centre line with a real gap, and
 *    it underlines on hover instead of permanently — a column of
 *    permanently-underlined nav items reads as a mistake.
 */
export type TextLinkAppearance = "inline" | "standalone"

export type TextLinkProps = Omit<
  ComponentPropsWithRef<"a">,
  "href"
> & {
  appearance?: TextLinkAppearance
  /**
   * Required, and required even when disabled — a navigation that
   * cannot say where it goes is a button wearing a link's clothes.
   */
  href: string
  iconEnd?: ReactNode
  /**
   * The back-arrow, supplied by the app. The library ships no glyphs
   * — see
   * `docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md`
   * — and the seven repos that hand-roll a `← Back` today already own
   * the character they want.
   */
  iconStart?: ReactNode
  intent?: IntentName
  isDisabled?: boolean
  isExternal?: boolean
  /** What `isExternal` announces. Not shown. */
  newTabLabel?: string
}

const TEXT_LINK_APPEARANCE_CLASS: Record<
  TextLinkAppearance,
  string
> = {
  // No `text-*` of its own: an inline link that resized itself would
  // be a hole in whatever type scale the paragraph is set in.
  inline:
    "underline decoration-1 underline-offset-2 hover:decoration-2",
  standalone:
    "inline-flex items-center gap-1 font-medium no-underline underline-offset-2 hover:underline",
}

/**
 * Hover changes the **underline**, never the colour, and there is no
 * hover-tinted background either.
 *
 * A text link has no box to fill, so `INTENT_HOVER_CLASS` — which
 * lands on the intent's tinted surface — would paint a coloured
 * rectangle around a word mid-sentence. And there is no
 * `intent.*.content-hover` token to shift the text to: the ramp goes
 * `surface` / `surface-hover` / `border` / `content` / `solid` /
 * `solid-hover` / `on-solid`, so a hover colour here would have to be
 * invented, and an invented colour is one the contrast gate has never
 * measured. Underline weight is free of both problems and shifts no
 * layout.
 */
const TEXT_LINK_BASE_CLASS = "cursor-pointer rounded-xs"

/**
 * The disabled paint, keyed off `aria-disabled` because an `<a>` has
 * no `:disabled` to match. See `ARIA_DISABLED_CLASS` — this is its
 * text-shaped twin, minus the box treatment a run of prose has no
 * room for.
 */
const TEXT_LINK_ARIA_DISABLED_CLASS =
  "aria-disabled:pointer-events-none aria-disabled:text-content-disabled aria-disabled:no-underline"

/**
 * Navigation that looks like a link.
 *
 * The fleet has **seven repos** hand-rolling a back-link — each with
 * its own `←`, its own hover rule, and its own idea of whether focus
 * is visible — and points-market's header title is a clickable
 * `<div>`. This is the thing to reach for instead, and the reason the
 * split with `ButtonLink` exists at all: the two differ in **paint,
 * not semantics**. Both render a real `<a href>`; picking between
 * them is picking how it looks, which is a decision an agent can make
 * correctly from the name alone
 * ([decision](../../../docs/decisions/2026-08-10-buttons-are-actions-links-are-navigation.md)).
 *
 * What it does not do is as load-bearing as what it does:
 *
 *  - **No `onClick`-only mode.** If it does not navigate, it is a
 *    `Button` with `appearance="ghost"`, not a link.
 *  - **No `size`.** Text takes the size of the text around it. A
 *    standalone link that wants `text-sm` gets it from the block it
 *    sits in, or from `className`.
 *  - **No colour change on hover.** See `TEXT_LINK_BASE_CLASS`.
 *
 * `isDisabled` drops `href` rather than shipping a focusable anchor
 * that ignores clicks; `role="link"` + `aria-disabled` keeps it
 * announced. Rarer here than on `ButtonLink` — a dead link in a
 * sentence is usually better written as plain text.
 */
export const TextLink = ({
  appearance = "inline",
  children,
  className,
  href,
  iconEnd,
  iconStart,
  intent = "accent",
  isDisabled = false,
  isExternal = false,
  newTabLabel = "(opens in a new tab)",
  ...anchorProps
}: TextLinkProps): ReactNode => {
  const RouterLink = useRouterLink()

  // An external destination or a fragment is never the router's, and
  // a disabled one goes nowhere at all — each falls back to the plain
  // anchor below rather than through the injected component.
  const LinkElement =
    isExternal || !getIsRoutedHref(href) ? "a" : RouterLink

  const linkClassName = toClassName(
    TEXT_LINK_BASE_CLASS,
    TEXT_LINK_APPEARANCE_CLASS[appearance],
    INTENT_CONTENT_CLASS[intent],
    FOCUS_RING_CLASS,
    TEXT_LINK_ARIA_DISABLED_CLASS,
    className,
  )

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
        className={linkClassName}
        role="link"
      >
        {content}
      </a>
    )
  }

  return (
    <LinkElement
      {...anchorProps}
      className={linkClassName}
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
