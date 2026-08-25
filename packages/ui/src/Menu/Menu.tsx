import {
  selectTabIndex,
  useRovingFocus,
  useUniqueId,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { Placement } from "@floating-ui/react"
import {
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react"
import type { ReactElement, ReactNode } from "react"
import { useEffect, useRef } from "react"

import { PANEL_ITEM_SIZE_CLASS } from "../controlStyles.ts"
import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
import { usePanelItemSize } from "../Overlay/usePanelItemSize.ts"
import { toClassName } from "../toClassName.ts"
import { MenuAction } from "./MenuAction.tsx"

export type MenuItem = {
  icon?: ReactNode
  isDisabled?: boolean
  key: string
  label: ReactNode
  onSelect: () => void
  /**
   * The default kind, and optional so the common `{ key, label,
   * onSelect }` still type-checks. Present only to discriminate this
   * from a `separator` or a `group`.
   */
  type?: "item"
}

/**
 * A rule between groups of items — `role="separator"`, and nothing a
 * keyboard user lands on. It never registers with the roving group,
 * so the arrow keys pass straight over it, the same mechanism a
 * disabled item uses.
 */
export type MenuSeparator = {
  key: string
  type: "separator"
}

/**
 * A named set of items — `role="group"` with the `label` as its
 * accessible name (a screen reader announces "Danger, group" before
 * its members). The heading itself is not focusable; only the items
 * inside it register.
 */
export type MenuGroup = {
  items: MenuItem[]
  key: string
  label: ReactNode
  type: "group"
}

/**
 * What a menu is made of. A bare `MenuItem` is still valid on its
 * own, so existing `items` arrays need no change; a `separator` or a
 * `group` opts in by its `type`.
 */
export type MenuEntry = MenuGroup | MenuItem | MenuSeparator

export type MenuProps = {
  className?: string
  /**
   * Shown when there is no item to show — a `group` with no members
   * and a bare separator list both count as empty. Rendered as a
   * **disabled** `menuitem` (a `role="menu"` must own one), so it is
   * announced but never focused. Without it an empty menu renders
   * nothing.
   */
  emptyState?: ReactNode
  isVisible: boolean
  /**
   * How tall each item is, from the same density-aware tokens a
   * `Button` reads — so a `md` item and a `md` `Button` measure the
   * same.
   *
   * **Defaults to `lg`**, which no other component in the library does,
   * and the asymmetry is the decision rather than an oversight. A menu
   * item is a *pointer* target first: it is read once and then aimed
   * at, often in a hurry, and there are rarely more than about eight of
   * them — so the height a dense list cannot spare, a menu can. A short
   * window steps it back down on its own (`usePanelItemSize`).
   */
  itemSize?: ControlSize
  items: MenuEntry[]
  /** Outside press, Escape, and choosing an item all land here. */
  onDismiss: () => void
  placement?: Placement
  /** The control the menu hangs off. **Cloned, not wrapped.** */
  trigger: ReactElement
}

/**
 * A group heading is not a row — it has no height of its own to take
 * — so it borrows only the inline padding, which is the one thing it
 * has to share with the items under it.
 */
const GROUP_HEADING_INSET_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "px-(--control-padding-inline-sm)",
  md: "px-(--control-padding-inline-md)",
  lg: "px-(--control-padding-inline-lg)",
}

const isMenuItem = (entry: MenuEntry): entry is MenuItem =>
  entry.type === undefined || entry.type === "item"

const hasAnyItem = (items: MenuEntry[]): boolean =>
  items.some(
    (entry) =>
      isMenuItem(entry) ||
      (entry.type === "group" && entry.items.length > 0),
  )

/**
 * A menu is **not** a listbox, and mux-magic's `TypePicker` is the
 * fleet's one attempt at telling them apart — it renders
 * `role="menu"` over items that set a value, which is a listbox
 * wearing the wrong role. The distinction is what the items *are*:
 *
 *  - `menuitem` **does** something. Rename, Delete, Copy path.
 *  - `option` **is** something. It is a value you are choosing.
 *
 * A screen reader announces "menu, 4 items" for one and "listbox,
 * selected, 2 of 4" for the other, and an agent driving the app
 * needs the second to know what state it left behind. Getting it
 * wrong is invisible in a browser and invisible to axe.
 *
 * ### There is no `label` prop, and that corrects a lesson
 *
 * `Spinner` (M3), `Popover` and `Modal` (M4) all take a **required**
 * name, because a `role="status"` and a `role="dialog"` take none
 * from their content. The obvious move here was a `label` prop doing
 * the same job, and it was written that way first — then measured
 * as doing nothing.
 *
 * `useRole(context, { role: "menu" })` puts **`aria-labelledby` on
 * the panel pointing at the trigger**, and `aria-labelledby` beats
 * `aria-label`. So the menu was already named — "Bay 3", from the
 * button — and the prop was silently discarded. That is also the ARIA
 * Authoring Practices menu-button pattern, where a menu is named by
 * the control that opens it.
 *
 * The rule the other three teach is therefore narrower than it
 * looked: **an overlay with no trigger relationship needs its own
 * name.** A menu has one, so the requirement moves to the trigger —
 * which `Button` and `IconButton` already enforce.
 *
 * ### Roving focus, and the composition `Tabs` already proved
 *
 * `RovingFocus` alone this time — there is no selection, because a
 * menu item is not selected, it is invoked. That is the same
 * two-kinds argument from the other side: `Tabs` needed both kinds
 * because a tab is chosen *and* focused, and a menu needs one
 * because a menu item is only ever focused.
 *
 * ### Focus moves in, once, and only on opening
 *
 * A menu is one of the few patterns where focus must jump on open —
 * otherwise the keyboard user who pressed Enter on the trigger is
 * still on the trigger with a menu they cannot reach. It happens in
 * the panel's own effect rather than through
 * `FloatingFocusManager`'s `initialFocus`, because the element to
 * focus is whichever one `RovingFocus` says is active, and that is
 * not known until the items have registered.
 *
 * ### Separators, groups, and an empty state
 *
 * `items` is a union, not a flat `MenuItem[]`: a `separator`
 * (`role="separator"`) and a `group` (`role="group"`, named by its
 * `label`) opt in by their `type`, and a bare item still type-checks
 * unchanged. The keyboard model needs no new code for them — a
 * separator and a group heading register nothing, so the roving
 * group never sees them and the arrow keys skip straight over, the
 * same mechanism a disabled item already used. A `group`'s items
 * register normally, so focus moves through them in DOM order as if
 * the heading were not there. When there is nothing to show, the
 * `emptyState` renders as a **disabled** `menuitem` — a `role="menu"`
 * with no `menuitem` child fails `aria-required-children`, so the
 * note has to be one, `aria-disabled` and out of the roving group:
 * announced as "No actions available, dimmed", focusable by nothing.
 *
 * ### No type-ahead, deliberately
 *
 * The APG lists type-ahead as optional for a menu and required for a
 * listbox, and none of the fleet's menus are long enough to need it
 * — the largest has six items. Adding it would mean a keystroke
 * buffer and a timer in a component that currently has neither, for
 * a menu you can cross in three arrow presses.
 */
export const Menu = ({
  className,
  emptyState,
  isVisible,
  items,
  itemSize: requestedItemSize = "lg",
  onDismiss,
  placement = "bottom-start",
  trigger,
}: MenuProps): ReactNode => {
  const itemSize = usePanelItemSize(requestedItemSize)

  const menuId = useUniqueId()

  const itemElements = useRef(
    new Map<string, HTMLButtonElement>(),
  )

  const focus = useRovingFocus<string>()

  const { activeValue, registeredValues, setActiveValue } =
    focus

  const [firstValue] = registeredValues

  const {
    clonedTrigger,
    context,
    floatingStyles,
    getFloatingProps,
    setFloating,
  } = useAnchoredOverlay({
    // A menu had no clamp at all, which was survivable while a row was
    // 32px and is not now: nine `lg` rows are 400px, and on a short
    // window the panel simply ran off the bottom of the screen with no
    // way to reach the last item. It scrolls instead.
    isHeightClamped: true,
    isVisible,
    // And the inline twin. A portalled panel is `position: fixed`, so
    // its shrink-to-fit width stops at the *viewport* rather than at
    // the space `shift` left it — measured at 390px, a menu holding
    // Mail Sifter's "Lock unlocks — forget passcodes on this device"
    // came out 390px wide at `left: 8`, hanging 8px off the right
    // edge. Pre-existing and size-independent, but a `lg` row's larger
    // type is what makes a real label reach it.
    isWidthClamped: true,
    offsetValue: 4,
    onDismiss,
    placement,
    role: "menu",
    trigger,
  })

  /**
   * Opening **makes** a member active, and this is the step the
   * first version was missing.
   *
   * `RovingFocus` leaves `activeValue` at `null` until something
   * sets it — `selectTabIndex` covers the first paint by giving the
   * tab stop to `registeredValues[0]` while it is still null, which
   * is exactly why nothing looked wrong: the menu had a correct tab
   * stop, correct roles, and no focus. `Tabs` never hit it because a
   * tab bar seeds itself from its selected key.
   *
   * Re-running on every open is deliberate. The APG says a menu
   * opens on its first item, so a menu reopened after arrowing to
   * the third one starts at the top again rather than resuming a
   * position the user has forgotten.
   */
  useEffect(() => {
    if (!isVisible || firstValue === undefined) {
      return
    }

    setActiveValue(firstValue)
  }, [firstValue, isVisible, setActiveValue])

  useEffect(() => {
    if (!isVisible || activeValue === null) {
      return
    }

    itemElements.current.get(activeValue)?.focus()
  }, [activeValue, isVisible])

  // One member of the roving group, whether it sits at the top level
  // or inside a `group`. The registration lives in `MenuAction`'s
  // effect, so an item nested in a group joins the same arrow-key
  // sequence in DOM order — the heading above it registers nothing.
  const renderItem = (item: MenuItem) => (
    <MenuAction
      item={item}
      itemSize={itemSize}
      key={item.key}
      onDismiss={onDismiss}
      register={focus.register}
      tabIndex={selectTabIndex(focus, item.key)}
      trackElement={(key, element) => {
        if (element) {
          itemElements.current.set(key, element)
        } else {
          itemElements.current.delete(key)
        }
      }}
    />
  )

  const renderEntry = (entry: MenuEntry) => {
    if (entry.type === "separator") {
      // A native `<hr>` — implicit `role="separator"`, and the one
      // that does *not* need `aria-valuenow` (that is the focusable
      // splitter kind, not a static rule between menu groups).
      return (
        <hr
          className="-mx-1 my-1 h-px border-0 bg-border-subtle"
          key={entry.key}
        />
      )
    }

    if (entry.type === "group") {
      const headingId = `${menuId}-${entry.key}`

      return (
        // biome-ignore lint/a11y/useSemanticElements: a menu group is `role="group"` (ARIA APG), not a form `<fieldset>` — a fieldset is invalid content inside `role="menu"` and drags legend/border/reset semantics onto it.
        <div
          aria-labelledby={headingId}
          key={entry.key}
          role="group"
        >
          <div
            // The heading is inset to the items' own inline padding so
            // its text starts where their labels do, which is why it
            // reads the row-size tokens rather than a fixed `px-2`.
            className={toClassName(
              GROUP_HEADING_INSET_CLASS[itemSize],
              "pt-1.5 pb-0.5 font-medium text-content-secondary text-xs",
            )}
            id={headingId}
          >
            {entry.label}
          </div>

          {entry.items.map(renderItem)}
        </div>
      )
    }

    return renderItem(entry)
  }

  // A **disabled** `menuitem`, not inert text: a `role="menu"` with
  // no `menuitem` child fails `aria-required-children`, so the empty
  // note has to be one — `aria-disabled` and `tabindex="-1"`, so it
  // is announced ("No actions available, dimmed") but takes no tab
  // stop and never joins the roving group. `null` when the consumer
  // gave no `emptyState`, so an empty menu renders nothing.
  const emptyElement =
    emptyState === undefined ? null : (
      <div
        aria-disabled="true"
        className={toClassName(
          "flex items-center text-content-disabled",
          PANEL_ITEM_SIZE_CLASS[itemSize],
        )}
        role="menuitem"
        tabIndex={-1}
      >
        {emptyState}
      </div>
    )

  return (
    <>
      {clonedTrigger}

      {isVisible ? (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            // `false`, so Tab leaves the menu and lands on the next
            // control in the page — which is what closes it, through
            // `useDismiss`. A trapped menu is a dialog.
            modal={false}
            // Focus is moved by the effect above, to whichever item
            // `RovingFocus` made active. Letting the manager also aim
            // it is two owners for one caret.
            initialFocus={-1}
          >
            <div
              {...getFloatingProps()}
              className={toClassName(
                PANEL_SURFACE_CLASS,
                // The height is clamped to the space the viewport left,
                // written straight onto the element by the `size`
                // middleware; this scrolls inside it.
                "charcuterie-scrollbar z-[var(--layer-modal)] flex min-w-48 flex-col gap-0.5 overflow-y-auto p-1",
                className,
              )}
              onKeyDown={(keyEvent) => {
                const commands: Record<string, () => void> =
                  {
                    ArrowDown: focus.next,
                    ArrowUp: focus.previous,
                    End: focus.last,
                    Home: focus.first,
                  }

                const command = commands[keyEvent.key]

                if (command) {
                  // Arrow keys scroll the page by default, and a menu
                  // that scrolls the document behind it while moving
                  // focus is the hand-rolled version of this
                  // component.
                  keyEvent.preventDefault()

                  command()
                }
              }}
              ref={setFloating}
              // Duplicated from `getFloatingProps()` on purpose, and
              // the two cannot differ — `useRole(context, { role:
              // "menu" })` in the hook is where it comes from. Stated
              // here because a linter cannot see a role through a
              // spread.
              role="menu"
              style={floatingStyles}
            >
              {hasAnyItem(items)
                ? items.map(renderEntry)
                : emptyElement}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}
