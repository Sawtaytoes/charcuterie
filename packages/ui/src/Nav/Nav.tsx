import { useVisibility } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { Placement } from "@floating-ui/react"
import type { ReactElement, ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { usePanelItemSize } from "../Overlay/usePanelItemSize.ts"
import { Popover } from "../Popover/Popover.tsx"
import { useToolbarOverflow } from "../Toolbar/useToolbarOverflow.ts"
import { toClassName } from "../toClassName.ts"
import { NavLink } from "./NavLink.tsx"
import type { NavItem } from "./navItems.ts"
import {
  getNavItemKey,
  resolveActiveKey,
} from "./navItems.ts"

/**
 * Where the destinations are drawn. Not *whether* — see
 * `useNavLayout`, which answers that from the width.
 */
export type NavLayout =
  | "bar"
  | "bottom"
  | "menu"
  | "rail"
  | "railIcons"

type NavCommonProps = {
  /**
   * The destinations, in the order the product reads.
   *
   * Annotate the array as `NavRailItem[]` when the app uses a rail:
   * it is the same shape with `icon` made **required**, because
   * `railIcons` takes the label away and an item with no glyph is a
   * blank square that still navigates. `NavItem` keeps `icon`
   * optional so that a `bar`, where the label never goes anywhere,
   * does not have to invent one.
   */
  items: readonly NavItem[]
  /**
   * The address the app is at — usually `location.pathname`. The
   * item that matches wears `aria-current="page"`.
   *
   * Omitted means nothing is current, which is honest on a screen
   * the nav does not contain (a modal route, an error page) and is
   * better than marking the closest thing.
   */
  activeHref?: string
  className?: string
  /**
   * The `<nav>`'s accessible name. Default `"Main"`.
   *
   * Required in spirit and defaulted in practice: two unnamed
   * navigations on one page are two landmarks a screen reader
   * announces identically, which is axe's `landmark-unique`. An app
   * with a second nav — a queue's sub-navigation, a footer — names
   * that one and leaves this one alone.
   */
  label?: string
}

type NavPlacedProps = NavCommonProps & {
  /**
   * **Initial** only, and the bar owns it from then on — the same
   * uncontrolled contract every other component here has. It exists
   * so a story (and a screenshot) can show the menu open; an app
   * almost never passes it. `bar` only.
   */
  isMenuVisible?: boolean
  layout?: "bar" | "bottom" | "rail" | "railIcons"
  /**
   * Where the trigger sits in the bar's track once the row has
   * folded. `"end"` when the header puts its own actions at the far
   * edge, so the fold control joins them instead of hugging the
   * wordmark with the whole track empty after it.
   *
   * It reaches **only** the folded row, which holds exactly one
   * item — so it cannot disturb where the links sit when the bar is
   * whole, and there is deliberately no prop that can.
   */
  menuAlign?: "end" | "start"
  /**
   * The folded trigger's glyph. **No default** — the library ships
   * no icons, and a hamburger renders as nothing where the font
   * lacks it. With no icon the trigger is a text button reading
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

type NavMenuProps = NavCommonProps & {
  isVisible: boolean
  layout: "menu"
  onDismiss: () => void
  placement?: Placement
  /** The control the panel hangs off. **Cloned, not wrapped.** */
  trigger: ReactElement
}

/**
 * The union splits on `menu` and **only** on `menu`, because that is
 * the one layout an app cannot reach with a variable: its trigger
 * goes in the `Header`, so the app is already writing the branch.
 *
 * Everything else takes `layout={navLayout.layout}` straight from
 * `useNavLayout` — which is a *variable*, not a literal, so a union
 * that also split `items` by layout would force a `switch` at the
 * one call site this component exists to make short.
 */
export type NavProps = NavMenuProps | NavPlacedProps

const LIST_CLASS: Record<NavLayout, string> = {
  bar: "flex min-w-0 flex-row items-center gap-1",
  // `auto-cols-fr` with `grid-flow-col`: equal columns whose count
  // comes from the item list, so four destinations divide the width
  // and five still do, with no per-app count to keep in step.
  bottom: "grid auto-cols-fr grid-flow-col gap-0",
  menu: "flex min-w-48 flex-col gap-0.5",
  rail: "flex min-w-0 flex-col gap-1",
  railIcons: "flex flex-col items-center gap-1",
}

const NAV_CLASS: Record<NavLayout, string> = {
  bar: "flex min-w-0 flex-1 items-center gap-1",
  bottom: "border-border-subtle border-t bg-surface-raised",
  menu: "min-w-0",
  rail: "min-w-0",
  railIcons: "min-w-0",
}

/**
 * The app's destinations — a header row, a side rail, a collapsed
 * rail, a strip along the foot of the Narrow View, or a panel behind
 * one control. The same list, drawn where it fits.
 *
 * ## What was actually missing
 *
 * `Shell` / `Header` / `Rail` / `Main` shipped the page frame on
 * 2026-08-10 and left the **contents of the nav rail empty**. Twelve
 * UI repos, and exactly two of them had a `<nav>` at all: Docket
 * hand-rolled a row of `NavLink`s with the collapse rule in the
 * app's own stylesheet, Folio hand-rolled another, and the other ten
 * had no destinations anywhere. The two that existed already
 * disagreed — Docket *wraps* below its breakpoint and stands three
 * lines tall on a phone, which is not a decision anybody made, it is
 * what `flex-wrap` does when nobody writes the other rule.
 *
 * ## Every item is a real link
 *
 * `<a href>`, through the injected `RouterLinkProvider` — see
 * `NavLink`, which is where that argument is written down.
 *
 * ## `aria-current="page"`, and exactly one of them
 *
 * `resolveActiveKey` takes the **deepest** matching path, so an app
 * holding both `/settings` and `/settings/labels` marks the page the
 * reader is actually on rather than both.
 *
 * ## `bar` folds WHOLE, and it is measured
 *
 * There is no `collapseAt` and no media query on this axis. The bar
 * reads the width its links actually have and folds when their sum
 * stops fitting, so a longer label, a tenth destination, a
 * `data-density="kiosk"` or a reader at 175% browser zoom each move
 * the fold on their own. mux-magic collapses at a hardcoded `480px`
 * and plex-channels at `760px`, and neither number has a reason.
 *
 * It folds *whole* rather than progressively, unlike `Toolbar`:
 * `Toolbar`'s items are ranked, and a nav's order is the shape of
 * the product (Docket's reads as the pipeline: Triage → Backlog →
 * Phases → Board → Archives). Half of that behind a button is a rule
 * no reader can learn.
 *
 * ⚠️ **A `bar` must not be sized by its own contents.** It measures
 * its own box to decide what to draw in it, so a container that
 * shrink-wraps makes the answer its own input: put it in a
 * `minmax(0, 1fr)` grid track or a `flex-1 min-w-0` row. The root
 * carries `min-w-0 flex-1` for the flex case; a grid track is the
 * caller's to declare.
 *
 * ## `menu` is the rail's narrow state, and the app owns it
 *
 * `bar` builds its own trigger because it knows when it folded.
 * `menu` takes one, because the rail's narrow state puts that
 * control in the `Header` — a different corner of `Shell`'s grid
 * from a side rail, and no media query moves an element across a
 * grid. `useNavLayout` is what tells the app which of the two it is
 * rendering.
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
export const Nav = (props: NavProps): ReactNode => {
  const {
    activeHref,
    className,
    items,
    label = "Main",
  } = props

  const layout = props.layout ?? "bar"

  const activeKey = resolveActiveKey(items, activeHref)

  const itemKeys = items.map(getNavItemKey)

  const { containerRef, trackItem, visibleCount } =
    useToolbarOverflow({ itemKeys })

  // The bar-only knobs. `menu` is the one variant that does not
  // carry them, and it is the one variant the app branches on
  // anyway.
  const placedProps = props.layout === "menu" ? null : props

  const { hide, isVisible, toggle } = useVisibility({
    isVisible: placedProps?.isMenuVisible ?? false,
  })

  const panelItemSize = usePanelItemSize("lg")

  /**
   * All or nothing. `visibleCount` is the progressive answer and
   * this is the only thing read off it: the moment one link stops
   * fitting, every link goes into the menu together.
   */
  const isFolded =
    layout === "bar" && visibleCount < items.length

  const size = placedProps?.size ?? "sm"

  const renderList = (
    placement:
      | "bar"
      | "bottom"
      | "panel"
      | "rail"
      | "railIcons",
    listLayout: NavLayout,
  ) => (
    <ul
      className={toClassName(
        "list-none p-0",
        LIST_CLASS[listLayout],
      )}
    >
      {items.map((item) => {
        const key = getNavItemKey(item)

        return (
          <li className="min-w-0" key={key}>
            <NavLink
              isCurrent={key === activeKey}
              item={item}
              onNavigate={
                placement === "panel" ? hide : undefined
              }
              placement={placement}
              size={
                placement === "panel" ? panelItemSize : size
              }
              trackElement={
                placement === "bar"
                  ? (element) => {
                      trackItem(key, element)
                    }
                  : undefined
              }
            />
          </li>
        )
      })}
    </ul>
  )

  if (props.layout === "menu") {
    /**
     * A `Popover` rather than a `Menu`. `Menu`'s items are
     * `onSelect` callbacks on `<button>`s, which is right for the
     * things a menu usually holds — undo, redo, a scheme cycle — and
     * wrong for a destination, for every reason `NavLink` gives.
     *
     * `modal={false}` inside it, so the caret is not trapped: the
     * panel is a disclosure, not a dialog somebody has to answer.
     */
    return (
      <Popover
        // The default panel is `max-w-xs p-3` — sized for a
        // paragraph of prose. This one holds full-bleed rows that
        // bring their own inset, so the padding shrinks to the
        // gutter around them and the width is left to the list.
        className="max-w-none p-1"
        heading={label}
        isVisible={props.isVisible}
        onDismiss={props.onDismiss}
        placement={props.placement ?? "bottom-start"}
        trigger={props.trigger}
      >
        {/*
          A list, so a screen reader says how many destinations
          there are before the reader starts down them — the one
          thing a visible row communicates by simply being visible
          all at once.
        */}
        <nav aria-label={label}>
          {renderList("panel", "menu")}
        </nav>
      </Popover>
    )
  }

  if (layout !== "bar") {
    return (
      <nav
        aria-label={label}
        className={toClassName(
          NAV_CLASS[layout],
          className,
        )}
      >
        {renderList(
          layout === "rail"
            ? "rail"
            : layout === "railIcons"
              ? "railIcons"
              : "bottom",
          layout,
        )}
      </nav>
    )
  }

  const menuLabel = placedProps?.menuLabel ?? "Menu"

  const menuIcon = placedProps?.menuIcon

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
        NAV_CLASS.bar,
        // Two written-out entries rather than one interpolated
        // string: Tailwind's scanner cannot see a class that exists
        // only at runtime.
        isFolded && placedProps?.menuAlign === "end"
          ? "justify-end"
          : "justify-start",
        className,
      )}
      ref={containerRef}
    >
      {isFolded ? (
        <Popover
          className="max-w-none p-1"
          heading={menuLabel}
          isVisible={isVisible}
          onDismiss={hide}
          placement={
            placedProps?.menuPlacement ?? "bottom-start"
          }
          trigger={trigger}
        >
          {renderList("panel", "menu")}
        </Popover>
      ) : (
        renderList("bar", "bar")
      )}
    </nav>
  )
}
