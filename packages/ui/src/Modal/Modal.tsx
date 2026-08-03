import type { ReactNode } from "react"

import { OverlayPanel } from "../Overlay/OverlayPanel.tsx"
import { toClassName } from "../toClassName.ts"

export type ModalProps = {
  "aria-label"?: string
  "aria-labelledby"?: string
  children: ReactNode
  className?: string
  /** Escape and a backdrop press both close. */
  isDismissable?: boolean
  isVisible: boolean
  /**
   * Every route out lands here: Escape, a backdrop press. Wire it to a
   * `useVisibility()`'s `hide`.
   */
  onClose: () => void
  role?: "alertdialog" | "dialog"
}

/**
 * The base layer. Backdrop, dismiss, and portal — and no chrome.
 *
 * This is the generic modal the library never had while `Modal` was
 * secretly a *dialog*. A dialog is one kind of modal; so are a
 * confirmation, a media lightbox, and anything else that wants a
 * scrim, an Escape, and a click-outside. `Modal` is that foundation,
 * and `Dialog` is `Modal` plus the heading/Close/footer/size chrome
 * the old component shipped.
 *
 * It renders an `OverlayPanel`: portalled to `document.body` (escaping
 * `overflow: hidden` the top layer could not), focus-trapped, stacked
 * by portal append order, and dismissible only when it is the top of
 * the stack. All `Modal` adds is a sensible surface — a bordered,
 * rounded, elevated box clamped to `85dvh` — that a caller composes
 * over with `className`. `Dialog` replaces the width and layout; a
 * bare `Modal` sizes to its content.
 *
 * ### One accessible name, required
 *
 * A `role="dialog"` takes no name from its content, so pass exactly
 * one of `aria-label` / `aria-labelledby`. Missing both is a dev-time
 * warning from `OverlayPanel`, not a throw — the lesson `Spinner`,
 * `Popover`, and the old `Modal` each learned.
 *
 * ### Stacking is zero-config, until it is not
 *
 * A lone `Modal` renders its own scrim with no setup. Only when modals
 * **stack** — one opened from inside another — does the app need an
 * `OverlayStackProvider` at its root, so the N of them share one scrim
 * and dismiss top-first.
 */
const MODAL_BOX_CLASS =
  "flex max-h-[85dvh] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-overlay text-content-primary shadow-high"

export const Modal = ({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  isDismissable = true,
  isVisible,
  onClose,
  role = "dialog",
}: ModalProps): ReactNode => (
  <OverlayPanel
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    className={toClassName(MODAL_BOX_CLASS, className)}
    isDismissable={isDismissable}
    isVisible={isVisible}
    onClose={onClose}
    role={role}
  >
    {children}
  </OverlayPanel>
)
