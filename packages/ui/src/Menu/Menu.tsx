import {
  selectTabIndex,
  useClonedChild,
  useRovingFocus,
} from "@charcuterie/logic"
import type { Placement } from "@floating-ui/react"
import {
  autoUpdate,
  FloatingFocusManager,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react"
import type { ReactElement, ReactNode } from "react"
import { useEffect, useRef } from "react"

import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { toClassName } from "../toClassName.ts"
import { MenuAction } from "./MenuAction.tsx"

export type MenuItem = {
  icon?: ReactNode
  isDisabled?: boolean
  key: string
  label: ReactNode
  onSelect: () => void
}

export type MenuProps = {
  className?: string
  isVisible: boolean
  items: MenuItem[]
  /** Outside press, Escape, and choosing an item all land here. */
  onDismiss: () => void
  placement?: Placement
  /** The control the menu hangs off. **Cloned, not wrapped.** */
  trigger: ReactElement
}

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
  isVisible,
  items,
  onDismiss,
  placement = "bottom-start",
  trigger,
}: MenuProps): ReactNode => {
  const itemElements = useRef(
    new Map<string, HTMLButtonElement>(),
  )

  const panelElement = useRef<HTMLDivElement>(null)

  const focus = useRovingFocus<string>()

  const { activeValue, registeredValues, setActiveValue } =
    focus

  const [firstValue] = registeredValues

  const { context, floatingStyles, refs } = useFloating({
    open: isVisible,
    onOpenChange: (isNextVisible) => {
      if (!isNextVisible) {
        onDismiss()
      }
    },
    placement,
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
  })

  const { getFloatingProps, getReferenceProps } =
    useInteractions([
      useDismiss(context),
      useRole(context, { role: "menu" }),
    ])

  const clonedTrigger = useClonedChild(trigger, {
    ...getReferenceProps(),
    ref: refs.setReference,
  })

  /**
   * The other half of the `isConnected` guard below. If the ref
   * fired while the node was still detached, nothing has shown the
   * popover — and a `[popover]` that was never shown is
   * `display: none`, so the menu renders, passes typecheck, and is
   * invisible to `getByRole` and to a user alike.
   *
   * Effects run after the tree is connected, so this is the
   * backstop. It is idempotent: `:popover-open` is the same question
   * the ref asks.
   */
  useEffect(() => {
    const panel = panelElement.current

    if (
      isVisible &&
      panel?.isConnected &&
      !panel.matches(":popover-open")
    ) {
      panel.showPopover()
    }
  }, [isVisible])

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

  return (
    <>
      {clonedTrigger}

      {isVisible ? (
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
              "inset-auto m-0 flex min-w-48 flex-col gap-0.5 p-1",
              className,
            )}
            onKeyDown={(keyEvent) => {
              const commands: Record<string, () => void> = {
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
            popover="manual"
            ref={(node) => {
              refs.setFloating(node)

              panelElement.current = node

              // A ref callback rather than an effect, for the same
              // reason as `Popover`: a `[popover]` is
              // `display: none` until shown, and every child effect
              // — including the focus move above — would otherwise
              // be aiming at a hidden element.
              //
              // `isConnected` is the guard `Popover` does not need
              // and this does. `FloatingFocusManager` renders a pair
              // of focus guards around its child, so React commits
              // this subtree in an order where the ref can fire
              // while the node is still detached — and
              // `showPopover()` on a disconnected element throws
              // `InvalidStateError`, which surfaces as an unhandled
              // rejection rather than as a failing assertion.
              if (
                node?.isConnected &&
                !node.matches(":popover-open")
              ) {
                node.showPopover()
              }
            }}
            // Duplicated from `getFloatingProps()` on purpose, and
            // the two cannot differ — `useRole(context, { role:
            // "menu" })` above is where it comes from. Stated here
            // because a linter cannot see a role through a spread.
            role="menu"
            style={floatingStyles}
          >
            {items.map((item) => (
              <MenuAction
                item={item}
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
            ))}
          </div>
        </FloatingFocusManager>
      ) : null}
    </>
  )
}
