import {
  useClonedChild,
  useVisibility,
} from "@charcuterie/logic"
import type { Placement } from "@floating-ui/react"
import {
  autoUpdate,
  FloatingPortal,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react"
import type { ReactElement, ReactNode } from "react"

import type { SlotProps } from "../slotProps.ts"
import { mergeSlotProps } from "../slotProps.ts"
import { toClassName } from "../toClassName.ts"

export type TooltipProps = SlotProps & {
  /**
   * The control the tip describes. **Cloned, not wrapped** — the
   * same slot contract as `Popover`'s trigger.
   *
   * It has to be something focusable. A tooltip on a `<span>` is
   * pointer-only, which is the state mux-magic's is in today.
   */
  children: ReactElement
  className?: string
  /** Milliseconds of hover before it opens. */
  delay?: number
  /**
   * Text, and text only. `role="tooltip"` has no way to move focus
   * into itself, so a link or a button inside one is unreachable by
   * keyboard and unreadable by touch — if it needs a control, it is
   * a `Popover`.
   */
  label: string
  placement?: Placement
}

/**
 * Replaces mux-magic's `FieldTooltip`, which is 130 lines of
 * hand-rolled positioning — a `computePosition` that reimplements
 * `flip` and `shift` against `window.innerHeight` — and has three
 * defects that all render perfectly:
 *
 *  1. **Nothing references the tip.** It sets `role="tooltip"` and
 *     no `aria-describedby` anywhere, so the control it belongs to
 *     never mentions it. A screen reader reads the button, says
 *     nothing about the tip, and the tip itself is a floating node
 *     nobody is pointed at. `role="tooltip"` is not a live region;
 *     it does nothing on its own.
 *  2. **Pointer only.** `onPointerEnter`/`onPointerLeave` with no
 *     `onFocus`/`onBlur`, so a keyboard user cannot open it at all.
 *  3. **No dismiss.** Escape does nothing, which WCAG 1.4.13
 *     requires of any content shown on hover.
 *
 * All three come from the same place: the ARIA is written by hand
 * beside the behaviour instead of falling out of it. Here `useRole`
 * writes `aria-describedby` on the trigger and `role` + `id` on the
 * tip from one source, `useFocus` is what makes it keyboard-openable,
 * and `useDismiss` is Escape.
 *
 * ### Not a `title`, and not a substitute for a name
 *
 * A `title` attribute is unstyleable, has a ~1s delay nobody can
 * change, and does not exist on touch. `Badge` still uses one — for
 * a *truncation* readout, where the full text is already in
 * `textContent` and the tip is a convenience
 * ([decision](../../../docs/decisions/2026-07-30-a-badge-truncates-with-text-overflow.md)).
 * That is the line: a `title` may repeat something already
 * available, and a `Tooltip` may add something, but **neither may be
 * the only place a control's name exists**. An icon button still
 * needs its `aria-label`; the tip is extra.
 *
 * ### Touch has no hover, and this component does not pretend
 *
 * There is no long-press fallback here. A tooltip is supplementary
 * by construction, so on the kiosk it simply never appears, and
 * anything a touch user *must* read belongs in a `Field`'s
 * `description` instead. Building a long-press would make the tip
 * load-bearing on exactly the surface where it is least reliable.
 *
 * ### A slot is a pass-through
 *
 * A `Tooltip` is the natural thing to put between a `Field` and its
 * control — mux-magic's `FieldLabel` renders a `FieldTooltip` for
 * exactly that reason. Both components clone onto their one child, so
 * an outer `Field` used to hand *this component* the `id`,
 * `aria-describedby`, `aria-invalid` and `required` meant for the
 * `<input>`, and this component dropped all four without a word.
 *
 * Anything in `SlotProps` that arrives from above is forwarded to the
 * trigger, and `aria-describedby` is **merged** with the tip's own id
 * rather than overwriting it. `slotProps.ts` has the reasoning.
 */
export const Tooltip = ({
  children,
  className,
  delay = 200,
  label,
  placement = "top",
  ...receivedSlotProps
}: TooltipProps): ReactNode => {
  const { isVisible, setIsVisible } = useVisibility()

  const { context, floatingStyles, refs } = useFloating({
    // Read-only, as everywhere: floating-ui is told what is true and
    // never decides it.
    open: isVisible,
    onOpenChange: setIsVisible,
    placement,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
  })

  const { getFloatingProps, getReferenceProps } =
    useInteractions([
      useHover(context, {
        // `move: false` — a tooltip that re-opens because the
        // pointer twitched inside the trigger is the flicker every
        // hand-rolled one has.
        move: false,
        restMs: delay,
      }),
      // The line mux-magic is missing. Without it the tip is
      // pointer-only, which is a WCAG 2.1.1 failure on a control
      // whose explanation lives there.
      useFocus(context),
      useDismiss(context, { referencePress: false }),
      useRole(context, { role: "tooltip" }),
    ])

  const clonedTrigger = useClonedChild(
    children,
    // `mergeSlotProps` rather than a spread, because
    // `getReferenceProps()` writes an `aria-describedby` of its own —
    // `useRole` pointing the trigger at the tip — and an outer
    // `Field` writes one naming its description and its error. A
    // spread keeps whichever went last.
    mergeSlotProps(receivedSlotProps, {
      ...getReferenceProps(),
      ref: refs.setReference,
    }),
  )

  return (
    <>
      {clonedTrigger}

      {isVisible ? (
        <FloatingPortal>
          <div
            {...getFloatingProps()}
            className={toClassName(
              // `intent-neutral-solid` + its own `on-solid`, rather
              // than `surface-inverse` + `content-on-accent`. The
              // second pair looks like the obvious one and is not a
              // *pair* at all — nothing in the token set promises those
              // two contrast, and in `daylight` dark they land at
              // 2.9:1. The `solid`/`on-solid` roles exist precisely to
              // be a guaranteed couple, and the contrast gate checks
              // them as one.
              "z-[var(--layer-tooltip)] max-w-xs rounded-md bg-intent-neutral-solid px-2 py-1 text-intent-neutral-on-solid text-xs shadow-medium",
              className,
            )}
            // Portalled to `document.body`, the same reversal as the
            // other overlays: `strategy: "fixed"` alone still let an
            // `overflow: hidden` ancestor clip the tip, and a portal
            // does not. No `FloatingFocusManager`, unlike `Popover` —
            // focus never enters a tooltip, and moving it here is what
            // would make one unescapable. `--layer-tooltip` keeps it
            // above a modal.
            ref={refs.setFloating}
            // Duplicated from `getFloatingProps()` deliberately, and
            // the two cannot differ — `useRole(context, { role:
            // "tooltip" })` above is where it comes from. Stated here
            // because a linter cannot see a role through a spread, and
            // neither can the next reader.
            role="tooltip"
            style={floatingStyles}
          >
            {label}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  )
}
