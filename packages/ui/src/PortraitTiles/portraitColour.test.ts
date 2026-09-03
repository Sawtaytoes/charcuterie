import { expect, test } from "vitest"

import {
  getPortraitColourProperties,
  PORTRAIT_COLOUR_PROPERTY,
  PORTRAIT_HALO_PROPERTY,
  PORTRAIT_ON_COLOUR_PROPERTY,
  PORTRAIT_STAT_PROPERTY,
} from "./portraitColour.ts"

/**
 * Four properties out of one colour, and each of them is read by a
 * class that Tailwind generated from a literal. A wrong name here is
 * not an error anywhere — the property is simply never read and the
 * portrait paints with no fill at all, which looks like an image
 * that failed to load.
 */
test("one colour becomes the four properties the paint reads", () => {
  const properties = getPortraitColourProperties("#A6D96A")

  expect(properties[PORTRAIT_COLOUR_PROPERTY]).toBe(
    "#A6D96A",
  )

  // Pale fill, so the letters go dark. `getReadableTextColour` owns
  // that choice and `contrast.test.ts` covers it.
  expect(properties[PORTRAIT_ON_COLOUR_PROPERTY]).toBe(
    "#000000",
  )

  // A wash of the hue, standing in for `categorical-N-surface`, and
  // the number pulled toward the scheme's own text colour so it
  // moves with the scheme instead of staying pale on a pale surface.
  expect(properties[PORTRAIT_HALO_PROPERTY]).toBe(
    "color-mix(in srgb, #A6D96A 28%, transparent)",
  )

  expect(properties[PORTRAIT_STAT_PROPERTY]).toBe(
    "color-mix(in srgb, #A6D96A 62%, var(--color-content-primary))",
  )
})
