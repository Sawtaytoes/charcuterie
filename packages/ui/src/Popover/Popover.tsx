import type { Placement } from "@floating-ui/react"
import { FloatingFocusManager } from "@floating-ui/react"
import type { ReactElement, ReactNode } from "react"

import { PANEL_SURFACE_CLASS } from "../Overlay/overlayPanelClass.ts"
import { useAnchoredOverlay } from "../Overlay/useAnchoredOverlay.ts"
import { toClassName } from "../toClassName.ts"

export type PopoverProps = {
  children: ReactNode
  className?: string
  /**
   * Required, and it becomes the panel's `aria-label`. A
   * `role="dialog"` takes **no accessible name from its content**,
   * so an unnamed one is announced as "dialog" and is unfindable
   * by `getByRole("dialog", { name })` — the same trap `Spinner`
   * walked into in M3 with `role="status"`.
   */
  heading: string
  isVisible: boolean
  /**
   * Outside press and Escape both land here, through floating-ui's
   * `useDismiss`. Wire it to a `useVisibility()`'s `hide`.
   */
  onDismiss: () => void
  placement?: Placement
  /**
   * The control the panel hangs off. **Cloned, not wrapped** — an
   * extra `<div>` around a button is how a toolbar's layout
   * quietly changes.
   */
  trigger: ReactElement
}

/**
 * Replaces mux-magic's `@radix-ui/react-popover` re-export, and it
 * is a rewrite rather than a swap for one reason: Radix owns
 * `open`, so wrapping it leaves `useVisibility` and Radix both
 * believing they hold it. `@floating-ui/react` is the layer Radix,
 * Base UI, and Ark UI are all *built on*, and it is controlled by
 * construction — you pass state in and it never stores any.
 *
 * What floating-ui is used for is what only it can do: collision
 * handling (`flip`, `shift`), a real dismiss layer, and focus
 * management. Positioning strategy, the top layer, and the ARIA
 * wiring come from the platform and from `useRole`.
 *
 * ### The top layer, from the platform — not a portal
 *
 * `popover="manual"` puts the panel in the top layer, which is
 * what a portal is normally reached for: no `z-index` contest, and
 * no `overflow: hidden` ancestor clipping it. Unlike a portal it
 * **stays where it is in the DOM**, so `canvas.getByRole("dialog")`
 * still finds it and a story keeps its scoping. Same argument as
 * `Modal`, one layer down.
 *
 * `manual`, not `auto`, and that is the state-ownership decision
 * again: `auto` brings the UA's own light-dismiss, which closes the
 * element by itself and leaves `isVisible` true. `useDismiss` does
 * the same job through our callback, so Charcuterie stays the only
 * thing that decides.
 *
 * ### Two UA defaults that have to be undone
 *
 * `[popover]` ships `position: fixed; inset: 0; margin: auto`,
 * which centres the panel in the viewport and fights every
 * coordinate floating-ui computes — hence `inset-auto m-0`, and
 * `strategy: "fixed"` so the numbers are viewport-relative like the
 * top layer itself. Getting either wrong reads as a positioning
 * bug rather than as a UA default.
 */
export const Popover = ({
  children,
  className,
  heading,
  isVisible,
  onDismiss,
  placement = "bottom-start",
  trigger,
}: PopoverProps): ReactNode => {
  const {
    clonedTrigger,
    context,
    floatingStyles,
    getFloatingProps,
    setFloating,
  } = useAnchoredOverlay({
    isVisible,
    offsetValue: 8,
    onDismiss,
    placement,
    role: "dialog",
    trigger,
  })

  return (
    <>
      {clonedTrigger}

      {isVisible ? (
        <FloatingFocusManager
          context={context}
          modal={false}
        >
          <div
            {...getFloatingProps()}
            aria-label={heading}
            className={toClassName(
              PANEL_SURFACE_CLASS,
              "inset-auto m-0 max-w-xs p-3 text-content-primary text-sm",
              className,
            )}
            popover="manual"
            // Duplicated from `getFloatingProps()` on purpose, and
            // the two cannot differ — `useRole(context, { role:
            // "dialog" })` above is where it comes from. Stated
            // here because a linter cannot see a role through a
            // spread, and neither can the next reader.
            role="dialog"
            ref={(node) => {
              setFloating(node)

              // In a ref callback rather than an effect, because a
              // `[popover]` is `display: none` until it is shown —
              // and `FloatingFocusManager` is a *child*, so its
              // effect runs first and would be focusing into a
              // hidden element. Refs are set during commit, before
              // any of that.
              if (node && !node.matches(":popover-open")) {
                node.showPopover()
              }
            }}
            style={floatingStyles}
          >
            {children}
          </div>
        </FloatingFocusManager>
      ) : null}
    </>
  )
}
