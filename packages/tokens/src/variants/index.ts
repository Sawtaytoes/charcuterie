import type { Variant } from "../types.ts"
import { daylight } from "./daylight.ts"
import { hairline } from "./hairline.ts"
import { layered } from "./layered.ts"
import { legible } from "./legible.ts"

/**
 * The M0 bake-off field. **`daylight` won, 2026-07-29** — see
 * `docs/decisions/2026-07-29-daylight-is-the-default-visual-direction.md`.
 *
 * Order is the order they appear on the specimen board, chosen so
 * adjacent candidates differ on one obvious axis rather than
 * several: hairline → layered is density, layered → daylight is
 * scheme-first, daylight → legible is contrast. It is kept as-is
 * so the board still reads as the comparison it was.
 *
 * The three that lost are **not** dead code. Each is a working
 * `data-variant` value, already contrast-gated in CI, and the
 * reason keeping them costs nothing is that the bake-off was
 * generated from real token files rather than drawn by hand.
 * `legible` in particular stays useful as the contrast benchmark
 * `daylight` is judged against.
 */
export const variants: Variant[] = [
  hairline,
  layered,
  daylight,
  legible,
]

export const variantsByName = new Map(
  variants.map((variant) => [variant.name, variant]),
)

export {
  daylight,
  hairline,
  layered,
  legible,
}
