/**
 * The arithmetic behind `RangeSlider`: everything the second thumb
 * adds to `Slider`'s, and nothing `Slider` already answers.
 *
 * The single-value functions are **called**, never re-derived —
 * `snapToStep` and `clampToRange` come from `../Slider/sliderValue.ts`
 * — so a range slider snaps on exactly the grid a plain slider snaps
 * on. Anchoring on `min` rather than on zero, the re-clamp after a
 * snap, and the float-step rounding are all already right there, and
 * a second copy of them is a second set of edge cases to keep in
 * agreement.
 *
 * Every function here is total. A caller may hand over a reversed
 * range, a `NaN`, or a start past its end, and the answer is still a
 * pair of numbers inside `[min, max]` with `start <= end`. A range
 * that renders `inline-size: NaN%` paints nothing and the DOM says
 * nothing about it.
 */

import {
  clampToRange,
  snapToStep,
} from "../Slider/sliderValue.ts"

/** Which end of the range a movement is about. */
export type RangeSliderThumb = "end" | "start"

export type RangeSliderValue = {
  end: number
  start: number
}

export type RangeSliderBounds = {
  max: number
  min: number
  step: number
}

/**
 * Both ends snapped to the step grid, clamped into the range, and put
 * in order.
 *
 * The ordering is not a nicety. `value` **seeds** rather than
 * controls, exactly as `Slider`'s does, so the pair arrives from an
 * app's state and an app can hold `{ end: 20, start: 80 }` for a
 * frame — a text field committing a typed start before the end
 * catches up is the ordinary way to reach it. A backwards pair paints
 * a fill of negative width, which is invisible rather than wrong-
 * looking, so it is corrected here instead.
 */
export const snapRange = (
  range: RangeSliderValue,
  { max, min, step }: RangeSliderBounds,
): RangeSliderValue => {
  const first = snapToStep(range.start, min, max, step)

  const second = snapToStep(range.end, min, max, step)

  return {
    end: Math.max(first, second),
    start: Math.min(first, second),
  }
}

/**
 * The range with one thumb moved to `next`, clamped at the other one.
 *
 * **The thumbs clamp; they do not swap.** A thumb pushed past its
 * partner stops on it, keeps its own identity, and the range collapses
 * to zero width rather than turning inside out. Swapping is the other
 * defensible answer and is the wrong one for the first consumer: the
 * thumbs are a clip's start and its end, a QueuePilot user drags them
 * against a `TimecodeInput` showing which is which, and a drag that
 * silently renamed the handle under the pointer would move a number
 * the user is reading somewhere else. Keyboard makes it plainer still
 * — swapping means one ArrowRight moves the *other* thumb, and the
 * focused element is no longer the value that changed.
 *
 * The snap happens on the **global** grid before the clamp, never on
 * a grid anchored at the other thumb: the partner is already on the
 * grid, so clamping to it lands on the grid too, while snapping
 * against a moving anchor would put the two thumbs on different
 * ladders.
 */
export const moveThumb = ({
  bounds,
  next,
  range,
  thumb,
}: {
  bounds: RangeSliderBounds
  next: number
  range: RangeSliderValue
  thumb: RangeSliderThumb
}): RangeSliderValue => {
  const ordered = snapRange(range, bounds)

  const snapped = snapToStep(
    next,
    bounds.min,
    bounds.max,
    bounds.step,
  )

  if (thumb === "start") {
    return {
      end: ordered.end,
      start: clampToRange(
        snapped,
        Math.min(bounds.min, bounds.max),
        ordered.end,
      ),
    }
  }

  return {
    end: clampToRange(
      snapped,
      ordered.start,
      Math.max(bounds.min, bounds.max),
    ),
    start: ordered.start,
  }
}

/**
 * The thumb a press at `at` should pick up.
 *
 * The nearer one, and the tie is the interesting half: two thumbs
 * sitting on the same value are the state the clamping rule makes
 * reachable, and a rule that always picked the same one would leave a
 * collapsed range stuck against whichever end it collapsed on. So a
 * tie is broken by **which side of them the press landed on** —
 * below picks the start, on or above picks the end — which is what
 * lets a collapsed pair be pulled open in either direction.
 */
export const getNearerThumb = ({
  at,
  range,
}: {
  at: number
  range: RangeSliderValue
}): RangeSliderThumb => {
  const toStart = Math.abs(at - range.start)

  const toEnd = Math.abs(at - range.end)

  if (toStart < toEnd) return "start"

  if (toEnd < toStart) return "end"

  return at < range.start ? "start" : "end"
}

/**
 * What one thumb may report as its own `aria-valuemin` /
 * `aria-valuemax`.
 *
 * The other thumb is the bound, which is how the clamping rule
 * reaches assistive technology at all: a screen reader reading
 * "12 of 0 to 30" on the start thumb is being told, in the only
 * vocabulary a slider has, that 30 is where this handle stops. The
 * APG's multi-thumb pattern asks for exactly this.
 */
export const getThumbBounds = ({
  bounds,
  range,
  thumb,
}: {
  bounds: RangeSliderBounds
  range: RangeSliderValue
  thumb: RangeSliderThumb
}): { max: number; min: number } => {
  const ordered = snapRange(range, bounds)

  return thumb === "start"
    ? {
        max: ordered.end,
        min: Math.min(bounds.min, bounds.max),
      }
    : {
        max: Math.max(bounds.min, bounds.max),
        min: ordered.start,
      }
}
