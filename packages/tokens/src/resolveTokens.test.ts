/**
 * `resolveTokens` is the Satori path — the one consumer that
 * cannot evaluate `var()` and so needs resolved literals for one
 * specific (scheme × density × variant).
 *
 * It is also the only place the two delivery shapes can drift, so
 * the density rules get asserted here rather than trusted.
 */

import { expect, test } from "vitest"

import { resolveTokens } from "./resolveTokens.ts"
import { densityControl } from "./scales.ts"
import { variantsByName } from "./variants/index.ts"

test("an unknown variant throws and names the known ones", () => {
  expect(() =>
    resolveTokens({ variant: "midnight" }),
  ).toThrow(/daylight/)
})

test("the defaults are dark and comfortable", () => {
  const resolved = resolveTokens({
    variant: "daylight",
  })

  // Picking a light-first visual direction is not the same as
  // flipping the fleet to light. `daylight` won M0 as a
  // `data-variant`; the default *scheme* stays dark deliberately,
  // which is what makes the mux-magic swap a no-op to look at.
  expect(resolved.scheme).toBe("dark")
  expect(resolved.density).toBe("comfortable")
})

test("the result is frozen", () => {
  const resolved = resolveTokens({
    variant: "daylight",
  })

  expect(Object.isFrozen(resolved)).toBe(true)
})

test("comfortable keeps the variant's own control sizing", () => {
  const daylight = variantsByName.get("daylight")

  if (!daylight) {
    throw new Error("daylight variant missing")
  }

  expect(
    resolveTokens({
      variant: "daylight",
      density: "comfortable",
    }).control,
  ).toEqual(daylight.control)
})

test("density overrides a variant's control sizing", () => {
  // Control sizing is part of a variant's visual character, but
  // density has the final say — a kiosk control must be reachable
  // by finger no matter which direction won the bake-off.
  expect(
    resolveTokens({
      variant: "daylight",
      density: "kiosk",
    }).control,
  ).toEqual(densityControl.kiosk)
})

test("every density clears the 44px touch-target floor", () => {
  for (const density of [
    "comfortable",
    "compact",
    "kiosk",
  ] as const) {
    const { control } = resolveTokens({
      variant: "daylight",
      density,
    })

    // 2.75rem at a 16px root. The kiosk Pis and xander are driven
    // by finger and by remote, so this is a floor rather than an
    // aspiration.
    expect(
      Number.parseFloat(control.minTouchTarget),
    ).toBeGreaterThanOrEqual(2.75)
  }
})

test("kiosk scales type up and compact scales it down", () => {
  const readMediumSize = (
    density: "comfortable" | "compact" | "kiosk",
  ) =>
    Number.parseFloat(
      resolveTokens({
        variant: "daylight",
        density,
      }).typography.fontSize.md,
    )

  expect(readMediumSize("compact")).toBeLessThan(
    readMediumSize("comfortable"),
  )

  expect(readMediumSize("kiosk")).toBeGreaterThan(
    readMediumSize("comfortable"),
  )
})

test("density does not change colour", () => {
  // The contrast matrix is (variant × scheme), not
  // (variant × scheme × density). If density ever started
  // touching colour, the audit would silently stop covering
  // two thirds of what ships.
  const comfortable = resolveTokens({
    variant: "daylight",
    density: "comfortable",
  })

  const kiosk = resolveTokens({
    variant: "daylight",
    density: "kiosk",
  })

  expect(kiosk.colour).toEqual(comfortable.colour)
})

test("scheme selects the matching colour set", () => {
  const daylight = variantsByName.get("daylight")

  if (!daylight) {
    throw new Error("daylight variant missing")
  }

  expect(
    resolveTokens({
      variant: "daylight",
      scheme: "light",
    }).colour,
  ).toEqual(daylight.schemes.light)
})
