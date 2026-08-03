import { useUniqueId } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { Modal } from "../Modal/Modal.tsx"
import { toClassName } from "../toClassName.ts"

export type DialogSize = "full" | "lg" | "md" | "sm" | "xl"

export type DialogProps = {
  /**
   * The scrolling body. Optional: a confirm dialog whose question is
   * its `heading` and whose answers are its `footer` has no body, and
   * the old chrome `Modal` (which extended `<dialog>`'s DOM props)
   * allowed that — `Dialog` keeps it.
   */
  children?: ReactNode
  className?: string
  /** The footer row. Buttons, usually. */
  footer?: ReactNode
  heading: string
  headingLevel?: 2 | 3 | 4
  /**
   * Escape and a backdrop press both close. Off for the one honest
   * case — a destructive confirm the user has to answer.
   */
  isDismissable?: boolean
  isVisible: boolean
  /**
   * Every route out lands here: the close button, Escape, a backdrop
   * press. Wire it to a `useVisibility()`'s `hide`.
   */
  onClose: () => void
  size?: DialogSize
}

/**
 * `85dvh` rather than `85vh` — on a phone the two differ by the
 * address bar, and a dialog whose footer is under it is a dialog
 * with no buttons.
 */
const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-h-[85dvh] w-full max-w-sm",
  md: "max-h-[85dvh] w-full max-w-md",
  lg: "max-h-[85dvh] w-full max-w-2xl",
  // M5 added this, because the scale jumped from 42rem straight to
  // the whole viewport and rip-deck's capture tail lands in the
  // gap: a MakeMKV robot log is fixed-width `MSG:5072,0,1,"…"`
  // lines that wrap badly at 42rem, and a full-screen dialog over a
  // nine-bay dashboard hides the thing being diagnosed. 56rem is
  // what that app's hand-rolled `<dialog>` used before the swap.
  xl: "max-h-[85dvh] w-full max-w-4xl",
  full: "h-[100dvh] max-h-[100dvh] w-full max-w-full rounded-none",
}

/**
 * `Modal` plus the chrome — heading, a Close button, a scrolling body,
 * an optional footer, and five sizes. This is what `Modal` *was*
 * before the M8 rebuild renamed it: a dialog is one kind of modal, so
 * it takes the specific name and hands the generic one back to the
 * base layer.
 *
 * Everything modal — the portal, the scrim, Escape and outside-press
 * dismiss, the focus trap, the scroll lock, the stacking — is `Modal`'s
 * (via `OverlayPanel`), so this component is just the box's contents
 * and the size class it wants that box to be. `SIZE_CLASS` is composed
 * over `Modal`'s default surface, which is why `full` carries
 * `rounded-none` to square off the base's `rounded-lg` at the viewport
 * edge.
 *
 * ### The accessible name
 *
 * `heading` is required and is a string, not a `ReactNode`. It names
 * both the visible header and — through `aria-labelledby` on the
 * modal — the dialog itself. A dialog with no name is announced as
 * "dialog" and nothing else, which is what every hand-rolled modal in
 * the inventory does.
 */
export const Dialog = ({
  children,
  className,
  footer,
  heading,
  headingLevel = 2,
  isDismissable = true,
  isVisible,
  onClose,
  size = "md",
}: DialogProps): ReactNode => {
  const headingId = useUniqueId()

  const Heading = `h${headingLevel}` as const

  return (
    <Modal
      aria-labelledby={headingId}
      className={toClassName(SIZE_CLASS[size], className)}
      isDismissable={isDismissable}
      isVisible={isVisible}
      onClose={onClose}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle p-4">
        <Heading
          className="font-semibold text-lg leading-tight"
          id={headingId}
        >
          {heading}
        </Heading>

        {isDismissable ? (
          <Button
            appearance="ghost"
            intent="neutral"
            onClick={onClose}
            size="sm"
          >
            Close
          </Button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {children}
      </div>

      {footer ? (
        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border-subtle p-4">
          {footer}
        </footer>
      ) : null}
    </Modal>
  )
}
