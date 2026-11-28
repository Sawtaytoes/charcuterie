import type { CSSProperties } from "react"

/**
 * The picker's two small drawings — the favorite star and the chosen
 * row's check — drawn in CSS rather than typed.
 *
 * The check was the `✓` character in the first build, and it measured
 * blank in this repo's headless Chromium: the chosen row showed no
 * mark at all. A drawing has no font to lack.
 */

/**
 * A five-point star, drawn in CSS: a `currentColor` box clipped to a
 * polygon. Not a glyph — `★` renders as nothing where the font lacks
 * it — and not an SVG asset, which the library does not ship
 * ([decision](../../../../docs/decisions/2026-07-29-ship-no-icons-and-no-symbol-glyphs.md)).
 * The same reasoning `ActionMenu`'s CSS dots follow.
 */
const STAR_STYLE: CSSProperties = {
  clipPath:
    "polygon(50% 0%, 61.8% 35.4%, 100% 36.2%, 69.1% 59.1%, 79.4% 95.1%, 50% 74%, 20.6% 95.1%, 30.9% 59.1%, 0% 36.2%, 38.2% 35.4%)",
}

/** The small filled star on a favorite's row. */
export const ROW_FAVORITE_STAR = (
  <span
    aria-hidden="true"
    className="block size-3 shrink-0 bg-current text-intent-warning-content"
    style={STAR_STYLE}
  />
)

/** The favorites tab's mark on the rail. Takes the tab's text color. */
export const RAIL_FAVORITE_STAR = (
  <span
    aria-hidden="true"
    className="block size-4 shrink-0 bg-current"
    style={STAR_STYLE}
  />
)

/**
 * The chosen row's check: the bottom and end edges of a narrow box,
 * turned 45 degrees. `currentColor`, so it takes the row's accent.
 */
export const CHOSEN_CHECK = (
  <span
    aria-hidden="true"
    className="-mt-1 block h-2.5 w-1.5 rotate-45 border-current border-e-2 border-b-2"
  />
)
