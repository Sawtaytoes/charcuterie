import type { ControlSize } from "@charcuterie/tokens"
import type { MouseEvent, ReactNode } from "react"

import {
  CONTROL_SIZE_CLASS,
  PANEL_ITEM_SIZE_CLASS,
} from "../controlStyles.ts"
import { FOCUS_RING_CLASS } from "../intentStyles.ts"
import { useRouterLink } from "../RouterLink/RouterLinkProvider.tsx"
import { getIsRoutedHref } from "../RouterLink/routerLink.ts"
import { toClassName } from "../toClassName.ts"
import type { NavBarItem } from "./NavBar.tsx"

export type NavBarLinkProps = {
  isCurrent: boolean
  item: NavBarItem
  /**
   * Fires when the reader activates this link **in a way that keeps
   * them on the page** — a plain left click, Enter, Space. It is
   * what closes the collapsed panel behind them.
   *
   * A modified click (ctrl, meta, shift, alt) opens a new tab and
   * leaves this document exactly where it was, so it deliberately
   * does not fire: shutting the menu the reader is still working
   * through is the behaviour that makes people stop ctrl-clicking.
   */
  onNavigate?: () => void
  /** Where it is drawn. A bar row and a panel row paint differently. */
  placement: "bar" | "panel"
  size: ControlSize
  /** Hands the bar row's box to the measuring hook. Bar only. */
  trackElement?: (
    key: string,
    element: HTMLElement | null,
  ) => void
}

/**
 * One destination, drawn either in the bar or in the collapsed
 * panel — and it is a real `<a href>` in both.
 *
 * That is the whole reason this component exists rather than the
 * `Menu` a collapsed `Toolbar` opens: `MenuItem` is `{ label,
 * onSelect }`, so a nav folded into one becomes a row of
 * `<button>`s. It looks identical in a screenshot and it loses
 * middle-click, ctrl-click, "open in a new tab", "copy link
 * address", the status bar, and the browser's own visited styling.
 * `BuildingAnApp.mdx` names `<button onClick={navigate}>` as the
 * fleet's most common navigation defect; a collapse mechanism that
 * introduced it at narrow widths would be that defect on a timer.
 *
 * The router seam is `ButtonLink`'s, unchanged: an external
 * destination or a fragment falls back to a plain anchor rather than
 * being pushed onto a history stack that has no route for it.
 */
export const NavBarLink = ({
  isCurrent,
  item,
  onNavigate,
  placement,
  size,
  trackElement,
}: NavBarLinkProps): ReactNode => {
  const RouterLink = useRouterLink()

  const LinkElement = getIsRoutedHref(item.href)
    ? RouterLink
    : "a"

  const className =
    placement === "bar"
      ? toClassName(
          "inline-flex shrink-0 items-center rounded-md border border-transparent whitespace-nowrap transition-colors duration-(--duration-fast) ease-standard",
          CONTROL_SIZE_CLASS[size],
          // Two written-out entries rather than one interpolated
          // string, the same rule `SegmentedOption` follows:
          // Tailwind's scanner cannot see a class that exists only
          // at runtime, and `tailwindCandidates.test.ts` rejects a
          // template literal in a className outright.
          isCurrent
            ? "bg-intent-neutral-surface font-medium text-content-primary"
            : "text-content-secondary hover:bg-intent-neutral-surface hover:text-content-primary",
          FOCUS_RING_CLASS,
        )
      : toClassName(
          "flex w-full items-center rounded-sm text-start transition-colors duration-(--duration-fast) ease-standard",
          PANEL_ITEM_SIZE_CLASS[size],
          // `-hover`, not the plain surface: the panel is drawn on
          // `surface-overlay`, which every dark scheme paints
          // *lighter* than the base tint, so the plain one reads as
          // no change at all. Same correction `MenuAction` carries.
          isCurrent
            ? "bg-intent-neutral-surface-hover font-medium text-content-primary"
            : "text-content-primary hover:bg-intent-neutral-surface-hover",
          FOCUS_RING_CLASS,
        )

  return (
    <LinkElement
      // The platform's own "you are here", and the reason the paint
      // above is never the only signal: a highlight is invisible to
      // a screen reader and to anyone who cannot tell the two
      // surfaces apart.
      aria-current={isCurrent ? "page" : undefined}
      className={className}
      href={item.href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        ) {
          return
        }

        onNavigate?.()
      }}
      ref={(element: HTMLAnchorElement | null) => {
        trackElement?.(item.key ?? item.href, element)
      }}
    >
      {item.icon === undefined ? null : (
        // Decoration beside the item's own text. An icon that
        // announces itself turns "Settings" into "gear Settings".
        <span
          aria-hidden="true"
          className="shrink-0 text-content-secondary"
        >
          {item.icon}
        </span>
      )}

      {item.label}
    </LinkElement>
  )
}
