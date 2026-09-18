import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import { useOverlayStack } from "../Overlay/OverlayStack.tsx"
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
 * ### It is the top of the layer scale, and it moves to stay there
 *
 * ⚠️ The container was `z-50` — a hand-picked number, in the library
 * whose whole point is that nobody picks one. It is
 * `--layer-toast` now, the top of the scale, above `--layer-tooltip`.
 * The owner's rule: *"I think toast should always exist on top of
 * everything."*
 *
 * The open panels cascade — a modal over a modal paints at
 * `--layer-modal + n` — so the depth is added here too, and the
 * toast clears the whole stack rather than only its first floor.
 * Both numbers come off `useOverlayStack`, so the ordering is
 * arithmetic rather than portal-append order.
 *
 * ### Painting on top is only half of "on top"
 *
 * ⚠️ A press on a toast while a `Modal` is open is an **outside**
 * press as far as floating-ui is concerned, and `useDismiss` would
 * close the modal on the way to taking an action back. That is why
 * the container carries `data-charcuterie-toast-region`:
 * `OverlayPanel`'s `outsidePress` reads it and lets the press
 * through. Nothing else in the fleet carries that attribute.
 *
 * ⚠️ Do **not** move this region inside the panel's portal to solve
 * that. Two reasons, both measured. `FloatingFocusManager`'s `modal`
 * already leaves it alone — `markOthers` concatenates
 * `body.querySelectorAll('[aria-live],[role="status"],output')` onto
 * its keep-list, and this region is a `role="status"`, so it is
 * never marked `aria-hidden` where it stands. And the panel's
 * container sets a z-index, so a region nested inside it would be
 * trapped in that stacking context and lose to the *next* modal
 * however high `--layer-toast` climbs.
 *
 * ### `pointer-events-none` on the container, `auto` on each toast
 *
 * A fixed overlay across the bottom of the viewport swallows every
 * click in that band, including on the app behind it, and it does so
 * invisibly. The container passes clicks through and each toast
 * takes them back.
 *
 * The list keeps `pointer-events: none` and still scrolls: a wheel
 * event over a toast chains to the nearest scrollable **ancestor**,
 * which is the list, and hit-testing never has to reach it.
 *
 * ### Many at once, and the newest is the one you can see
 *
 * The column grows upward from the bottom of the viewport, so
 * without a bound the oldest toasts climb off the top of the page —
 * clipped by the viewport, and unreachable, because a fixed element
 * is not something the page can scroll to. The list is capped at
 * `min(60dvh, 32rem)` and scrolls `overscroll-contain`, so the page
 * behind never moves because a notification arrived. The owner's
 * rule: *"if you have multiple toasts, it should accomodate them
 * somehow."*
 *
 * ⚠️ Bottom-pinned with `margin-block-start: auto` on the first
 * toast, **not** `justify-content: flex-end`. Measured in chromium:
 * with `justify-end` an overflowing list reports
 * `scrollHeight === clientHeight` and the toasts above the fold
 * cannot be scrolled to at all — content overflowing a flex
 * container's *start* edge is not reachable overflow. An auto margin
 * resolves to `0` the moment the free space runs out, so the same
 * rule pins a short list and scrolls a long one.
 *
 * The scroll is taken to the bottom whenever the count changes,
 * because the newest toast is the one with the action on it and it
 * is the one at the far end.
 */
export const ToastRegion = ({
  className,
  label = "Notifications",
  onDismiss,
  toasts,
}: ToastRegionProps): ReactNode => {
  const { depth } = useOverlayStack()

  const listRef = useRef<HTMLUListElement>(null)

  const _toastCount = toasts.length

  useEffect(() => {
    const list = listRef.current

    if (!list) {
      return
    }

    list.scrollTop = list.scrollHeight
  }, [])

  return (
    <div
      aria-label={label}
      data-charcuterie-toast-region=""
      // `role="status"` is `aria-live="polite"` plus
      // `aria-atomic="true"` by default — and atomic is wrong here,
      // because it re-reads the entire stack every time one arrives.
      // Spelling `aria-atomic="false"` next to it is what makes a
      // second toast announce only itself.
      aria-atomic="false"
      className={toClassName(
        "pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4",
        className,
      )}
      role="status"
      style={{
        zIndex: `calc(var(--layer-toast) + ${depth})`,
      }}
    >
      <ul
        ref={listRef}
        className="charcuterie-scrollbar pointer-events-none flex max-h-[min(60dvh,32rem)] w-full max-w-sm list-none flex-col gap-2 overflow-y-auto overscroll-contain p-0 [&>li]:shrink-0 [&>li:first-child]:mt-auto"
      >
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
}
