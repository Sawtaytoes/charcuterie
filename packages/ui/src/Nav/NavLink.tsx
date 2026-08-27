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
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import type { NavItem } from "./navItems.ts"

/** Where the row is drawn. Each paints differently; all are links. */
export type NavLinkPlacement =
  | "bar"
  | "bottom"
  | "panel"
  | "rail"
  | "railIcons"

export type NavLinkProps = {
  isCurrent: boolean
  item: NavItem
  /**
   * Fires when the reader activates this link **in a way that keeps
   * them on the page** — a plain left click, Enter, Space. It is
   * what closes the panel behind them.
   *
   * A modified click (ctrl, meta, shift, alt) opens a new tab and
   * leaves this document exactly where it was, so it deliberately
   * does not fire: shutting the menu the reader is still working
   * through is the behaviour that makes people stop ctrl-clicking.
   */
  onNavigate?: () => void
  placement: NavLinkPlacement
  size: ControlSize
  /** Hands the bar row's box to the measuring hook. Bar only. */
  trackElement?: (element: HTMLElement | null) => void
}

const PLACEMENT_CLASS: Record<NavLinkPlacement, string> = {
  bar: "inline-flex shrink-0 items-center rounded-md border border-transparent whitespace-nowrap",
  // A foot-of-the-screen target is a thumb target, so it takes the
  // 44px WCAG 2.5.5 floor rather than a control height. It is a
  // genuinely standalone tap target and shares a row with nothing,
  // which is the case
  // `2026-08-05-controls-share-one-height-no-per-component-touch-floor`
  // reserves `MIN_TOUCH_TARGET_CLASS` for.
  bottom:
    "flex min-h-(--control-min-touch-target) flex-col items-center justify-center gap-1 rounded-none px-1 py-2 text-xs",
  panel: "flex w-full items-center rounded-sm text-start",
  rail: "flex w-full items-center rounded-md",
  // Square, and sized on both axes from the height token — the same
  // rule `ICON_CONTROL_SIZE_CLASS` states, so a collapsed rail item
  // and an `IconButton` beside it measure the same.
  railIcons:
    "flex size-(--control-height-lg) items-center justify-center rounded-md",
}

/**
 * `-hover` in the panel, not the plain surface: the panel is drawn
 * on `surface-overlay`, which every dark scheme paints *lighter*
 * than the base tint, so the plain one reads as no change at all.
 * Same correction `MenuAction` carries.
 */
const CURRENT_CLASS: Record<NavLinkPlacement, string> = {
  bar: "bg-intent-neutral-surface font-medium text-content-primary",
  bottom:
    "bg-intent-neutral-surface font-medium text-content-primary",
  panel:
    "bg-intent-neutral-surface-hover font-medium text-content-primary",
  rail: "bg-intent-neutral-surface font-medium text-content-primary",
  railIcons:
    "bg-intent-neutral-surface font-medium text-content-primary",
}

const RESTING_CLASS: Record<NavLinkPlacement, string> = {
  bar: "text-content-secondary hover:bg-intent-neutral-surface hover:text-content-primary",
  bottom:
    "text-content-secondary hover:bg-intent-neutral-surface hover:text-content-primary",
  panel:
    "text-content-primary hover:bg-intent-neutral-surface-hover",
  rail: "text-content-secondary hover:bg-intent-neutral-surface hover:text-content-primary",
  railIcons:
    "text-content-secondary hover:bg-intent-neutral-surface hover:text-content-primary",
}

/**
 * One destination — and it is a real `<a href>` in every placement.
 *
 * That is the whole reason this exists rather than the `Menu` a
 * collapsed `Toolbar` opens: `MenuItem` is `{ label, onSelect }`, so
 * a nav folded into one becomes a row of `<button>`s. It looks
 * identical in a screenshot and it loses middle-click, ctrl-click,
 * "open in a new tab", "copy link address", the status bar, and the
 * browser's own visited styling. `BuildingAnApp.mdx` names
 * `<button onClick={navigate}>` as the fleet's most common
 * navigation defect; a collapse mechanism that introduced it at
 * narrow widths would be that defect on a timer.
 *
 * The router seam is `ButtonLink`'s, unchanged: an external
 * destination or a fragment falls back to a plain anchor rather than
 * being pushed onto a history stack that has no route for it.
 */
export const NavLink = ({
  isCurrent,
  item,
  onNavigate,
  placement,
  size,
  trackElement,
}: NavLinkProps): ReactNode => {
  const RouterLink = useRouterLink()

  const isExternal = item.isExternal === true

  const LinkElement =
    isExternal || !getIsRoutedHref(item.href)
      ? "a"
      : RouterLink

  const isIconOnly = placement === "railIcons"

  const sizeClass =
    placement === "panel"
      ? PANEL_ITEM_SIZE_CLASS[size]
      : placement === "bar"
        ? CONTROL_SIZE_CLASS[size]
        : placement === "rail"
          ? "min-h-(--control-height-md) gap-(--control-gap-md) px-(--control-padding-inline-md) py-1.5 text-md"
          : ""

  return (
    <LinkElement
      // The platform's own "you are here", and the reason the paint
      // is never the only signal: a highlight is invisible to a
      // screen reader and to anyone who cannot tell the two surfaces
      // apart. A `font-weight` swap alone is the same WCAG 1.4.1
      // failure.
      aria-current={isCurrent ? "page" : undefined}
      className={toClassName(
        "no-underline transition-colors duration-(--duration-fast) ease-standard",
        PLACEMENT_CLASS[placement],
        sizeClass,
        // Two written-out entries rather than one interpolated
        // string, the same rule `SegmentedOption` follows:
        // Tailwind's scanner cannot see a class that exists only at
        // runtime, and `tailwindCandidates.test.ts` rejects a
        // template literal in a className outright.
        isCurrent
          ? CURRENT_CLASS[placement]
          : RESTING_CLASS[placement],
        FOCUS_RING_CLASS,
      )}
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
        trackElement?.(element)
      }}
      // `noreferrer` beside `noopener` on purpose: one closes the
      // `window.opener` hole, the other stops this app's address
      // leaking as the referrer to a product it does not own.
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
      // A pointer can recover the name a collapsed rail has hidden.
      // It is not the accessible name — see the `VisuallyHidden`
      // below — because `title` alone is not reliably announced.
      title={isIconOnly ? item.label : undefined}
    >
      {item.icon === undefined ? null : (
        // Decoration beside the item's own text. An icon that
        // announces itself turns "Settings" into "gear Settings".
        <span
          aria-hidden="true"
          className="flex shrink-0 text-content-secondary"
        >
          {item.icon}
        </span>
      )}

      {isIconOnly ? (
        <VisuallyHidden>{item.label}</VisuallyHidden>
      ) : (
        // `truncate`, not `min-w-0` alone: a flex item's automatic
        // minimum is its content's min-content width, so one long
        // unbroken destination name becomes the rail's floor and
        // widens the column. The full text stays reachable in the
        // `title` a truncated element gets from the platform.
        <span
          className={
            placement === "bar" ? undefined : "truncate"
          }
        >
          {item.label}
        </span>
      )}

      {isExternal ? (
        <VisuallyHidden>
          (opens in a new tab)
        </VisuallyHidden>
      ) : null}
    </LinkElement>
  )
}
