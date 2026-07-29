/**
 * Properties every visual direction must hold, whichever one is
 * default. These are the rules a *new* variant is most likely to
 * break — M0 shipped four, and adding a fifth should fail loudly
 * rather than subtly.
 */

import { describe, expect, test } from "vitest"

import { INTENT_NAMES } from "./contrastAudit.ts"
import type { Scheme } from "./types.ts"
import {
  variants,
  variantsByName,
} from "./variants/index.ts"

const SCHEMES: Scheme[] = ["light", "dark"]

test("every variant is reachable by name", () => {
  expect(variantsByName.size).toBe(variants.length)

  for (const variant of variants) {
    expect(variantsByName.get(variant.name)).toBe(variant)
  }
})

test("the M0 candidates all survived as alternates", () => {
  // `daylight` won; the other three keep working as
  // `data-variant` values at no cost. That is the payoff for
  // generating the bake-off board from token files rather than
  // drawing it, and deleting a loser would throw it away.
  expect(
    variants.map((variant) => variant.name).sort(),
  ).toEqual(["daylight", "hairline", "layered", "legible"])
})

describe.each(variants)("$name", (variant) => {
  test("light mode is not pure white", () => {
    // The load-bearing rule from the plan: `raised` means *more
    // separated from base*, not *lighter*. Naive light themes
    // fail by making base `#FFFFFF`, which leaves `raised`
    // nowhere to go.
    expect(
      variant.schemes.light.surface.base.toUpperCase(),
    ).not.toBe("#FFFFFF")
  })

  test.each(SCHEMES)(
    "%s separates raised and sunken from base",
    (scheme) => {
      const { surface } = variant.schemes[scheme]

      expect(surface.raised).not.toBe(surface.base)
      expect(surface.sunken).not.toBe(surface.base)
    },
  )

  test.each(SCHEMES)(
    "%s defines every intent with every role",
    (scheme) => {
      const { intent } = variant.schemes[scheme]

      for (const name of INTENT_NAMES) {
        expect(Object.keys(intent[name]).sort()).toEqual([
          "border",
          "content",
          "onSolid",
          "solid",
          "solidHover",
          "surface",
          "surfaceHover",
        ])
      }
    },
  )

  test.each(SCHEMES)(
    "%s uses opaque 6-digit hex throughout",
    (scheme) => {
      const colour = variant.schemes[scheme]

      const swatches = [
        ...Object.values(colour.surface),
        ...Object.values(colour.content),
        ...Object.values(colour.border),
        ...INTENT_NAMES.flatMap((name) =>
          Object.values(colour.intent[name]),
        ),
        colour.focus.ring,
        colour.focus.ringOffset,
      ]

      // Translucency hides contrast failures: the gate would be
      // measuring a colour nobody ever sees composited.
      for (const swatch of swatches) {
        expect(swatch).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    },
  )

  test("the focus ring is a real ring", () => {
    // A zero-width focus indicator passes a colour-contrast gate
    // and is still invisible.
    expect(
      Number.parseFloat(variant.focusRing.width),
    ).toBeGreaterThan(0)
  })
})
