import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"

import { toClassName } from "../toClassName.ts"
import { Toast } from "./Toast.tsx"

export type ToastRecord = {
  description?: ReactNode
  /** `0` pins this one open. See `Toast`'s `duration`. */
  duration?: number
  intent?: IntentName
  key: string
  title: string
}

export type ToastRegionProps = {
  className?: string
  /**
   * The region's accessible name. `role="status"` takes **none from
   * its content** — the trap `Spinner` walked into in M3 and
   * `Popover` in M4.
   */
  label?: string
  onDismiss: (key: string) => void
  toasts: ToastRecord[]
}

/**
 * The live region, and the list is the caller's.
 *
 * ### One region, and it is polite
 *
 * Not two. The usual arrangement — a polite region and an assertive
 * one, so a danger toast interrupts — was rejected because the
 * interrupting case does not belong in a toast at all. A message
 * that must be heard *now* is one the user has to be able to go back
 * and read, and a toast is gone in five seconds; if it matters that
 * much it is an `Alert` on the page, which this library already
 * ships and which stays put.
 *
 * That is the same line `Field` draws for its error text, and it is
 * worth keeping the two consistent: **this library announces once,
 * in the place the user can act on it.**
 *
 * ### The stack does not own the toasts
 *
 * `toasts` comes in and `onDismiss` goes out — there is no
 * `toast()` function, no imperative queue, and no context provider.
 * An app already has a store (mux-magic has Jotai, rip-deck has its
 * own), and a component library that ships a second one is asking
 * every consumer to keep two lists of the same notifications in
 * sync. The lifecycle *inside* one toast is state a store cannot
 * see, which is why `Toast` owns that and nothing more.
 *
 * ### `pointer-events-none` on the container, `auto` on each toast
 *
 * A fixed overlay across the bottom of the viewport swallows every
 * click in that band, including on the app behind it, and it does so
 * invisibly. The container passes clicks through and each toast
 * takes them back.
 */
export const ToastRegion = ({
  className,
  label = "Notifications",
  onDismiss,
  toasts,
}: ToastRegionProps): ReactNode => (
  <div
    aria-label={label}
    // `role="status"` is `aria-live="polite"` plus
    // `aria-atomic="true"` by default — and atomic is wrong here,
    // because it re-reads the entire stack every time one arrives.
    // Spelling `aria-atomic="false"` next to it is what makes a
    // second toast announce only itself.
    aria-atomic="false"
    className={toClassName(
      "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4",
      className,
    )}
    role="status"
  >
    <ul className="pointer-events-none flex w-full max-w-sm list-none flex-col gap-2 p-0">
      {toasts.map((toast) => (
        <Toast
          duration={toast.duration}
          intent={toast.intent}
          key={toast.key}
          onRemove={() => {
            onDismiss(toast.key)
          }}
          title={toast.title}
        >
          {toast.description}
        </Toast>
      ))}
    </ul>
  </div>
)
