import { useClonedChild } from "@charcuterie/logic"
import type { Placement } from "@floating-ui/react"
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react"
import type { ReactElement } from "react"

/**
 * The floating-ui block every anchored overlay — `Popover`, `Menu`,
 * `Listbox`, `Combobox` — wrote out for itself, consolidated once.
 *
 * `Popover` and `Menu` had the same twelve-line `useFloating` +
 * `useInteractions` + `useClonedChild` preamble with two constants
 * different (the offset and the role), and the fleet's four pickers
 * hand-rolled a fifth, sixth, seventh and eighth `computePosition`
 * that reimplemented `flip`/`shift` against `window.innerHeight`.
 * This is the one implementation they all take.
 *
 * ### The owner's "configurable, but those are the basics"
 *
 * Escape and outside-press both close, **on by default**, for every
 * anchored overlay — that is what an overlay is. A component switches
 * one off through `dismiss` (a `Combobox`'s Escape clears the query
 * before it closes; a menu opened from a context click wants no
 * outside-press race with the thing that spawned it), but it opts out
 * rather than opting in.
 *
 * ### `size`, for the pickers
 *
 * `matchTriggerWidth` and `maxHeightPx` are the two things
 * `PortalDropdown` did with a hand-measured `TriggerRect` and a
 * `window.innerHeight` clamp. The `size` middleware does both from the
 * platform: the panel takes the trigger's width, and it never grows
 * past the space actually left in the viewport.
 *
 * The computed width/height are written **straight onto the floating
 * element's style** rather than lifted into React state, which is
 * floating-ui's own documented shape and is deliberate twice over: a
 * `setState` inside `apply` re-runs the position, which re-runs
 * `apply`, which is a render loop; and because these properties never
 * enter the `floatingStyles` object React manages, a component
 * re-render (a keystroke in a combobox) does not wipe them — only an
 * `autoUpdate` tick recomputes them.
 *
 * ### Portal-agnostic
 *
 * This returns the pieces — `clonedTrigger`, `getFloatingProps`,
 * `setFloating`, `floatingStyles`, `context` — and renders nothing.
 * Whether the panel goes in a `FloatingPortal`, the top layer, or in
 * place is the component's call, which is what lets the same hook back
 * a portalled `Listbox` and (for now) a top-layer `Popover`.
 */
export type AnchoredOverlayRole =
  | "dialog"
  | "listbox"
  | "menu"

export type UseAnchoredOverlayOptions = {
  /**
   * Both default **on** — Escape and outside-press are what makes an
   * overlay an overlay. Switch one off for the honest exception (a
   * combobox that swallows the first Escape to clear its query), never
   * to make a plain overlay sticky. Named for the flattened
   * floating-ui `useDismiss` options they carry.
   */
  isEscapeDismissable?: boolean
  isOutsidePressDismissable?: boolean
  /** Ports `PortalDropdown`'s anchor-width match, via `size`. */
  isTriggerWidthMatched?: boolean
  isVisible: boolean
  /** Clamps the panel to `min(this, available viewport space)`. */
  maxHeightPx?: number
  /** Popover 8, Menu/Listbox/Combobox 4. */
  offsetValue?: number
  onDismiss: () => void
  placement?: Placement
  role: AnchoredOverlayRole
  /** The control the panel hangs off. **Cloned, not wrapped.** */
  trigger: ReactElement
}

export const useAnchoredOverlay = ({
  isEscapeDismissable = true,
  isOutsidePressDismissable = true,
  isTriggerWidthMatched = false,
  isVisible,
  maxHeightPx,
  offsetValue = 8,
  onDismiss,
  placement = "bottom-start",
  role,
  trigger,
}: UseAnchoredOverlayOptions) => {
  const middleware = [
    offset(offsetValue),
    flip(),
    shift({ padding: 8 }),
  ]

  if (isTriggerWidthMatched || maxHeightPx !== undefined) {
    middleware.push(
      size({
        padding: 8,
        apply({ availableHeight, elements, rects }) {
          const cap =
            maxHeightPx === undefined
              ? availableHeight
              : Math.min(maxHeightPx, availableHeight)

          elements.floating.style.maxHeight = `${cap}px`

          if (isTriggerWidthMatched) {
            elements.floating.style.width = `${rects.reference.width}px`
          }
        },
      }),
    )
  }

  const { context, floatingStyles, refs } = useFloating({
    // Read-only. Charcuterie remains the sole owner; floating-ui is
    // told what is true and never decides it.
    open: isVisible,
    onOpenChange: (isNextVisible) => {
      if (!isNextVisible) {
        onDismiss()
      }
    },
    placement,
    middleware,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
  })

  // `useRole` writes `aria-expanded`/`aria-haspopup`/`aria-controls`
  // on the trigger and `id` + `role` on the panel from one source —
  // which is what keeps `aria-controls` pointing at the panel's real
  // id across the portal boundary, the objection the top-layer
  // decision raised and this answers.
  const { getFloatingProps, getReferenceProps } =
    useInteractions([
      useDismiss(context, {
        escapeKey: isEscapeDismissable,
        outsidePress: isOutsidePressDismissable,
      }),
      useRole(context, { role }),
    ])

  const clonedTrigger = useClonedChild(trigger, {
    ...getReferenceProps(),
    ref: refs.setReference,
  })

  return {
    clonedTrigger,
    context,
    floatingStyles,
    getFloatingProps,
    setFloating: refs.setFloating,
  }
}
