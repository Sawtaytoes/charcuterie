import type { Variant } from "../types.ts"
import { daylight } from "./daylight.ts"
import { hairline } from "./hairline.ts"
import { layered } from "./layered.ts"
import { legible } from "./legible.ts"

/**
 * The M0 bake-off field.
 *
 * Order is the order they appear on the specimen board, chosen so
 * adjacent candidates differ on one obvious axis rather than
 * several: hairline → layered is density, layered → daylight is
 * scheme-first, daylight → legible is contrast.
 *
 * After the pick, the winner becomes the default `data-variant`
 * and the losers stay here as alternates for free. Nothing gets
 * deleted — that is the whole reason the bake-off was generated
 * from real token files instead of drawn by hand.
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
