import {
  selectTabIndex,
  useRovingFocus,
} from "@charcuterie/logic"
import type { Placement } from "@floating-ui/react"
import {
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react"
import type { ReactElement, ReactNode } from "react"
import { useEffect, useRef } from "react"

import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
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
    isVisible,
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
                "z-[var(--layer-modal)] flex min-w-48 flex-col gap-0.5 p-1",
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
        </FloatingPortal>
      ) : null}
    </>
  )
}
