import type { IntentName } from "@charcuterie/tokens"

/**
 * A threshold is "from this percentage upward, use this intent".
 * Order does not matter — the highest matching entry wins — because
 * a caller sorting a config array by hand is a bug waiting for the
 * day someone appends to it.
 */
export type ProgressThreshold = {
  from: number
  intent: IntentName
}

/**
 * Clamped, rounded, and NaN-proof, in a file a Node test can reach
 * without a browser.
 *
 * All three cases are real. rip-deck's `fillPercent` comes from a
 * ripper's stdout, and a progress value that arrives as `-1`,
 * `101`, or `NaN` from a log parse currently renders as a bar that
 * overflows its track or vanishes. `max: 0` is the one that looks
 * hypothetical and is not: it is "0 of 0 files done", which every
 * empty queue produces on its first render.
 */
export const toProgressPercent = (
  value: number,
  max: number,
) => {
  if (!Number.isFinite(value) || !Number.isFinite(max)) {
    return 0
  }

  if (max <= 0) {
    return 0
  }

  return Math.min(
    100,
    Math.max(0, Math.round((value / max) * 100)),
  )
}

/**
 * The same clamp in the value's own units, for `aria-valuenow`.
 *
 * Reporting the raw prop there would hand assistive technology a
 * `valuenow` outside its own `valuemin`/`valuemax` — which some
 * screen readers render as a nonsense percentage and others drop
 * entirely — while the bar on screen showed the clamped one. The
 * two must not disagree.
 */
export const toProgressValue = (
  value: number,
  max: number,
) => {
  if (!Number.isFinite(value) || !Number.isFinite(max)) {
    return 0
  }

  return Math.min(Math.max(0, max), Math.max(0, value))
}

/**
 * The threshold colour, or the component's own intent when no
 * threshold applies.
 *
 * This is the piece rip-deck hardcodes as `FILL_CLASS` keyed by a
 * rip state, and mux-magic does not have at all. Generalising it to
 * "percentage → intent" covers both the "green when done" case and
 * the "amber past 80% of the disk" case with one mechanism.
 */
export const getProgressIntent = (
  percent: number,
  intent: IntentName,
  thresholds?: readonly ProgressThreshold[],
): IntentName => {
  if (!thresholds || thresholds.length === 0) {
    return intent
  }

  const matched = thresholds
    .filter((threshold) => percent >= threshold.from)
    .sort((first, second) => second.from - first.from)
    .at(0)

  return matched?.intent ?? intent
}
