import type { RefObject } from "react"
import { useLayoutEffect, useRef, useState } from "react"

/**
 * Keeps an element in the page until its exit animation has run, so
 * a closing overlay leaves the screen with motion instead of
 * vanishing in one frame.
 *
 * ### Why the length comes from the computed style
 *
 * The exit's length is **read from the element**, never passed in.
 * The duration is a token (`--duration-fast`), and three different
 * renderings set it to three different things: the designed motion,
 * `prefers-reduced-motion` (where `styles.css` sets `animation: none`),
 * and the automated suites' `FREEZE_MOTION_CSS` (`0s`). A number
 * written here would hold a closed panel in the page for that long
 * under all three, which is a dead overlay the user cannot see but a
 * test still finds. Reading `getComputedStyle` in a layout effect
 * means a motionless exit finishes **in the same commit** — before
 * paint, and inside the test's `act()` — so nothing that asserts "it
 * closed" has to learn to wait.
 *
 * A DOM with no CSS engine (jsdom, happy-dom) reports an empty
 * `animation-name`, which reads as no animation and unmounts at once
 * for the same reason.
 *
 * ### What "exiting" must mean to the caller
 *
 * While `isExiting` is true the element is still in the page but is
 * **closed** in every sense except paint. The caller makes it `inert`
 * and `aria-hidden`, and the exit class sets `pointer-events: none`,
 * so a role query, the keyboard, and the pointer all behave as though
 * it has gone. Only the eye sees it leave.
 *
 * ### Re-opening mid-exit
 *
 * Re-opening during the exit simply swaps the exit class back for the
 * enter class. Changing `animation-name` restarts the animation, and
 * the listener for the abandoned exit is removed by the effect's
 * cleanup, so it can never unmount the re-opened element.
 */
export type UsePresenceResult<
  Element extends HTMLElement = HTMLElement,
> = {
  /** Mounted, but closed: make it `inert` and give it the exit class. */
  isExiting: boolean
  /** Whether to render the element at all. */
  isMounted: boolean
  /** Attach to the element whose exit animation ends the presence. */
  presenceRef: RefObject<Element | null>
}

/**
 * If `animationend` never arrives — the tab is hidden, or a consumer
 * class replaced the animation with one that never ends — the
 * element is removed anyway. This is a safety margin past the
 * element's own computed length, not a design duration.
 */
const EXIT_SAFETY_MARGIN_MS = 50

const toMilliseconds = (value: string): number => {
  const trimmed = value.trim()

  const amount = Number.parseFloat(trimmed)

  if (Number.isNaN(amount)) {
    return 0
  }

  return trimmed.endsWith("ms") ? amount : amount * 1000
}

/**
 * The longest `delay + duration` across every animation on the
 * element, or `0` when it has none. CSS repeats the shorter of the two
 * lists to match the longer, so the delays are indexed the same way.
 */
export const getAnimationLengthMs = (
  element: Element,
): number => {
  const style = globalThis.getComputedStyle(element)

  const names = style.animationName.split(",")

  const durations = style.animationDuration.split(",")

  const delays = style.animationDelay.split(",")

  return names.reduce((longest, name, index) => {
    if (name.trim() === "none" || name.trim() === "") {
      return longest
    }

    const duration = toMilliseconds(
      durations[index % durations.length] ?? "0s",
    )

    const delay = toMilliseconds(
      delays[index % delays.length] ?? "0s",
    )

    return duration === 0
      ? longest
      : Math.max(longest, duration + Math.max(delay, 0))
  }, 0)
}

export const usePresence = <
  Element extends HTMLElement = HTMLElement,
>(
  isVisible: boolean,
): UsePresenceResult<Element> => {
  // Whether the element is still on screen. It lags `isVisible` only
  // on the way out, by exactly the length of the exit animation.
  const [isShown, setIsShown] = useState(isVisible)

  const presenceRef = useRef<Element | null>(null)

  const isExiting = !isVisible && isShown

  useLayoutEffect(() => {
    if (isVisible) {
      setIsShown(true)
    }
  }, [isVisible])

  useLayoutEffect(() => {
    if (!isExiting) {
      return
    }

    const element = presenceRef.current

    const lengthMs =
      element === null ? 0 : getAnimationLengthMs(element)

    if (element === null || lengthMs === 0) {
      setIsShown(false)

      return
    }

    const finish = () => {
      setIsShown(false)
    }

    const onAnimationEnd = (event: AnimationEvent) => {
      // A child's own animation (a spinner inside a dialog) bubbles
      // here too, and must not end the parent's exit.
      if (event.target === element) {
        finish()
      }
    }

    element.addEventListener("animationend", onAnimationEnd)

    const timer = globalThis.setTimeout(
      finish,
      lengthMs + EXIT_SAFETY_MARGIN_MS,
    )

    return () => {
      element.removeEventListener(
        "animationend",
        onAnimationEnd,
      )

      globalThis.clearTimeout(timer)
    }
  }, [isExiting])

  return {
    isExiting,
    isMounted: isVisible || isShown,
    presenceRef,
  }
}

/**
 * The enter and exit classes for a panel that scales from its anchor:
 * a modal box, a popover, a menu, a listbox. Defined in `styles.css`
 * on the `--duration-*` and `--easing-*` tokens, and switched off
 * under `prefers-reduced-motion`.
 */
export const toOverlayMotionClass = (
  isExiting: boolean,
): string =>
  isExiting
    ? "charcuterie-overlay-exit"
    : "charcuterie-overlay-enter"

/** The same, for things that only fade: the scrim and a tooltip. */
export const toFadeMotionClass = (
  isExiting: boolean,
): string =>
  isExiting
    ? "charcuterie-fade-exit"
    : "charcuterie-fade-enter"

/**
 * Where an anchored panel grows from: the edge that faces its
 * trigger. A menu below its button scales down out of the button, and
 * one flipped above it scales up out of it.
 *
 * Only the side is used, centred on the cross axis. The alignment half
 * of a placement (`-start`, `-end`) is logical and flips under RTL,
 * and a 4% scale is too small for the cross-axis origin to be seen.
 */
export const toTransformOrigin = (
  placement: string,
): string => {
  const [side] = placement.split("-")

  return (
    {
      bottom: "center top",
      left: "right center",
      right: "left center",
      top: "center bottom",
    }[side ?? "bottom"] ?? "center top"
  )
}
