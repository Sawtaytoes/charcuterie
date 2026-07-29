/**
 * The scales that do not vary by visual direction.
 *
 * A variant may change how things *look* (colour, radius, motion,
 * type). It may not change what layer a modal sits on or what a
 * tablet breakpoint is, because those are structural facts about
 * the fleet rather than taste.
 *
 * Everything spatial is expressed as a **logical** property
 * downstream — `paddingInline`, `marginInline`, `insetInlineStart`
 * — never `left`/`right`. That is cheap now and makes RTL nearly
 * free later, which is why it is a lint-enforced rule rather than
 * a preference.
 */

import type { ControlTokens, Density } from "./types.ts"

/** 4px base. Index is the step, value is the length. */
export const space = {
  0: "0px",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const

/**
 * z-index. Named, ordered, and the only sanctioned source — the
 * fleet currently has hand-picked `z-10`/`z-50` scattered around
 * with no ordering guarantee between apps.
 */
export const layer = {
  base: "0",
  sticky: "100",
  dropdown: "200",
  overlay: "300",
  modal: "400",
  toast: "500",
  tooltip: "600",
} as const

/**
 * Viewport breakpoints. Deliberately named `screen.*` so nobody
 * reaches for one when they meant a container query.
 */
export const screen = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
} as const

/**
 * Container-query sizes. A separate scale from `screen.*`, with a
 * separate name, because a card that is 400px wide inside a 1920px
 * window should lay out like a small thing — which is the whole
 * reason the fleet's poster grids look wrong at intermediate
 * widths today.
 *
 * Emitted as `--cq-*`, **not** `--container-*`. Tailwind v4 owns
 * `--container-*` for its thirteen-step `max-w-*` scale, using the
 * same step names at different sizes — our `md` is 32rem against
 * its 28rem — so declaring ours at `:root` silently turned
 * `max-w-md` into `max-w-lg` in every consumer, with no import and
 * no error. M1 caught it in mux-magic before anything shipped.
 *
 * `cq` is the only abbreviation in the token surface, against a
 * house style that otherwise spells names out (`--line-height-*`,
 * not `--lh-*`). It earns the exception by matching the CSS
 * feature it exists for: `@container` queries are written with
 * `cqw`/`cqi`/`cqmin` units, so `--cq-md` reads as that scale to
 * anyone writing one.
 */
export const containerQuery = {
  xs: "16rem",
  sm: "24rem",
  md: "32rem",
  lg: "48rem",
  xl: "64rem",
} as const

/**
 * The density axis. Composes with scheme and variant; all three
 * are `<html>` data attributes.
 *
 *  - `comfortable` — desktop default.
 *  - `compact` — dense job/queue/bay lists, where the whole point
 *    is fitting more rows on one screen.
 *  - `kiosk` — the HyperPixel and xander, driven by finger and by
 *    remote from across a room. Nothing here may drop below
 *    `minTouchTarget`.
 */
export const densityControl: Record<
  Density,
  ControlTokens
> = {
  comfortable: {
    height: {
      sm: "2rem",
      md: "2.25rem",
      lg: "2.75rem",
    },
    paddingInline: {
      sm: "0.625rem",
      md: "0.875rem",
      lg: "1.125rem",
    },
    gap: {
      sm: "0.375rem",
      md: "0.5rem",
      lg: "0.625rem",
    },
    minTouchTarget: "2.75rem",
  },
  compact: {
    height: {
      sm: "1.625rem",
      md: "1.875rem",
      lg: "2.25rem",
    },
    paddingInline: {
      sm: "0.5rem",
      md: "0.625rem",
      lg: "0.875rem",
    },
    gap: {
      sm: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
    },
    minTouchTarget: "2.75rem",
  },
  kiosk: {
    height: {
      sm: "2.75rem",
      md: "3.25rem",
      lg: "3.75rem",
    },
    paddingInline: {
      sm: "1rem",
      md: "1.25rem",
      lg: "1.5rem",
    },
    gap: {
      sm: "0.5rem",
      md: "0.75rem",
      lg: "1rem",
    },
    minTouchTarget: "2.75rem",
  },
}

/**
 * Per-density type scale multiplier. Kiosk reads from across a
 * room; compact is trying to fit a bay list on one screen.
 */
export const densityFontScale: Record<Density, number> = {
  comfortable: 1,
  compact: 0.9375,
  kiosk: 1.1875,
}
