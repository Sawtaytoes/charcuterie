/**
 * Control sizing, read from the density axis rather than chosen per
 * component.
 *
 * The values are never in this file — `h-(--control-height-md)`
 * points at a variable that `[data-density]` rewrites, so the same
 * `<Button size="md">` is 2.25rem on a desktop, 1.875rem in a
 * compact bay list, and 3.25rem on the kiosk with no prop change
 * and no re-render. That is the entire argument for a density axis
 * over a `size="kiosk"` prop, and it only works because nothing
 * here hardcodes a length.
 *
 * `text-sm`/`text-md`/`text-lg` are ours too, not Tailwind's:
 * `theme.css` bridges `--text-*` onto `--font-size-*`, which the
 * density axis also scales. See
 * `packages/tokens/src/tailwindCollisions.test.ts`.
 */

import type { ControlSize } from "@charcuterie/tokens"

export const CONTROL_SIZE_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "h-(--control-height-sm) gap-(--control-gap-sm) px-(--control-padding-inline-sm) text-sm",
  md: "h-(--control-height-md) gap-(--control-gap-md) px-(--control-padding-inline-md) text-md",
  lg: "h-(--control-height-lg) gap-(--control-gap-lg) px-(--control-padding-inline-lg) text-lg",
}

/**
 * Square, and sized by the *height* token on both axes so an icon
 * button lines up with the text button beside it in a toolbar. No
 * inline padding at all — a glyph centres itself.
 */
export const ICON_CONTROL_SIZE_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "size-(--control-height-sm) px-0 text-sm",
  md: "size-(--control-height-md) px-0 text-md",
  lg: "size-(--control-height-lg) px-0 text-lg",
}

/**
 * The kiosk floor. `--control-min-touch-target` is 44px in every
 * density — a finger does not get smaller because the list is
 * dense — so this is opt-in per control rather than baked into the
 * size classes, which would make `compact` a lie.
 *
 * **Do NOT add this to a control that shares a form row** (`Button`,
 * `Select`, a `Listbox`/`Combobox` trigger, `SegmentedControl`, …). It
 * overrides the shared `CONTROL_SIZE_CLASS` height and makes that one
 * control taller than its neighbours at desktop density — touch sizing is
 * the density axis's job. Reserve this for a genuinely standalone tap
 * target. See
 * `docs/decisions/2026-08-05-controls-share-one-height-no-per-component-touch-floor.md`.
 */
export const MIN_TOUCH_TARGET_CLASS =
  "min-h-(--control-min-touch-target) min-w-(--control-min-touch-target)"

/**
 * Non-control sizing: badges, indicator dots, spinners. These are
 * type-relative on purpose — a badge beside `text-sm` prose that
 * stays 20px tall while the kiosk scales the prose to 1.19x reads
 * as a rendering bug.
 */
export const BADGE_SIZE_CLASS = {
  sm: "gap-1 px-2 py-0.5 text-xs",
  md: "gap-1.5 px-2.5 py-1 text-sm",
} as const

export type BadgeSize = keyof typeof BADGE_SIZE_CLASS

export const DOT_SIZE_CLASS = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
} as const

export const SPINNER_SIZE_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "size-3.5 border-2",
  md: "size-4 border-2",
  lg: "size-5 border-2",
}
