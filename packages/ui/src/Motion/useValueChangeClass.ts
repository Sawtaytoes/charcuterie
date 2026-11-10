import { useState } from "react"

/**
 * A class that makes an element pop briefly each time `value` changes:
 * a balance after a purchase, a count after an add, a status after a
 * save. It shows the user which part of the screen their action
 * changed.
 *
 * ```tsx
 * const changedClass = useValueChangeClass(balance.spendable)
 *
 * <div className={toClassName("text-3xl tabular-nums", changedClass)}>
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
 * ### Why two classes
 *
 * A CSS animation restarts only when its name changes. Each change
 * alternates between two classes with identical keyframes under two
 * names, so two purchases in a row pop twice.
 *
 * The pop animates the `scale` property, which does nothing on a plain
 * inline element: give the element `inline-block` or `block` layout.
 * Under reduced motion the class is switched off and the new value is
 * simply shown.
 */
export const useValueChangeClass = (
  value: unknown,
): string => {
  const [state, setState] = useState({
    changeCount: 0,
    value,
  })

  if (!Object.is(state.value, value)) {
    const isArrival =
      state.value === null || state.value === undefined

    setState({
      changeCount: isArrival
        ? state.changeCount
        : state.changeCount + 1,
      value,
    })
  }

  if (state.changeCount === 0) {
    return ""
  }

  return state.changeCount % 2 === 1
    ? "charcuterie-value-changed"
    : "charcuterie-value-changed-again"
}
