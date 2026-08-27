import { useVisibility } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { Placement } from "@floating-ui/react"
import type { ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { usePanelItemSize } from "../Overlay/usePanelItemSize.ts"
import { Popover } from "../Popover/Popover.tsx"
import { useToolbarOverflow } from "../Toolbar/useToolbarOverflow.ts"
import { toClassName } from "../toClassName.ts"
import { NavBarLink } from "./NavBarLink.tsx"
import { getIsCurrentHref } from "./navBarCurrent.ts"

export type NavBarItem = {
  /**
   * Where it goes. Routed through the injected `RouterLink` when it
   * is this app's own path, and left to the platform when it is not.
   */
  href: string
  /** Decoration beside the label. Never the accessible name. */
  icon?: ReactNode
  /** Defaults to `href`, which is already unique in a nav. */
  key?: string
  /** The visible text, and the accessible name. */
  label: string
}

export type NavBarProps = {
  className?: string
  /**
   * Where the reader is — `useLocation().pathname` in a
   * react-router app. `aria-current="page"` is derived from it by
   * `getIsCurrentHref`, which matches a parent path for its
   * children and treats `/` as exact.
   *
   * Omitted means nothing is current, which is the honest answer on
   * a route no destination owns.
   */
  currentHref?: string
  /**
   * **Initial** only, and the bar owns it from then on — the same
   * uncontrolled contract every other component here has. It exists
   * so a story (and a screenshot) can show the menu open; an app
   * almost never passes it.
   */
  isMenuVisible?: boolean
  items: readonly NavBarItem[]
  /**
   * Required, and it becomes the `<nav>`'s `aria-label`. Two unnamed
   * navigation landmarks in one page is axe's `landmark-unique`, and
   * more to the point it is a screen reader announcing "navigation"
   * twice with no way to tell which is the main one.
   */
  label: string
  /**
   * The collapsed trigger's glyph. **No default** — the library
   * ships no icons, and `☰` renders as nothing where the font lacks
   * it. With no icon the trigger is a text button reading
   * `menuLabel`, which works everywhere.
   */
  menuIcon?: ReactNode
  /**
   * Names the trigger and, through it, the panel it opens. A
   * `role="dialog"` takes no accessible name from its content.
   */
  menuLabel?: string
  menuPlacement?: Placement
  size?: ControlSize
}

/**
 * The app's destinations as real links, in one line — folding into a
 * single menu button, whole, when that line does not fit.
 *
 * ## Why this is not `Toolbar`
 *
 * `Toolbar` already solves collapse-into-an-overflow, and this
 * component **reuses its measurement** (`useToolbarOverflow`) rather
 * than growing a second one. What it cannot reuse is the rendering:
 * a `ToolbarAction` is `{ label, onSelect }` and a collapsed one
 * becomes a `MenuItem`, so a nav folded into a `Toolbar` is a row of
 * `<button>`s. Navigation is an `<a href>` — see `NavBarLink`.
 *
 * The overflow is a `Popover` (`role="dialog"`) rather than a `Menu`
 * for the same reason: `role="menu"` permits only the `menuitem`
 * family, and a `menuitem` is something you *do*, not somewhere you
 * *go*.
 *
 * ## It folds WHOLE, and that is the decision
 *
 * `Toolbar` collapses **progressively** — items drop off the end one
 * at a time — because its items are ranked: the two things you do to
 * a running job matter more than the two you do to the deck. A nav
 * is not ranked. Its order is the shape of the product (Docket's
 * reads as the pipeline: Triage → Backlog → Phases → Board →
 * Archives), and a half-collapsed one splits that shape across two
 * places with no rule the reader can learn — "some of the app is up
 * here and the rest is behind a button" is worse than either whole
 * answer. So the bar shows **every** destination or **none**, and
 * the menu, when it opens, is the complete list in the product's own
 * order.
 *
 * ## Measured, not breakpointed
 *
 * There is no `collapseAt` prop and no media query. The bar reads
 * the width its links actually have and folds when their sum stops
 * fitting, so a longer label, a tenth destination, a
 * `data-density="kiosk"` or a reader at 175% browser zoom each move
 * the fold on their own. A hardcoded pixel number is wrong the first
 * time any of those changes — mux-magic collapses at `480px` and
 * plex-channels at `760px`, and neither number has a reason.
 *
 * ⚠️ **The bar must not be sized by its own contents.** It measures
 * its own box to decide what to draw in it, so a container that
 * shrink-wraps makes the answer its own input: put it in a
 * `minmax(0, 1fr)` grid track or a `flex-1 min-w-0` row. The root
 * carries `min-w-0 flex-1` for the flex case; a grid track is the
 * caller's to declare. Same trap `useAdaptiveColumns` documents from
 * the other end.
 *
 * ## Mounted exactly once
 *
 * A destination is in the bar or in the panel, never both. The
 * fleet's habit is to render the whole nav twice and hide one copy
 * with `hidden md:flex` — mux-magic's `PageHeader` across two
 * ~55-line blocks, mail-sifter's `TriageQueue` again — which puts
 * every link in the DOM at every width, so an agent driving the page
 * finds two of each and cannot tell which one a human can see.
 */
export const NavBar = ({
  className,
  currentHref,
  isMenuVisible = false,
  items,
  label,
  menuIcon,
  menuLabel = "Menu",
  menuPlacement = "bottom-start",
  size = "sm",
}: NavBarProps): ReactNode => {
  const itemKeys = items.map(
    (item) => item.key ?? item.href,
  )

  const { containerRef, trackItem, visibleCount } =
    useToolbarOverflow({ itemKeys })

  /**
   * All or nothing. `visibleCount` is the progressive answer and
   * this is the only thing read off it: the moment one link stops
   * fitting, every link goes into the menu together.
   *
   * The hook's `trackTrigger` is deliberately not wired up, and the
   * missing measurement costs nothing here. It exists so a
   * progressive bar can ask "how many fit **beside a trigger**",
   * which is a question this bar never asks: either every link fits
   * with no trigger at all, or the row is one trigger and nothing
   * else. `chooseVisibleCount` tests the whole-row case first and
   * with the trigger costed at zero, so that branch is exact.
   */
  const isCollapsed = visibleCount < items.length

  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isMenuVisible,
  })

  const panelItemSize = usePanelItemSize("lg")

  const renderLink = (
    item: NavBarItem,
    placement: "bar" | "panel",
  ) => (
    <NavBarLink
      isCurrent={getIsCurrentHref({
        currentHref,
        href: item.href,
      })}
      item={item}
      key={item.key ?? item.href}
      onNavigate={placement === "panel" ? hide : undefined}
      placement={placement}
      size={placement === "bar" ? size : panelItemSize}
      trackElement={
        placement === "bar" ? trackItem : undefined
      }
    />
  )

  const trigger =
    menuIcon === undefined ? (
      <Button
        appearance="ghost"
        intent="neutral"
        onClick={toggle}
        size={size}
      >
        {menuLabel}
      </Button>
    ) : (
      <IconButton
        appearance="ghost"
        intent="neutral"
        label={menuLabel}
        onClick={toggle}
        size={size}
      >
        {menuIcon}
      </IconButton>
    )

  return (
    <nav
      aria-label={label}
      className={toClassName(
        "flex min-w-0 flex-1 items-center gap-1",
        className,
      )}
      ref={containerRef}
    >
      {isCollapsed ? (
        <Popover
          // The default panel is `max-w-xs p-3` — sized for a
          // paragraph of prose. This one holds full-bleed rows that
          // bring their own inset, so the padding shrinks to the
          // gutter around them and the width is left to the list.
          className="max-w-none p-1"
          heading={menuLabel}
          isVisible={isVisible}
          onDismiss={hide}
          placement={menuPlacement}
          trigger={trigger}
        >
          {/*
            A list, so a screen reader says how many destinations
            there are before the reader starts down them — the one
            thing the bar's own row communicates by simply being
            visible all at once.
          */}
          <ul className="flex min-w-48 list-none flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.key ?? item.href}>
                {renderLink(item, "panel")}
              </li>
            ))}
          </ul>
        </Popover>
      ) : (
        items.map((item) => renderLink(item, "bar"))
      )}
    </nav>
  )
}
