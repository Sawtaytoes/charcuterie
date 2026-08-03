import {
  useLatestRef,
  useUniqueId,
} from "@charcuterie/logic"
import {
  FloatingFocusManager,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react"
import type { ReactNode } from "react"
import { useCallback, useEffect } from "react"

import { lockScrollBehind } from "./lockScrollBehind.ts"
import { useOverlayStack } from "./OverlayStack.tsx"
import { SharedBackdrop } from "./SharedBackdrop.tsx"

/**
 * The portalled, backdrop-backed, focus-trapping panel that `Modal`
 * renders. No chrome — that is `Dialog`'s job — only the four things
 * every backdrop overlay needs: it portals to `document.body`, a
 * scrim stands behind it, focus is trapped inside it, and Escape or an
 * outside press closes it.
 *
 * ### Portalled, and the top layer is gone on purpose
 *
 * This supersedes the `<dialog>.showModal()` top-layer approach. The
 * top layer paints above everything but cannot escape an
 * `overflow: hidden` ancestor's *clipping* in every case the fleet
 * hit; a portal to `document.body` does. The objection the old
 * decision raised — a portal moves the node out of a scoped query —
 * is answered by `useRole` writing `aria-controls`/`aria-labelledby`
 * so the trigger→panel link is followable across the boundary, and by
 * the stories scoping panels to `within(document.body)` while the
 * structural `expectAgentDrivable` needs no change.
 *
 * ### Only the top of the stack is live
 *
 * `useDismiss` (Escape + outside press) is enabled **only when this is
 * the top** of the stack, so an outside press or Escape closes the
 * innermost modal and nothing under it — the same rule the platform's
 * nested `<dialog>` gave for free, without a hand-rolled document
 * keydown racing the focus manager. Everything below the top is
 * `inert`, which is what `expectHiddenFromAgents` asserts and what
 * makes `FloatingFocusManager`'s trap unambiguous.
 *
 * ### One accessible name, required
 *
 * A `role="dialog"` takes no name from its content, so one of
 * `aria-label` / `aria-labelledby` must be present. Missing both is a
 * dev-time warning, not a throw — the lesson `Spinner`, `Popover`, and
 * `Modal` each learned, applied without breaking a render.
 */
export type OverlayPanelProps = {
  "aria-label"?: string
  "aria-labelledby"?: string
  children: ReactNode
  className?: string
  /** Escape and an outside press both close. */
  isDismissable?: boolean
  isVisible: boolean
  onClose: () => void
  role?: "alertdialog" | "dialog"
}

export const OverlayPanel = ({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  isDismissable = true,
  isVisible,
  onClose,
  role = "dialog",
}: OverlayPanelProps): ReactNode => {
  const stack = useOverlayStack()

  const id = useUniqueId()

  // A stable close, so registering it does not churn the stack as the
  // caller's `onClose` closure changes identity between renders.
  const onCloseRef = useLatestRef(onClose)

  const stableOnClose = useCallback(() => {
    onCloseRef.current()
  }, [onCloseRef])

  const isTop = !stack.isProvided || stack.topId === id

  const { context, refs } = useFloating({
    open: isVisible,
    onOpenChange: (isNextVisible) => {
      if (!isNextVisible) {
        onClose()
      }
    },
  })

  const { getFloatingProps } = useInteractions([
    useDismiss(context, {
      escapeKey: isDismissable && isTop,
      // The top's outside press is the backdrop click. A per-panel
      // `outsidePress` on a *lower* modal would close it too, so it is
      // scoped to the top — which is also why the scrim needs no click
      // handler of its own.
      outsidePress: isDismissable && isTop,
    }),
    useRole(context, { role }),
  ])

  const { register, unregister } = stack

  useEffect(() => {
    if (!isVisible) {
      return
    }

    register({ id, onClose: stableOnClose })

    return () => {
      unregister(id)
    }
  }, [id, isVisible, register, stableOnClose, unregister])

  // Ref-counted through `lockScrollBehind`'s module scope, so N
  // stacked panels lock the page once and free it only when the last
  // closes — with or without a provider.
  useEffect(
    () => (isVisible ? lockScrollBehind() : undefined),
    [isVisible],
  )

  useEffect(() => {
    if (
      isVisible &&
      ariaLabel === undefined &&
      ariaLabelledBy === undefined
    ) {
      console.warn(
        'OverlayPanel: a modal needs an accessible name. Pass `aria-label` or `aria-labelledby` — a `role="dialog"` takes none from its content and is announced as just "dialog".',
      )
    }
  }, [ariaLabel, ariaLabelledBy, isVisible])

  if (!isVisible) {
    return null
  }

  return (
    <>
      {/* A self-hosting `Modal` renders its own scrim; under a
          provider the shared one already stands behind every panel. */}
      {stack.isProvided ? null : (
        <SharedBackdrop isVisible />
      )}

      <FloatingPortal>
        <div className="fixed inset-0 z-[var(--layer-modal)] flex items-center justify-center">
          <FloatingFocusManager
            context={context}
            // Only the top traps focus; a lower panel is `inert`
            // anyway, and two live traps fight over one caret.
            disabled={!isTop}
            modal
          >
            <div
              {...getFloatingProps()}
              // Spread rather than written as literal attributes:
              // both `dialog` and `alertdialog` take a name, but the
              // role arrives as a variable and a static a11y linter
              // cannot confirm that through it. `useRole` supplies the
              // role itself; these are the accessible name.
              {...{
                "aria-label": ariaLabel,
                "aria-labelledby": ariaLabelledBy,
              }}
              className={className}
              // The fallback the plan calls for: `inert` on every panel
              // but the top, so a lower modal is unreachable across the
              // portal boundary even where `FloatingFocusManager`'s
              // outside-hiding does not reach a sibling portal.
              inert={isTop ? undefined : true}
              ref={refs.setFloating}
              role={role}
            >
              {children}
            </div>
          </FloatingFocusManager>
        </div>
      </FloatingPortal>
    </>
  )
}
