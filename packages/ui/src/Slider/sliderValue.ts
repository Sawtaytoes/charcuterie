/**
 * The arithmetic behind `Slider`, kept out of the component so it can be
 * tested in the node project rather than driven through a pointer.
 *
 * Every function here is total: a caller may pass a `NaN`, a reversed
 * range or a zero step, and the answer is still a number inside the
 * range. A slider that renders a thumb at `NaN%` is invisible, and the
 * DOM says nothing about it.
 */

/** `value` forced into `[min, max]`, whichever way round they arrive. */
export const clampToRange = (
  value: number,
  min: number,
  max: number,
): number => {
  const low = Math.min(min, max)

  const high = Math.max(min, max)

  // NaN only. An infinity is an ORDERED value and clamps like any
  // other — `Math.min`/`Math.max` already put it at the right end, and
  // sending +Infinity to the floor would be the wrong end of the range.
  if (Number.isNaN(value)) return low

  return Math.min(high, Math.max(low, value))
}

/**
 * `value` snapped to the nearest `min + n * step`, then clamped.
 *
 * Anchored on `min` rather than on zero, which is the difference
 * between a 0–100 slider (where both agree) and a 7–19 one stepping by
 * 4: anchored on zero its reachable values are 8, 12, 16 and neither
 * end of its own range is one of them.
 *
 * A non-positive or non-finite `step` means "continuous" and snaps
 * nothing — it must not divide by zero and hand back `NaN`.
 */
export const snapToStep = (
  value: number,
  min: number,
  max: number,
  step: number,
): number => {
  const clamped = clampToRange(value, min, max)

  if (!Number.isFinite(step) || step <= 0) return clamped

  const low = Math.min(min, max)

  const snapped =
    low + Math.round((clamped - low) / step) * step

  // Re-clamp: the last step can land past `max` when the range is not
  // a whole number of steps (0–10 by 3 snaps 10 to 9, but 0–10 by 4
  // would snap 10 to 12 without this).
  const bounded = clampToRange(snapped, min, max)

  // Float steps accumulate: 0.1 * 3 is 0.30000000000000004, and that
  // reaches `aria-valuenow` and the visible value both. Round to the
  // decimals the step itself declares.
  return roundToStepPrecision(bounded, step)
}

/**
 * `value` rounded to as many decimals as `step` has.
 *
 * `Number.EPSILON` scaling is deliberately not used — the input here is
 * always already a multiple of `step` give or take float drift, so the
 * decimal count of `step` is exactly the precision that can be real.
 */
export const roundToStepPrecision = (
  value: number,
  step: number,
): number => {
  if (!Number.isFinite(step) || step <= 0) return value

  const text = String(step)

  // An exponential step ("1e-7") has no visible decimal point, so
  // `split(".")` would report zero decimals and round it to an integer.
  if (text.includes("e") || text.includes("E")) return value

  const decimals = text.split(".")[1]?.length ?? 0

  if (decimals === 0) return Math.round(value)

  const scale = 10 ** decimals

  return Math.round(value * scale) / scale
}

/**
 * Where the thumb sits, 0–100, for `inline-size` / `inset-inline-start`.
 *
 * A zero-width range is 0% rather than `NaN`: `min === max` is a
 * degenerate but legal slider (a single-valued one), and it should
 * paint at the start instead of disappearing.
 */
export const toPercent = (
  value: number,
  min: number,
  max: number,
): number => {
  const low = Math.min(min, max)

  const high = Math.max(min, max)

  const span = high - low

  if (span <= 0) return 0

  return (
    ((clampToRange(value, low, high) - low) / span) * 100
  )
}

/**
 * The value a pointer at `fraction` (0–1 along the track) is asking for.
 *
 * `isRtl` inverts it. The caller measures with `getBoundingClientRect()`,
 * which is physical and knows nothing about writing direction, so a
 * right-to-left slider would otherwise run backwards.
 */
export const fromFraction = (
  fraction: number,
  min: number,
  max: number,
  step: number,
  isRtl = false,
): number => {
  const safe = Number.isFinite(fraction) ? fraction : 0

  const bounded = Math.min(1, Math.max(0, safe))

  const along = isRtl ? 1 - bounded : bounded

  const low = Math.min(min, max)

  const high = Math.max(min, max)

  return snapToStep(
    low + along * (high - low),
    min,
    max,
    step,
  )
}
