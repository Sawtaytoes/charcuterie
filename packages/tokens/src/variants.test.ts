/**
 * Properties every visual direction must hold, whichever one is
 * default. These are the rules a *new* variant is most likely to
 * break — M0 shipped four, and adding a fifth should fail loudly
 * rather than subtly.
 */

import { describe, expect, test } from "vitest"

import {
  CATEGORICAL_INDEXES,
  getCategoricalDistinctnessFailures,
} from "./categorical.ts"
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
    "%s defines every categorical index with every role",
    (scheme) => {
      const { categorical } = variant.schemes[scheme]

      // Every index, and the *same seven roles an intent has* —
      // `CategoricalRole` is `IntentRole`, so a variant that
      // generated six of them would be a variant whose badges have
      // no hover.
      expect(
        Object.keys(categorical)
          .map(Number)
          .sort((first, second) => first - second),
      ).toEqual([...CATEGORICAL_INDEXES])

      for (const index of CATEGORICAL_INDEXES) {
        expect(
          Object.keys(categorical[index]).sort(),
        ).toEqual([
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
    "%s keeps every categorical index distinguishable from every other",
    (scheme) => {
      // The gate a contrast audit structurally cannot be. Two
      // indexes can both clear 4.5:1 against the same surface and
      // be the same colour as each other, and every number on the
      // board stays green — while the only job this family has,
      // telling label 3 from label 4, has quietly stopped being
      // done.
      const failures = getCategoricalDistinctnessFailures(
        variant.schemes[scheme].categorical,
      )

      expect(
        failures.map(
          (failure) =>
            `${failure.role} ${failure.first}/${failure.second}: ΔEok ${failure.distance.toFixed(
              4,
            )} needs ${failure.floor}`,
        ),
      ).toEqual([])
    },
  )

  test.each(SCHEMES)(
    "%s dims behind a modal, and does it translucently",
    (scheme) => {
      // The scrim is the one colour in the set that must *not* be
      // opaque, and an opaque one is a black rectangle where the
      // page used to be — which looks like a rendering failure
      // rather than a dialog. Deliberately checking for an alpha
      // channel rather than for a specific value, so a direction
      // stays free to dim as hard as its premise wants.
      const { scrim } = variant.schemes[scheme]

      expect(scrim).toMatch(/^rgb\([\d\s]+\/\s*0?\.\d+\)$/)
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
        ...CATEGORICAL_INDEXES.flatMap((index) =>
          Object.values(colour.categorical[index]),
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
