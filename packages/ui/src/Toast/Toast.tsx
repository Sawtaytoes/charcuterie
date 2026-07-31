import { useStatus } from "@charcuterie/logic"
import type { IntentName } from "@charcuterie/tokens"
import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import { IconButton } from "../IconButton/IconButton.tsx"
import {
  INTENT_APPEARANCE_CLASS,
  INTENT_CONTENT_CLASS,
} from "../intentStyles.ts"
import { toClassName } from "../toClassName.ts"
import type { ToastStatus } from "./toastLifecycle.ts"
import { toastTransitions } from "./toastLifecycle.ts"

export type ToastProps = {
  /** Detail under the title. Optional — many toasts are one line. */
  children?: ReactNode
  className?: string
  /**
   * Milliseconds at `visible` before it starts leaving. `0` pins it
   * open, which is what a toast carrying an action has to do — WCAG
   * 2.2.1 gives a user the right to finish reading.
   */
  duration?: number
  /** How long `exiting` lasts, matched to the transition below. */
  exitDuration?: number
  intent?: IntentName
  /** Called once, when the machine reaches its terminal state. */
  onRemove: () => void
  /**
   * A string, not a `ReactNode`. It is what the region announces and
   * what names this toast's own dismiss button — a stack of three
   * toasts all offering "Dismiss" is three matches for one query,
   * which `expectAgentDrivable` treats as a failure.
   */
  title: string
}

const ENTER_CLASS: Record<ToastStatus, string> = {
  entering: "translate-y-2 opacity-0",
  exiting: "translate-y-1 opacity-0",
  removed: "opacity-0",
  visible: "translate-y-0 opacity-100",
}

/**
 * One toast, and its whole job is the four-state machine the plan
 * specified and M2 left unbuilt.
 *
 * ### Why a `Status`, when a boolean and a timeout would do
 *
 * Because a boolean cannot express *why* the node is still mounted.
 * A toast that is leaving is still painted, still occupies its slot,
 * and must not be announced again — and `isVisible === false` says
 * none of that. The states are what a reader needs to know the
 * difference between "arriving", "leaving", and "gone but not yet
 * unmounted", and `createStatus` makes the illegal ones throw:
 * `visible → removed` skips the exit and is rejected, and `removed`
 * is terminal so a late timer cannot remove the same toast twice.
 *
 * That last one is not hypothetical. Hover-to-pause plus a dismiss
 * button means two independent timers can be in flight, and the
 * hand-rolled version of this component reconciles them with a
 * `clearTimeout` and a ref. Here the second one throws.
 *
 * ### It does not announce itself
 *
 * No `role="status"` and no `aria-live` on this element — the
 * `ToastRegion` around it owns that, and a live region inside a live
 * region is a message announced twice. See that component for the
 * reason there is only ever one, and it is polite.
 */
export const Toast = ({
  children,
  className,
  duration = 5000,
  exitDuration = 200,
  intent = "neutral",
  onRemove,
  title,
}: ToastProps): ReactNode => {
  const { is, status, transitionTo } =
    useStatus<ToastStatus>({
      initialState: "entering",
      transitions: toastTransitions,
    })

  const onRemoveRef = useRef(onRemove)

  onRemoveRef.current = onRemove

  useEffect(() => {
    if (!is("entering")) {
      return
    }

    // A frame, not zero. The element has to be painted in its
    // `entering` position before the class changes, or the browser
    // coalesces both into one style recalculation and there is no
    // transition to see — the single most common reason a CSS
    // enter-animation "does nothing".
    const frame = globalThis.requestAnimationFrame(() => {
      transitionTo("visible")
    })

    return () => {
      globalThis.cancelAnimationFrame(frame)
    }
  }, [is, transitionTo])

  useEffect(() => {
    if (status !== "visible" || duration === 0) {
      return
    }

    const timer = globalThis.setTimeout(() => {
      transitionTo("exiting")
    }, duration)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [duration, status, transitionTo])

  useEffect(() => {
    if (status !== "exiting") {
      return
    }

    const timer = globalThis.setTimeout(() => {
      transitionTo("removed")
    }, exitDuration)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [exitDuration, status, transitionTo])

  useEffect(() => {
    if (status === "removed") {
      onRemoveRef.current()
    }
  }, [status])

  return (
    <li
      className={toClassName(
        "pointer-events-auto flex items-start gap-3 rounded-md border p-3 shadow-medium transition-[opacity,transform] duration-(--duration-normal) ease-standard",
        INTENT_APPEARANCE_CLASS[intent].soft,
        ENTER_CLASS[status],
        className,
      )}
      // Pausing on hover is WCAG 2.2.1's "pause" for a moving
      // deadline, and it is the reason `exiting → visible` is a
      // legal transition rather than an oddity in the table.
      onMouseEnter={() => {
        if (status === "exiting") {
          transitionTo("visible")
        }
      }}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={toClassName(
            "font-medium text-sm",
            INTENT_CONTENT_CLASS[intent],
          )}
        >
          {title}
        </span>

        {children === undefined ? null : (
          <span className="text-content-secondary text-xs">
            {children}
          </span>
        )}
      </div>

      <IconButton
        appearance="ghost"
        className="ms-auto shrink-0"
        // The name has to be distinct per toast, or a stack of three
        // gives `getByRole("button", { name: "Dismiss" })` three
        // matches and `expectAgentDrivable` fails the story — which
        // is the point of that helper: an agent picking one of three
        // at random is worse than finding none.
        label={`Dismiss ${title}`}
        onClick={() => {
          if (
            status !== "exiting" &&
            status !== "removed"
          ) {
            transitionTo("exiting")
          }
        }}
        size="sm"
      >
        <svg
          aria-hidden="true"
          className="size-[1.15em] shrink-0"
          fill="none"
          focusable={false}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </IconButton>
    </li>
  )
}
