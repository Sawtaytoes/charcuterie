/**
 * `resolveTokens` — the Satori path.
 *
 * CSS consumers get custom properties, and one `<html>` attribute
 * flip re-themes everything with no re-render. Satori cannot do
 * that: it renders JSX to PNG with an inline-style subset and has
 * no `var()` resolution at all, so it needs the **resolved
 * literals** for one specific (scheme × density × variant) combo.
 *
 * Same source of truth, two delivery shapes. This is the second
 * shape.
 */

import {
  densityControl,
  densityFontScale,
  space,
} from "./scales.ts"
import type {
  ControlTokens,
  Density,
  Scheme,
  SchemeColours,
  TypographyTokens,
  Variant,
} from "./types.ts"
import { variantsByName } from "./variants/index.ts"

export type ResolvedTokens = {
  variant: string
  scheme: Scheme
  density: Density
  colour: SchemeColours
  space: typeof space
  radius: Variant["radius"]
  motion: Variant["motion"]
  typography: TypographyTokens
  control: ControlTokens
  focusRing: Variant["focusRing"]
}

const scaleRem = (
  value: string,
  multiplier: number,
) => {
  const match = /^(-?[\d.]+)rem$/.exec(value)

  if (!match) {
    return value
  }

  return `${
    Math.round(
      Number(match[1]) * multiplier * 10000,
    ) / 10000
  }rem`
}

const scaleFontSizes = (
  typography: TypographyTokens,
  multiplier: number,
): TypographyTokens => ({
  ...typography,
  fontSize: Object.fromEntries(
    Object
      .entries(typography.fontSize)
      .map(([step, value]) => [
        step,
        scaleRem(value, multiplier),
      ]),
  ) as TypographyTokens["fontSize"],
})

/**
 * A variant may set its own control sizing (that is part of its
 * visual character), but density has the final say — a kiosk
 * control must clear `minTouchTarget` no matter which direction
 * won the bake-off.
 */
const resolveControl = (
  variant: Variant,
  density: Density,
): ControlTokens => (
  density === "comfortable"
    ? variant.control
    : densityControl[density]
)

export const resolveTokens = ({
  density = "comfortable",
  scheme = "dark",
  variant: variantName,
}: {
  density?: Density
  scheme?: Scheme
  variant: string
}): Readonly<ResolvedTokens> => {
  const variant = variantsByName.get(variantName)

  if (!variant) {
    throw new Error(
      `Unknown variant "${variantName}". Known: ${
        [...variantsByName.keys()].join(", ")
      }`,
    )
  }

  return Object.freeze({
    variant: variant.name,
    scheme,
    density,
    colour: variant.schemes[scheme],
    space,
    radius: variant.radius,
    motion: variant.motion,
    typography: scaleFontSizes(
      variant.typography,
      densityFontScale[density],
    ),
    control: resolveControl(variant, density),
    focusRing: variant.focusRing,
  })
}
