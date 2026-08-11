import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

/**
 * Every focusable a toolbar knows how to hand a tab stop to.
 *
 * `[tabindex]` carries **no** `:not([tabindex="-1"])` clause, unlike
 * the usual copy of this selector: the whole job here is to move a
 * tab stop between elements, so an element this slot has already
 * pushed out of the tab order still has to be findable to be let
 * back in.
 */
const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]"

export type ToolbarSlotProps = {
  children: ReactNode
  /** A disabled member never registers, so the arrows skip it. */
  isDisabled?: boolean
  itemKey: string
  /** `RovingFocus.register` — membership of the arrow-key group. */
  register: (value: string) => () => void
  tabIndex: number
  /** Hands the slot's box to the measuring hook. */
  trackElement: (
    key: string,
    element: HTMLElement | null,
  ) => void
  /** Hands the slot's focusable to the toolbar, for `.focus()`. */
  trackFocusable: (
    key: string,
    element: HTMLElement | null,
  ) => void
}

/**
 * One member of the toolbar's roving group: an action the toolbar
 * rendered, or a control the caller handed in.
 *
 * Its own file because **registration is an effect**, and an effect
 * cannot run in a loop — the same reason `MenuAction`, `TabTrigger`
 * and `AccordionSection` are separate files.
 *
 * ### Why the tab stop is written imperatively
 *
 * Every other roving group in this library passes `tabIndex` as a
 * prop, because it renders its own members. A toolbar does not: a
 * `control` item is whatever the app already has — a `Switch`, a
 * `ColorSchemeSwitcher`, a `SegmentedControl` — and most components
 * in this library do not forward a `tabIndex` prop at all. Cloning
 * one onto them would compile, do nothing, and leave the bar with
 * one tab stop per control, which is precisely the APG violation
 * this component exists to fix (mux-magic's `role="toolbar"` is six
 * sequential tab stops).
 *
 * So the slot finds the one focusable in its subtree and writes
 * `tabIndex` onto it. React never sets that attribute on these
 * elements, so there is no second writer to fight with.
 *
 * A control holding **more than one** focusable is a nested
 * composite the toolbar does not manage; only the first is given
 * the tab stop, and `Toolbar.mdx` says so.
 */
export const ToolbarSlot = ({
  children,
  isDisabled = false,
  itemKey,
  register,
  tabIndex,
  trackElement,
  trackFocusable,
}: ToolbarSlotProps): ReactNode => {
  const slotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isDisabled) {
      return
    }

    return register(itemKey)
  }, [isDisabled, itemKey, register])

  useEffect(() => {
    // The first focusable that is not an `aria-hidden` prop —
    // floating-ui plants focus guards (`<span tabindex="0">`) either
    // side of an overlay's reference element, and the overflow
    // trigger *is* one, so a bare `querySelector` can hand back a
    // guard and give the tab stop to something no user can see.
    const focusable =
      Array.from(
        slotRef.current?.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR,
        ) ?? [],
      ).find(
        (candidate) =>
          candidate.getAttribute("aria-hidden") !== "true",
      ) ?? null

    trackFocusable(itemKey, focusable)

    if (focusable && !isDisabled) {
      focusable.tabIndex = tabIndex
    }

    return () => {
      trackFocusable(itemKey, null)
    }
  }, [isDisabled, itemKey, tabIndex, trackFocusable])

  return (
    <div
      className="flex shrink-0 items-center"
      ref={(element) => {
        slotRef.current = element

        trackElement(itemKey, element)
      }}
    >
      {children}
    </div>
  )
}
