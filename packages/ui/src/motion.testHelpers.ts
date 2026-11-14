/**
 * A motion length no test outlives: an hour.
 *
 * The motion tests assert what is true **while** something moves — an
 * item still entering, a row still leaving, a slide still in flight —
 * right after a `userEvent` call. Each of those calls is a round trip
 * to the browser driver, and on a shared CI runner one round trip has
 * no upper bound. A 600 ms or 1 500 ms "slow" motion only made the
 * window wider. `useListMotion > an item that moves while it is still
 * entering slides from where it is shown` lost it in the narrow window
 * on 2026-11-14 (run 43611154547): two clicks took longer than the
 * 600 ms enter, and the item had finished entering before the test
 * looked.
 *
 * Held this long, a motion is still running when the test reads it,
 * whatever the machine is doing. A test that needs the motion **over**
 * says so with `finishMotion`, rather than waiting for a clock.
 */
export const HELD_MOTION = "3600s"

/**
 * End every finite animation and transition on `element` and beneath
 * it, now.
 *
 * `Animation.finish()` jumps the animation to its end, and the browser
 * then dispatches the same `animationend` or `transitionend` it would
 * have dispatched at the natural end. The hooks under test listen for
 * exactly those, so this exercises their real path — it only removes
 * the wait. The events arrive on the next animation frame, so assert
 * on what they cause with `waitFor`.
 *
 * Infinite animations, such as a spinner's, are skipped, because
 * `finish()` throws on them and nothing waits for them to end.
 */
export const finishMotion = (element: Element): void => {
  for (const animation of element.getAnimations({
    subtree: true,
  })) {
    if (
      animation.effect?.getComputedTiming().endTime !==
      Number.POSITIVE_INFINITY
    ) {
      animation.finish()
    }
  }
}
