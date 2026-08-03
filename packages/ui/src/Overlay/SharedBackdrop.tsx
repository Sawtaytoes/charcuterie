import { FloatingPortal } from "@floating-ui/react"
import type { ReactNode } from "react"

/**
 * The scrim, and there is exactly one of it however many backdrop
 * modals are stacked.
 *
 * Purely visual: `aria-hidden`, no handlers. Dismissal — a press
 * anywhere off the top panel — is the top panel's own
 * `useDismiss({ outsidePress })`, not a click on this node, which is
 * what lets the whole package drop the `useKeyWithClickEvents`
 * suppression the `<dialog>` backdrop needed. A press lands on the
 * top panel's full-viewport centring layer (which sits above this),
 * so this element never has to be the click target.
 *
 * Portalled to `document.body` and rendered as the **first** portal
 * of the stack — the provider renders it before its children, a
 * self-hosting `Modal` renders it before its own panel portal — so at
 * an equal `--layer-modal` z-index the later-mounted panels paint on
 * top by DOM order. That is the whole stacking model: append order,
 * no per-modal z-index arithmetic.
 */
export const SharedBackdrop = ({
  isVisible,
}: {
  isVisible: boolean
}): ReactNode => {
  if (!isVisible) {
    return null
  }

  return (
    <FloatingPortal>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[var(--layer-modal)] bg-scrim"
      />
    </FloatingPortal>
  )
}
