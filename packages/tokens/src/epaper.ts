/**
 * The ePaper profile.
 *
 * **Not a scheme value, and deliberately not a variant.** ePaper
 * does not compose with the other axes because it removes
 * capabilities rather than restyling them: there is no hover, no
 * opacity, no shadow, no transition, and the palette is a fixed
 * six colours (or two) that the panel can physically render.
 * Modelling that as `data-scheme="epaper"` would imply a
 * `data-variant` still applies, which it cannot.
 *
 * The colours are the **E Ink Corporation Spectra 6** primaries.
 * `castkit/packages/views/src/viewStyles.ts` already collapses
 * accents to `#000000` on mono, which is the behaviour `mono`
 * formalises here.
 *
 * Consumed by the Satori profile, which renders to PNG and cannot
 * evaluate `var()` — so this exports resolved literals only.
 */

import type {
  IntentName,
  IntentRole,
  SchemeColours,
} from "./types.ts"

export type EpaperPalette = "spectra6" | "mono"

/**
 * Spectra 6 renders exactly these. Anything else dithers, and
 * dithering a 1px border is how you get a smeared grey line.
 */
const SPECTRA_6 = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#D02F2A",
  yellow: "#E8C11C",
  blue: "#2B4C9B",
  green: "#2E7D46",
} as const

const buildIntent = (
  colour: string,
): Record<IntentRole, string> => ({
  // No tint is available — a "surface" on ePaper is the paper.
  surface: SPECTRA_6.white,
  surfaceHover: SPECTRA_6.white,
  border: colour,
  content: colour,
  solid: colour,
  solidHover: colour,
  onSolid: SPECTRA_6.white,
})

export const epaperColours: Record<
  EpaperPalette,
  SchemeColours
> = {
  spectra6: {
    surface: {
      base: SPECTRA_6.white,
      raised: SPECTRA_6.white,
      sunken: SPECTRA_6.white,
      overlay: SPECTRA_6.white,
      inverse: SPECTRA_6.black,
    },
    content: {
      primary: SPECTRA_6.black,
      // There is no grey. "Secondary" has to be carried by weight
      // and size, not by lightness.
      secondary: SPECTRA_6.black,
      muted: SPECTRA_6.black,
      disabled: SPECTRA_6.black,
      onAccent: SPECTRA_6.white,
    },
    border: {
      subtle: SPECTRA_6.black,
      default: SPECTRA_6.black,
      strong: SPECTRA_6.black,
      focus: SPECTRA_6.blue,
    },
    intent: {
      neutral: buildIntent(SPECTRA_6.black),
      accent: buildIntent(SPECTRA_6.blue),
      success: buildIntent(SPECTRA_6.green),
      warning: {
        ...buildIntent(SPECTRA_6.yellow),
        // Yellow on white is unreadable as text at any size, so
        // warning says its piece in black and uses yellow only as
        // a fill it can put black on top of.
        content: SPECTRA_6.black,
        onSolid: SPECTRA_6.black,
      },
      danger: buildIntent(SPECTRA_6.red),
      info: buildIntent(SPECTRA_6.blue),
    },
    focus: {
      ring: SPECTRA_6.blue,
      ringOffset: SPECTRA_6.white,
    },
    elevation: {
      none: "none",
      low: "none",
      medium: "none",
      high: "none",
    },
  },

  mono: {
    surface: {
      base: SPECTRA_6.white,
      raised: SPECTRA_6.white,
      sunken: SPECTRA_6.white,
      overlay: SPECTRA_6.white,
      inverse: SPECTRA_6.black,
    },
    content: {
      primary: SPECTRA_6.black,
      secondary: SPECTRA_6.black,
      muted: SPECTRA_6.black,
      disabled: SPECTRA_6.black,
      onAccent: SPECTRA_6.white,
    },
    border: {
      subtle: SPECTRA_6.black,
      default: SPECTRA_6.black,
      strong: SPECTRA_6.black,
      focus: SPECTRA_6.black,
    },
    intent: (
      [
        "neutral",
        "accent",
        "success",
        "warning",
        "danger",
        "info",
      ] as IntentName[]
    ).reduce(
      (intents, name) => ({
        ...intents,
        [name]: buildIntent(SPECTRA_6.black),
      }),
      {} as Record<
        IntentName,
        Record<IntentRole, string>
      >,
    ),
    focus: {
      ring: SPECTRA_6.black,
      ringOffset: SPECTRA_6.white,
    },
    elevation: {
      none: "none",
      low: "none",
      medium: "none",
      high: "none",
    },
  },
}

/**
 * ePaper refreshes in whole seconds. Every duration is zero, and
 * that is a hard fact about the hardware rather than a preference.
 */
export const epaperMotion = {
  duration: {
    instant: "0ms",
    fast: "0ms",
    normal: "0ms",
    slow: "0ms",
  },
  easing: {
    standard: "linear",
    entrance: "linear",
    exit: "linear",
    emphasized: "linear",
  },
} as const
