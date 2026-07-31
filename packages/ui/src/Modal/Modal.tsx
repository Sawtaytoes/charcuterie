import { useUniqueId } from "@charcuterie/logic"
import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react"
import { useEffect, useRef } from "react"

import { Button } from "../Button/Button.tsx"
import { toClassName } from "../toClassName.ts"
import { lockScrollBehind } from "./lockScrollBehind.ts"

export type ModalSize = "full" | "lg" | "md" | "sm" | "xl"

export type ModalProps = Omit<
  ComponentPropsWithRef<"dialog">,
  "onClose" | "open"
> & {
  /** The footer row. Buttons, usually. */
  footer?: ReactNode
  heading: string
  headingLevel?: 2 | 3 | 4
  /**
   * Escape and a backdrop press both close. Off for the one
   * honest case — a destructive confirm the user has to answer —
   * and off means Escape is *cancelled* rather than ignored, so
   * the browser cannot close a dialog the app still owns.
   */
  isDismissable?: boolean
  isVisible: boolean
  /**
   * Every route out lands here: the close button, Escape, a
   * backdrop press. Wire it to a `useVisibility()`'s `hide`.
   */
  onClose: () => void
  size?: ModalSize
}

/**
 * `85dvh` rather than `85vh` — on a phone the two differ by the
 * address bar, and a dialog whose footer is under it is a dialog
 * with no buttons.
 */
const SIZE_CLASS: Record<ModalSize, string> = {
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
 * Four repos, and **plex-channels and ripdeck independently
 * converged on native `<dialog>`** — which is the design here
 * rather than a shortcut. `showModal()` gives a focus trap,
 * Escape, `::backdrop`, `inert` on everything behind it, and the
 * **top layer**, from the platform, correctly, in every browser
 * the fleet runs.
 *
 * What is not free — and the reason a component exists at all —
 * is that a native `<dialog>` is a *self-owning* control: call
 * `showModal()` and it decides it is open. That is the same
 * conflict Radix has, and it gets the same answer as everywhere
 * else in this library: **`isVisible` is the truth, and an effect
 * makes the element agree with it.** Nothing here reads
 * `dialogElement.open` as state; it is read only to avoid calling
 * a method that would throw.
 *
 * ### Why it is not portalled
 *
 * The top layer is a *paint* concept: a `<dialog>` renders above
 * everything while staying exactly where it is in the DOM. So it
 * needs no portal — and that matters well past tidiness, because a
 * portal moves the node to `document.body`, out of whatever
 * element a test or an agent scoped its queries to.
 * `canvas.getByRole("dialog")` finds this one. It would not find a
 * portalled one, and the story would have to reach for `screen`
 * and lose its scoping.
 *
 * ### `open:flex`, not `flex`
 *
 * A closed `<dialog>` is hidden by a UA rule that any
 * `display: flex` of ours would beat — so the modal would render
 * permanently, in the page flow, with no error. The layout is
 * therefore behind Tailwind's `open:` variant, which is the
 * `[open]` attribute the browser manages.
 *
 * ### The accessible name
 *
 * `heading` is required and is a string, not a `ReactNode`. A
 * dialog with no name is announced as "dialog" and nothing else,
 * which is what every hand-rolled modal in the inventory does.
 */
export const Modal = ({
  children,
  className,
  footer,
  heading,
  headingLevel = 2,
  isDismissable = true,
  isVisible,
  onClose,
  size = "md",
  ...dialogProps
}: ModalProps): ReactNode => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const headingId = useUniqueId()

  const Heading = `h${headingLevel}` as const

  useEffect(() => {
    const dialogElement = dialogRef.current

    if (!dialogElement) {
      return
    }

    // Guarded both ways. `showModal()` on an already-open dialog
    // throws `InvalidStateError`, and `close()` on a closed one
    // fires a spurious `close` event — either turns a re-render
    // into a bug.
    if (isVisible && !dialogElement.open) {
      dialogElement.showModal()
    }

    if (!isVisible && dialogElement.open) {
      dialogElement.close()
    }
  }, [isVisible])

  useEffect(
    () => (isVisible ? lockScrollBehind() : undefined),
    [isVisible],
  )

  return (
    /*
     * The one suppression in this package, and the rule really is
     * wrong here rather than inconvenient.
     *
     * `useKeyWithClickEvents` looks for a click handler on
     * something a keyboard user cannot reach. This one is on the
     * **backdrop** — which is not an element, has no keyboard
     * equivalent to give it, and whose keyboard counterpart is the
     * `onCancel` directly above: Escape, from the platform, which
     * is the entire reason this is built on `<dialog>`. Biome
     * cannot see `onCancel` as a keyboard route.
     *
     * Pairing the click with an `onKeyDown` to satisfy the rule
     * would duplicate a close request the browser already routes
     * correctly — including deciding which of two stacked dialogs
     * it belongs to — which is a worse component in exchange for a
     * green linter.
     */
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape is handled by `onCancel`, which this rule cannot see.
    <dialog
      {...dialogProps}
      aria-labelledby={headingId}
      className={toClassName(
        // `m-auto` and `p-0` undo the UA stylesheet, which centres
        // by margin and adds padding of its own.
        "m-auto flex-col overflow-hidden rounded-lg border border-border-default bg-surface-overlay p-0 text-content-primary shadow-high backdrop:bg-scrim open:flex",
        SIZE_CLASS[size],
        className,
      )}
      onCancel={(cancelEvent) => {
        // Escape. Cancelled rather than ignored when the dialog is
        // not dismissable: letting the browser close it would
        // leave `isVisible` true and the element shut, which is
        // precisely the desync this component exists to prevent.
        cancelEvent.preventDefault()

        if (isDismissable) {
          onClose()
        }
      }}
      onClick={(clickEvent) => {
        // The backdrop is not an element — a press on it targets
        // the `<dialog>` itself, while a press on the content
        // targets something inside. Comparing target to
        // currentTarget is the whole test.
        if (
          isDismissable &&
          clickEvent.target === clickEvent.currentTarget
        ) {
          onClose()
        }
      }}
      ref={dialogRef}
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
    </dialog>
  )
}
