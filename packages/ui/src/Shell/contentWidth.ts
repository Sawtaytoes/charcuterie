/**
 * How wide the content column is allowed to get — the one number
 * the fleet has never agreed on.
 *
 * Ten repos hand-roll their page chrome and **no two of them cap
 * the column at the same width**: `max-w-5xl` (board-games,
 * portly), `max-w-6xl` and `max-w-3xl` mixed inside one app
 * (mux-magic), `max-w-7xl` (gallery-downloader, spoolbuddy),
 * `max-w-[90rem]` (mail-sifter), `80rem` (points-market), a raw
 * `1400px` in plain CSS (plex-channels), a JS-computed one
 * (rip-deck), and none at all in three more. It is the least
 * standardized value in the entire fleet.
 *
 * Two shapes are accepted, because the fleet genuinely has two
 * cases and collapsing them is what produced the mess:
 *
 *  1. A **`screen.*` step** — the ordinary page. Named, so a
 *     reviewer reads `contentWidth="lg"` rather than deciding
 *     whether `max-w-6xl` was chosen or inherited.
 *  2. A **`${number}rem` literal** — the runtime-computed case.
 *     rip-deck's `contentMaxWidthRem(columns)` widens the cap as
 *     the grid gains columns (1 → 56rem, 2 → 72rem, 3 → 106rem),
 *     and no fixed scale can express a number that is decided
 *     after the viewport is measured.
 *
 * `"full"` is the third answer and it is deliberate rather than a
 * hole: a wall of poster tiles wants the whole window, and an app
 * that wants that today reaches the same place by *omitting* the
 * cap, which is indistinguishable from having forgotten it.
 *
 * **`max-w-*` is not used and must not be.** Tailwind v4 owns
 * `--container-*` for that scale at *different* sizes than our
 * `screen.*`, which is the collision that renamed our
 * container-query scale to `--cq-*`
 * ([decision](../../../../docs/decisions/2026-07-29-container-query-scale-is-cq-not-container.md)).
 * The cap is therefore an inline `max-inline-size` reading
 * `var(--screen-*)`, so it stays a token rather than becoming a
 * literal the moment it is written down.
 */

import { screen } from "@charcuterie/tokens"

/** `sm` | `md` | `lg` | `xl` | `2xl`, from the token scale. */
export type ScreenStep = keyof typeof screen

export type ContentWidth =
  | ScreenStep
  | "full"
  | `${number}rem`

/**
 * Derived from the scale rather than restated, so a step added to
 * `screen.*` is accepted here without a second edit — and one
 * removed stops typechecking at every call site.
 */
const SCREEN_STEPS = new Set<string>(Object.keys(screen))

/**
 * The `max-inline-size` a `contentWidth` resolves to, or
 * `undefined` for `"full"` — which is the absence of the property
 * rather than a very large value, so nothing has to be un-set.
 */
export const toMaxInlineSize = (
  contentWidth: ContentWidth,
): string | undefined => {
  if (contentWidth === "full") {
    return undefined
  }

  if (SCREEN_STEPS.has(contentWidth)) {
    return `var(--screen-${contentWidth})`
  }

  return contentWidth
}

/**
 * The cap an app gets without asking, and it is deliberately
 * **narrower** than most of what the fleet ships.
 *
 * The owner's complaint, verbatim: *"All these apps seem to be
 * really narrow with a very large max-width. By that I mean 1
 * column, but waaaaaaay too wide."* A single column of prose or
 * form fields at `max-w-7xl` is one line of text the eye has to
 * track across a monitor. `screen.lg` is 64rem — wide enough for a
 * two-up card grid, narrow enough to read — and an app whose
 * content genuinely fills a window says so, once, in one place.
 */
export const DEFAULT_CONTENT_WIDTH: ContentWidth = "lg"
