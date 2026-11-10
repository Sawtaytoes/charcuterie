import type { AnimationEvent } from "react"
import { useCallback, useState } from "react"

const POP_ANIMATIONS = new Set([
  "charcuterie-value-pop",
  "charcuterie-value-pop-again",
])

export type ValueChangeMotionProps = {
  /** The pop class while the pop runs; `undefined` otherwise. */
  className: string | undefined
  onAnimationEnd: (
    event: AnimationEvent<HTMLElement>,
  ) => void
}

/**
 * Props that make an element pop briefly each time `value` changes: a
 * balance after a purchase, a count after an add, a status after a
 * save. They show the user which part of the screen their action
 * changed.
 *
 * ```tsx
 * const changeMotion = useValueChangeMotion(balance.spendable)
 *
 * <div
 *   {...changeMotion}
 *   className={toClassName("inline-block text-3xl tabular-nums", changeMotion.className)}
 * >
 *   {formatPoints(balance.spendable)}
 * </div>
 * ```
 *
 * ### What counts as a change
 *
 * The first value does not pop, and neither does the first real value
 * after `null` or `undefined` — that is data arriving, not an action
 * changing it. Values are compared with `Object.is`, so pass the
 * number or string that is shown, not a fresh object.
 *
 * ### Why the class comes off, and why there are two
 *
 * The class is removed when its animation ends. An element that goes
 * from `display: none` back to shown restarts its CSS animation, so a
 * class left on would pop again each time a hidden tab is shown, for
 * a change made long ago.
 *
 * A CSS animation restarts only when its name changes. A change that
 * arrives while the last pop is still running switches to a second
 * class, with identical keyframes under another name, so two
 * purchases in a row pop twice.
 *
 * ### On the element
 *
 * Spread the props onto the element that shows the value. If it has
 * its own `onAnimationEnd`, call both. The pop animates the `scale`
 * property, which does nothing on a plain inline element: give the
 * element `inline-block` or `block` layout. Under reduced motion the
 * class has no animation and the new value is simply shown.
 */
export const useValueChangeMotion = (
  value: unknown,
): ValueChangeMotionProps => {
  const [state, setState] = useState({
    changeCount: 0,
    settledCount: 0,
    value,
  })

  if (!Object.is(state.value, value)) {
    const isArrival =
      state.value === null || state.value === undefined

    setState({
      changeCount: isArrival
        ? state.changeCount
        : state.changeCount + 1,
      settledCount: isArrival
        ? state.changeCount
        : state.settledCount,
      value,
    })
  }

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (
        event.target === event.currentTarget &&
        POP_ANIMATIONS.has(event.animationName)
      ) {
        setState((previous) => ({
          ...previous,
          settledCount: previous.changeCount,
        }))
      }
    },
    [],
  )

  const isPopping = state.changeCount !== state.settledCount

  return {
    className: isPopping
      ? state.changeCount % 2 === 1
        ? "charcuterie-value-changed"
        : "charcuterie-value-changed-again"
      : undefined,
    onAnimationEnd,
  }
}
