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
 * Portalled to `document.body` on `--layer-overlay`, one step **below**
 * the panels' `--layer-modal`, so it always paints behind every open
 * modal and never intercepts a click meant for the dialog on top of it
 * — a real bug a same-z-plus-DOM-order scheme has, because a
 * later-mounted scrim then covers the panel. Stacking *between* panels
 * still falls out of append order at the one `--layer-modal`.
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
        className="fixed inset-0 z-[var(--layer-overlay)] bg-scrim"
      />
    </FloatingPortal>
  )
}
