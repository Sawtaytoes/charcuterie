/**
 * The paint `Slider` and `RangeSlider` share.
 *
 * The two are separate components because their **focus models** are
 * different — one `role="slider"` on the track against two of them in
 * a `role="group"`, one tab stop against two
 * ([decision](../../../docs/decisions/2026-09-01-a-two-thumb-range-is-its-own-component-and-shares-the-bar.md)).
 * What is identical is the bar: a sunken rounded track, an intent
 * fill inside it, and a round thumb pulled back by half its own
 * width.
 *
 * Held here rather than copied for the reason `tileStyles.ts` exists:
 * "the two look the same" spelled as two class strings is a promise
 * that survives exactly one edit. `RangeSlider.test.tsx` compares the
 * two thumbs as **computed** styles, so a class-name refactor cannot
 * quietly break it either.
 *
 * No focus ring here. It is the one part of the bar the two do not
 * share — `Slider` rings the track, because the track is the widget;
 * `RangeSlider` rings each thumb, because each thumb is.
 */

export type SliderSize = "lg" | "md" | "sm"

/** The bar itself. A `sm` bar is 2px; that is not a hit target. */
export const SLIDER_TRACK_SIZE_CLASS: Record<
  SliderSize,
  string
> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
}

export const SLIDER_THUMB_SIZE_CLASS: Record<
  SliderSize,
  string
> = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
}

/** Half of each `SLIDER_THUMB_SIZE_CLASS`, as the inline-start pull-back. */
export const SLIDER_THUMB_OFFSET: Record<
  SliderSize,
  string
> = {
  sm: "-0.375rem",
  md: "-0.5rem",
  lg: "-0.625rem",
}

/**
 * The row the bar sits in, which is taller than the bar: a 2px track
 * is not a pointer target, and a finger is 44px. The height comes
 * from the shared control-size system, so `[data-density]` decides
 * it — never `MIN_TOUCH_TARGET_CLASS`, which would make this control
 * taller than the ones beside it at desktop density
 * ([decision](../../../docs/decisions/2026-08-05-controls-share-one-height-no-per-component-touch-floor.md)).
 */
export const SLIDER_ROW_CLASS =
  "relative flex w-full touch-none cursor-pointer items-center rounded-full min-h-(--control-height-sm)"

export const SLIDER_TRACK_CLASS =
  "w-full overflow-hidden rounded-full bg-surface-sunken"

export const SLIDER_THUMB_CLASS =
  "absolute rounded-full border-2 border-surface-raised shadow-sm"
