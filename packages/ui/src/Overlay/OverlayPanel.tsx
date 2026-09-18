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
import type { ReactNode, RefObject } from "react"
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
  /**
   * Which element takes the caret when the panel opens.
   *
   * Without it the focus manager takes the first tabbable element,
   * which for anything with chrome is the **Close button** — so a
   * panel wrapping a form opens with the caret on "Close" and the
   * first thing typed goes nowhere. A consumer cannot fix that from
   * outside: focusing in its own effect races the manager, and the
   * manager wins, which reads as the app ignoring you.
   */
  initialFocus?: RefObject<HTMLElement | null>
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
  initialFocus,
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
      outsidePress: (event) => {
        if (!isDismissable || !isTop) return false
        /*
         * ⚠️ A press on a toast is NOT an outside press.
         *
         * A `ToastRegion` renders in the page, so floating-ui sees a
         * press on its Undo as a press outside the floating element
         * — and closing the modal on the way to taking an action
         * back is the opposite of what the button says. The region
         * marks itself with `data-charcuterie-toast-region`; nothing
         * else in the fleet carries that attribute.
         *
         * ⚠️ Do not delete this on the evidence of a small story.
         * floating-ui has a *second*, accidental guard that hides
         * this one: `closeOnPressOutside` bails out early when the
         * press target's body-level ancestor contains none of the
         * `[data-floating-ui-inert]` markers `markOthers` left
         * behind, on the theory that such an element was injected
         * after the panel opened. A page that is nothing but a
         * region takes that branch and never reaches this predicate
         * at all. A page with content beside the region — every real
         * app — does reach it. `Toast.stories.tsx`'s
         * `OverStackedModals` carries a heading and a paragraph for
         * exactly that reason, and `ToastRegion.test.tsx` fails
         * without this predicate only because they are there.
         */
        const target = event.target as Element | null
        return (
          target?.closest?.(
            "[data-charcuterie-toast-region]",
          ) == null
        )
      },
    }),
    useRole(context, { role }),
  ])

  const { register, unregister } = stack

  /**
   * Where this panel sits in the stack, and therefore how far above
   * `--layer-modal` it paints. `0` when unprovided — a lone `Modal`
   * is the only thing open.
   */
  const stackIndex = Math.max(
    stack.orderedIds.indexOf(id),
    0,
  )

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
        <div
          className="fixed inset-0 flex items-center justify-center"
          /*
           * ⚠️ Cascading, not one shared layer.
           *
           * Every panel used to render at the one `--layer-modal`, and
           * which of two open modals painted on top fell out of the
           * order their portals happened to be appended in. A modal
           * opened from inside another is the case that made this
           * visible. The index in the stack is the answer the stack
           * already knows.
           *
           * The scale's gaps are 100, so a cascade this deep is
           * arithmetic nobody has to think about — and the toast sits
           * at `--layer-toast` plus the same depth, above all of it.
           */
          style={{
            zIndex: `calc(var(--layer-modal) + ${stackIndex})`,
          }}
        >
          <FloatingFocusManager
            context={context}
            // `undefined` keeps the manager's own default (the first
            // tabbable), so nothing changes for a panel that does not
            // ask.
            initialFocus={initialFocus ?? undefined}
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
