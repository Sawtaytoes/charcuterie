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

import type {
  ControlSize,
  IntentName,
} from "@charcuterie/tokens"

import type { IntentAppearance } from "./intentStyles.ts"
import {
  FOCUS_RING_CLASS,
  INTENT_APPEARANCE_CLASS,
  INTENT_HOVER_CLASS,
} from "./intentStyles.ts"
import { toClassName } from "./toClassName.ts"

export const CONTROL_SIZE_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "h-(--control-height-sm) gap-(--control-gap-sm) px-(--control-padding-inline-sm) text-sm",
  md: "h-(--control-height-md) gap-(--control-gap-md) px-(--control-padding-inline-md) text-md",
  lg: "h-(--control-height-lg) gap-(--control-gap-lg) px-(--control-padding-inline-lg) text-lg",
}

/**
 * A row inside an overlay panel — a `Menu` item, a `Listbox` option,
 * a `Combobox` option. The same three sizes as a control, read from
 * the same density-aware tokens, so a `md` option row and a `md`
 * `Button` are the same height.
 *
 * ### Why this is not `CONTROL_SIZE_CLASS`
 *
 * Two differences, and both are load-bearing.
 *
 * `min-h-`, not `h-`. A control on a form row holds one line by
 * contract; an option may be rich — an icon, two lines, a trailing
 * badge — and a fixed height clips it. The token is a **floor** here,
 * which is what makes the row at least as big as the button that
 * opened it while still growing for a label that wraps.
 *
 * `py-*`, which a control has none of. It is what a wrapped second
 * line breathes on once `min-h-` stops being the binding constraint.
 *
 * ### The sizes are click targets, not decoration
 *
 * The owner's request is the whole reason this exists: *"I personally
 * like larger click areas because it makes it easier to not mess up a
 * click. I can be much faster the less precise I need to be when
 * clicking."* At `comfortable` density `lg` is 2.75rem — 44px, the
 * WCAG 2.5.5 target — and on the kiosk density it is 3.75rem with no
 * prop change. See
 * `docs/decisions/2026-08-25-a-panel-row-is-sized-by-itemsize-and-menus-default-to-lg.md`.
 */
export const PANEL_ITEM_SIZE_CLASS: Record<
  ControlSize,
  string
> = {
  sm: "min-h-(--control-height-sm) gap-(--control-gap-sm) px-(--control-padding-inline-sm) py-1 text-sm",
  md: "min-h-(--control-height-md) gap-(--control-gap-md) px-(--control-padding-inline-md) py-1.5 text-md",
  lg: "min-h-(--control-height-lg) gap-(--control-gap-lg) px-(--control-padding-inline-lg) py-2 text-lg",
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
 * Everything a pressable control looks like before an intent, a size,
 * or a state is applied to it.
 *
 * Pulled out of `Button` the day `ButtonLink` shipped. Those two must
 * paint **identically** — the whole point of `ButtonLink` is that a
 * navigation can read as a primary button — and "identically" spelled
 * as two copies of the same string is a promise that survives exactly
 * one edit.
 */
export const CONTROL_BASE_CLASS =
  "inline-flex cursor-pointer items-center justify-center rounded-md border font-medium whitespace-nowrap transition-colors duration-(--duration-fast) ease-standard select-none"

/**
 * The one class list a button-shaped control wears, assembled once.
 *
 * `Button` and `ButtonLink` call this with the same arguments and get
 * the same string back, so a new appearance, a changed radius, or a
 * different hover ramp reaches both or neither. `ButtonLink.test.tsx`
 * asserts the resulting *computed styles* match, which is the version
 * of this claim a class-name refactor cannot quietly break.
 *
 * The disabled treatment is the caller's, because it is the one thing
 * that genuinely differs: a `<button>` has a real `disabled`
 * attribute and gets `DISABLED_CLASS`, while an `<a>` has no such
 * concept and gets `ARIA_DISABLED_CLASS` keyed off `aria-disabled`.
 */
export const getControlClassName = ({
  appearance,
  className,
  disabledClass,
  intent,
  isFullWidth,
  size,
  sizing,
}: {
  appearance: IntentAppearance
  className?: string
  disabledClass: string
  intent: IntentName
  isFullWidth: boolean
  size: ControlSize
  sizing: "control" | "icon"
}): string =>
  toClassName(
    CONTROL_BASE_CLASS,
    sizing === "icon"
      ? ICON_CONTROL_SIZE_CLASS[size]
      : CONTROL_SIZE_CLASS[size],
    INTENT_APPEARANCE_CLASS[intent][appearance],
    INTENT_HOVER_CLASS[intent][appearance],
    FOCUS_RING_CLASS,
    disabledClass,
    isFullWidth && "w-full",
    className,
  )

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
