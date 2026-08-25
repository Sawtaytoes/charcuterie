import {
  useClonedChild,
  useUniqueId,
} from "@charcuterie/logic"
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
import type { ReactElement, RefObject } from "react"
import { createElement, useEffect } from "react"

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
   * Anchor the panel to a **pre-existing** element the consumer already
   * rendered, instead of cloning a `trigger`. For the attached-input
   * `Combobox`, whose reference is the consumer's own `<input>` (both the
   * value and the query) — there is nothing to clone. Supply exactly one
   * of `anchorRef` / `trigger`; with `anchorRef`, `clonedTrigger` is
   * `null`.
   */
  anchorRef?: RefObject<HTMLElement | null>
  /**
   * Both default **on** — Escape and outside-press are what makes an
   * overlay an overlay. Switch one off for the honest exception (a
   * combobox that swallows the first Escape to clear its query), never
   * to make a plain overlay sticky. Named for the flattened
   * floating-ui `useDismiss` options they carry.
   */
  isEscapeDismissable?: boolean
  /**
   * Clamp the panel to the space the viewport actually leaves below
   * (or above) the trigger, with no fixed cap. The panel owes itself
   * an `overflow`, or a clamped one simply hides its last rows.
   *
   * `maxHeightPx` implies this *and* caps it at a number — a `Listbox`
   * never wants to be 900px tall even on a monitor that would allow
   * it. A `Menu` wants the other half only: as tall as its items need,
   * and never off the bottom of the screen.
   */
  isHeightClamped?: boolean
  isOutsidePressDismissable?: boolean
  /** Ports `PortalDropdown`'s anchor-width match, via `size`. */
  isTriggerWidthMatched?: boolean
  isVisible: boolean
  /** Clamps the panel to `min(this, available viewport space)`. */
  maxHeightPx?: number
  /**
   * Caps the panel's width at `min(this, available viewport space)`,
   * symmetric with `maxHeightPx`. Without it a picker grows to its
   * widest content — a long `Combobox` footer sentence or option label
   * drags the whole panel absurdly wide; the cap lets that content wrap
   * instead. Omit for width-follows-content (the default).
   */
  maxWidthPx?: number
  /** Popover 8, Menu/Listbox/Combobox 4. */
  offsetValue?: number
  onDismiss: () => void
  placement?: Placement
  role: AnchoredOverlayRole
  /**
   * The control the panel hangs off. **Cloned, not wrapped.** Omit only
   * when `anchorRef` is supplied instead.
   */
  trigger?: ReactElement
}

// `useClonedChild` insists on exactly one element, and hooks cannot be
// called conditionally — so in `anchorRef` mode we still call it, on this
// throwaway, and discard the result. It is never rendered and never
// receives the floating reference (that goes to `anchorRef`).
const PLACEHOLDER_TRIGGER = createElement("span")

export const useAnchoredOverlay = ({
  anchorRef,
  isEscapeDismissable = true,
  isHeightClamped = false,
  isOutsidePressDismissable = true,
  isTriggerWidthMatched = false,
  isVisible,
  maxHeightPx,
  maxWidthPx,
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

  if (
    isHeightClamped ||
    isTriggerWidthMatched ||
    maxHeightPx !== undefined ||
    maxWidthPx !== undefined
  ) {
    middleware.push(
      size({
        padding: 8,
        apply({
          availableHeight,
          availableWidth,
          elements,
          rects,
        }) {
          const heightCap =
            maxHeightPx === undefined
              ? availableHeight
              : Math.min(maxHeightPx, availableHeight)

          elements.floating.style.maxHeight = `${heightCap}px`

          if (maxWidthPx !== undefined) {
            const widthCap = Math.min(
              maxWidthPx,
              availableWidth,
            )

            elements.floating.style.maxWidth = `${widthCap}px`
          }

          if (isTriggerWidthMatched) {
            elements.floating.style.width = `${rects.reference.width}px`
          }
        },
      }),
    )
  }

  const isAnchored = anchorRef !== undefined

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

  // `useRole` for a `listbox` overwrites the trigger's own role with
  // `combobox` — the select-only-combobox pattern, which then demands
  // its own `aria-label`. The fleet's pattern is a plain button that
  // *opens* a listbox, so the injected `role` is dropped and the
  // trigger keeps its native semantics while still gaining
  // `aria-haspopup="listbox"`/`aria-expanded`/`aria-controls`. `useRole`
  // injects a reference `role` only for listbox/combobox, so this is a
  // no-op for `Popover` (dialog) and `Menu` (menu).
  const { role: _discardedTriggerRole, ...referenceProps } =
    getReferenceProps()

  // A stable id on the trigger, so a panel that needs a name can point
  // `aria-labelledby` at it across the portal. `useRole` already gives
  // a `menu`'s reference an id (and labels the panel with it); this
  // reuses that when present and supplies one otherwise — which is what
  // a `listbox` panel needs, since a bare `role="listbox"` is an ARIA
  // input field and must be named.
  const generatedTriggerId = useUniqueId()

  /**
   * The trigger's OWN id wins over both.
   *
   * This hook used to mint an id and clone it over whatever the
   * trigger already had, on the reasoning that the panel needs a
   * stable target for `aria-labelledby`. It does — but any id serves
   * that purpose, including the caller's, and overwriting had a
   * consequence nobody traced: `Field` clones a `controlId` onto its
   * child and renders `<label htmlFor={controlId}>`, so for every
   * `Picker`/`Listbox`/`Combobox`/`Menu` inside a `Field` the label
   * pointed at an element that did not exist. Measured in a real
   * browser: zero nodes carried the id the `<label>` named.
   *
   * That is the exact defect `Field`'s docstring calls "precisely the
   * defect this component was built to make impossible" — arriving by
   * a different route, and silent, because a dangling `htmlFor`
   * throws nothing and shows nothing.
   *
   * Preferring the child's id fixes the label without weakening the
   * panel: `aria-labelledby` now points at the caller's id instead of
   * a generated one, which is the same element either way.
   *
   * Two rediscoveries of the overwrite are already in the fleet —
   * queuepilot and mux-magic both moved their e2e handles to
   * `data-testid` because `id` "did not survive". `data-testid` is
   * still the more robust handle, but `id` is no longer a trap.
   */
  const triggerOwnId = (
    trigger?.props as { id?: string } | undefined
  )?.id

  const triggerId =
    triggerOwnId ??
    (referenceProps.id as string | undefined) ??
    generatedTriggerId

  // In anchor mode floating-ui's reference is the consumer's element, set
  // imperatively — there is no cloned trigger to carry `refs.setReference`.
  // `setReference` is stable; re-running on `isVisible` re-applies it when
  // the panel opens (and after the anchor element mounts).
  useEffect(() => {
    if (!isAnchored) {
      return
    }

    refs.setReference(anchorRef.current)
  }, [isAnchored, anchorRef, refs])

  const clonedChild = useClonedChild(
    trigger ?? PLACEHOLDER_TRIGGER,
    {
      ...referenceProps,
      id: triggerId,
      // The anchor element already exists; the clone (a discarded
      // placeholder here) must not also claim the floating reference.
      ...(isAnchored ? {} : { ref: refs.setReference }),
    },
  )

  const clonedTrigger = isAnchored ? null : clonedChild

  return {
    clonedTrigger,
    context,
    floatingStyles,
    getFloatingProps,
    setFloating: refs.setFloating,
    triggerId,
  }
}
