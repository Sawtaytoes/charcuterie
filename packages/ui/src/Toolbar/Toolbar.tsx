import {
  selectTabIndex,
  useRovingFocus,
  useVisibility,
} from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { ReactElement, ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"

import { Button } from "../Button/Button.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { Menu } from "../Menu/Menu.tsx"
import { Popover } from "../Popover/Popover.tsx"
import { toClassName } from "../toClassName.ts"
import { ToolbarSlot } from "./ToolbarSlot.tsx"
import { useToolbarOverflow } from "./useToolbarOverflow.ts"

/**
 * Something the toolbar renders itself: a button that **does**
 * something. The same shape as `MenuItem`, because a collapsed one
 * becomes exactly that.
 */
export type ToolbarAction = {
  icon?: ReactNode
  isDisabled?: boolean
  key: string
  /** The accessible name, and the label when it collapses. */
  label: string
  onSelect: () => void
  /**
   * The default kind, and optional so the common
   * `{ key, label, onSelect }` still type-checks. Present only to
   * discriminate this from a `control`.
   */
  type?: "action"
}

/**
 * Something the **app** renders: a `Switch`, a `SegmentedControl`,
 * a `ColorSchemeSwitcher` — a control with state, not an action.
 *
 * Exactly one instance of `element` is mounted at any width. It
 * moves between the bar and the overflow panel; it is never
 * rendered in both and hidden in one.
 */
export type ToolbarControl = {
  element: ReactElement
  key: string
  /**
   * Optional row label, used **only** in the overflow panel and
   * only when the control does not already show its own text. A
   * `Switch` renders its label; an icon-only toggle does not.
   */
  label?: string
  type: "control"
}

export type ToolbarItem = ToolbarAction | ToolbarControl

type ToolbarSharedProps = {
  className?: string
  /**
   * **Initial** only, and the toolbar owns it from then on — the
   * same uncontrolled contract as every other component here. It
   * exists so a story (and a screenshot) can show the panel open;
   * an app almost never passes it.
   */
  isOverflowVisible?: boolean
  /**
   * Required, and it becomes `aria-label`. A `role="toolbar"` takes
   * **no accessible name from its content** — the same trap
   * `Popover`'s `heading` and `Spinner`'s label exist for. mux-magic
   * gets this one right and then gives the toolbar nothing else.
   */
  label: string
  /**
   * The overflow trigger's glyph. **No default** — the library
   * ships no icons, and `⋮` renders as nothing where the font lacks
   * it. With no icon the trigger is a text button reading
   * `overflowLabel`, which works everywhere.
   */
  overflowIcon?: ReactNode
  /**
   * Names the overflow trigger, and through it the panel it opens —
   * a menu is named by its trigger, and `Popover`'s `aria-label`
   * takes the same string.
   */
  overflowLabel?: string
  size?: ControlSize
}

/**
 * **The overflow's role is a type, not a flag.**
 *
 * `role="menu"` permits only `menuitem`, `menuitemradio`,
 * `menuitemcheckbox`, `group` and `separator` — so a header's
 * scheme switcher inside one is invalid, which is what
 * plex-channels ships today. The fix is not a runtime warning and
 * not a boolean: with `overflow="menu"` the item type narrows to
 * `ToolbarAction`, and a `control` in the array is a **compile
 * error**. Mixed content declares `overflow="panel"` and gets a
 * `Popover` — `role="dialog"`, `aria-haspopup="dialog"` — where a
 * switch is perfectly legal content.
 *
 * Same instinct as
 * [`Menu`'s items being a discriminated union](../../../../docs/decisions/2026-08-05-menu-items-is-a-discriminated-union.md):
 * the kinds are told apart by the type system, in the data.
 */
export type ToolbarProps = ToolbarSharedProps &
  (
    | {
        items: readonly ToolbarAction[]
        overflow: "menu"
      }
    | {
        items: readonly ToolbarItem[]
        overflow: "panel"
      }
  )

/**
 * The roving group's last member. Not a key any item can collide
 * with, because a caller's keys are its own strings and this one
 * is namespaced.
 */
const OVERFLOW_KEY = "charcuterie-toolbar-overflow"

const isToolbarAction = (
  item: ToolbarItem,
): item is ToolbarAction => item.type !== "control"

/**
 * A row of controls that collapses into an overflow when it runs
 * out of room — the fleet's fourth-largest duplication, and the one
 * where the copies are worst.
 *
 * Four repos have a toolbar-with-overflow; mux-magic's `PageHeader`
 * is the original and plex-channels' `Header` says in its own
 * comments that it copied it. What they copied:
 *
 *  - **`role="toolbar"` with no toolbar keyboard behaviour.** Six
 *    sequential tab stops where the APG requires one, with the
 *    arrow keys moving between members. Here that is `RovingFocus`,
 *    the same kind `Menu`, `Tabs` and `SegmentedControl` use, and
 *    the tab stop is read from `selectTabIndex` rather than
 *    restated.
 *  - **Triggers that advertise nothing.** No `aria-expanded`, no
 *    `aria-haspopup`, no `aria-controls` anywhere in the file. Here
 *    they come from `useRole` inside `Menu`/`Popover`, which cannot
 *    be forgotten because nothing writes them by hand.
 *  - **No focus management.** `Menu` moves focus to the first item
 *    on opening and `FloatingFocusManager` returns it to the
 *    trigger on close.
 *  - **Collapse by DOM duplication.** Both repos render every
 *    action twice and hide one set with a media query — mux-magic's
 *    is a documented CSS specificity coin-flip ("source order
 *    wins"). Every action here is mounted **exactly once** and
 *    moves.
 *  - **Nothing decides what collapses.** Two hardcoded media
 *    queries at 480/481px, and the ⋮ shows at every width, so it is
 *    not progressive collapse at all. Here the row is measured, the
 *    items are in priority order, and the trigger exists only when
 *    something actually overflowed.
 *
 * The toggles' missing `aria-pressed` is the one defect this
 * component does not fix, because it cannot: a `control`'s state is
 * the control's own, and `Switch` has carried `role="switch"` since
 * M6a. The bar's job is to hold it once.
 *
 * ## Priority is the array order
 *
 * `items[0]` is the last thing to collapse. One axis, and it is
 * also paint order — see `chooseVisibleCount`.
 *
 * ## Measured, not breakpointed
 *
 * There is no `collapseAt` prop and no media query. The bar reads
 * the widths its items actually have, so a longer label or a
 * `data-density="kiosk"` collapses at the width it should rather
 * than at a number someone typed in 2024. `useMediaQuery` is still
 * the right tool one level up — for **relocating** a whole toolbar
 * out of a header on a phone, which is a layout decision and not a
 * fit — and `Toolbar.stories.tsx` shows that composition.
 *
 * ⚠️ The root is `flex-1 min-w-0`: it must be sized by its
 * container, never by its own contents, or collapsing an item
 * narrows the box that decides whether to collapse.
 */
export const Toolbar = ({
  className,
  isOverflowVisible = false,
  items,
  label,
  overflow,
  overflowIcon,
  overflowLabel = "More actions",
  size = "sm",
}: ToolbarProps): ReactNode => {
  const focusableElements = useRef(
    new Map<string, HTMLElement>(),
  )

  const focus = useRovingFocus<string>()

  const { activeValue, register, setActiveValue } = focus

  const itemKeys = items.map((item) => item.key)

  const {
    containerRef,
    trackItem,
    trackTrigger,
    visibleCount,
  } = useToolbarOverflow({ itemKeys })

  const visibleItems = items.slice(0, visibleCount)

  const collapsedItems = items.slice(visibleCount)

  const hasOverflow = collapsedItems.length > 0

  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isOverflowVisible,
  })

  const trackFocusable = useCallback(
    (key: string, element: HTMLElement | null) => {
      if (element) {
        focusableElements.current.set(key, element)
      } else {
        focusableElements.current.delete(key)
      }
    },
    [],
  )

  const trackOverflowElement = useCallback(
    (_key: string, element: HTMLElement | null) => {
      trackTrigger(element)
    },
    [trackTrigger],
  )

  /**
   * Move the caret only when the toolbar already has it.
   *
   * Same guard as `SegmentedControl`: the active member changes
   * whenever the row re-measures, and a bar that stole focus every
   * time the window resized would be worse than one with no
   * keyboard model at all.
   */
  useEffect(() => {
    const container = containerRef.current

    if (
      !container ||
      activeValue === null ||
      !container.contains(document.activeElement)
    ) {
      return
    }

    focusableElements.current.get(activeValue)?.focus()
  }, [activeValue, containerRef])

  const renderAction = (action: ToolbarAction) =>
    action.icon === undefined ? (
      <Button
        appearance="ghost"
        intent="neutral"
        isDisabled={action.isDisabled}
        onClick={action.onSelect}
        size={size}
      >
        {action.label}
      </Button>
    ) : (
      <IconButton
        appearance="ghost"
        intent="neutral"
        isDisabled={action.isDisabled}
        label={action.label}
        onClick={action.onSelect}
        size={size}
      >
        {action.icon}
      </IconButton>
    )

  const trigger =
    overflowIcon === undefined ? (
      <Button
        appearance="ghost"
        intent="neutral"
        onClick={toggle}
        size={size}
      >
        {overflowLabel}
      </Button>
    ) : (
      <IconButton
        appearance="ghost"
        intent="neutral"
        label={overflowLabel}
        onClick={toggle}
        size={size}
      >
        {overflowIcon}
      </IconButton>
    )

  const overflowElement =
    overflow === "menu" ? (
      <Menu
        isVisible={isVisible}
        items={collapsedItems
          .filter(isToolbarAction)
          .map((action) => ({
            icon: action.icon,
            isDisabled: action.isDisabled,
            key: action.key,
            label: action.label,
            onSelect: action.onSelect,
          }))}
        onDismiss={hide}
        placement="bottom-end"
        trigger={trigger}
      />
    ) : (
      <Popover
        heading={overflowLabel}
        isVisible={isVisible}
        onDismiss={hide}
        placement="bottom-end"
        trigger={trigger}
      >
        <div className="flex min-w-48 flex-col gap-1">
          {collapsedItems.map((item) =>
            isToolbarAction(item) ? (
              <Button
                appearance="ghost"
                className="justify-start"
                iconStart={item.icon}
                intent="neutral"
                isDisabled={item.isDisabled}
                isFullWidth
                key={item.key}
                onClick={() => {
                  item.onSelect()

                  // Choosing dismisses, exactly as it does in a
                  // `Menu`. A panel that stays open after an action
                  // has fired is the one users read as "it didn't
                  // work".
                  hide()
                }}
                size={size}
              >
                {item.label}
              </Button>
            ) : (
              <div
                className="flex items-center justify-between gap-3"
                key={item.key}
              >
                {item.label === undefined ? null : (
                  <span className="text-content-secondary text-sm">
                    {item.label}
                  </span>
                )}

                {item.element}
              </div>
            ),
          )}
        </div>
      </Popover>
    )

  return (
    <div
      aria-label={label}
      className={toClassName(
        "flex min-w-0 flex-1 items-center gap-1",
        className,
      )}
      /**
       * Focus arriving from **outside** the keyboard model — a
       * click, or Tab landing on the one member in the tab order —
       * becomes the active member, so the next arrow key continues
       * from where the user actually is rather than from wherever
       * the group was last left. React's `onFocus` is `focusin`, so
       * this hears a descendant.
       */
      onFocus={(focusEvent) => {
        for (const [
          key,
          element,
        ] of focusableElements.current) {
          if (element.contains(focusEvent.target)) {
            setActiveValue(key)

            return
          }
        }
      }}
      onKeyDown={(keyEvent) => {
        const commands: Record<string, () => void> = {
          ArrowLeft: focus.previous,
          ArrowRight: focus.next,
          End: focus.last,
          Home: focus.first,
        }

        const command = commands[keyEvent.key]

        if (command) {
          // Arrow keys scroll the page by default, and a toolbar
          // that scrolls the document while moving focus is the
          // hand-rolled version of this component.
          keyEvent.preventDefault()

          command()
        }
      }}
      ref={containerRef}
      role="toolbar"
    >
      {visibleItems.map((item) => (
        <ToolbarSlot
          isDisabled={
            isToolbarAction(item) &&
            item.isDisabled === true
          }
          itemKey={item.key}
          key={item.key}
          register={register}
          tabIndex={selectTabIndex(focus, item.key)}
          trackElement={trackItem}
          trackFocusable={trackFocusable}
        >
          {isToolbarAction(item)
            ? renderAction(item)
            : item.element}
        </ToolbarSlot>
      ))}

      {hasOverflow ? (
        <ToolbarSlot
          itemKey={OVERFLOW_KEY}
          register={register}
          tabIndex={selectTabIndex(focus, OVERFLOW_KEY)}
          trackElement={trackOverflowElement}
          trackFocusable={trackFocusable}
        >
          {overflowElement}
        </ToolbarSlot>
      ) : null}
    </div>
  )
}
