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
 * Spectra 6 renders exactly these.
 *
 * **These are the values castkit's quantizer maps 1:1** — not a
 * spec sheet, and not what the ink looks like on the wall. M5b
 * replaced an invented set (`#D02F2A`, `#2B4C9B`, …) with the
 * consumer's measured one:
 * `castkit/packages/core/src/panels/palette.ts`, itself lifted from
 * Pimoroni's `inky` driver (`inky_e673.py`). Two palettes exist
 * there and the distinction is the whole point —
 * `DESATURATED_PALETTE` is the pure primary each index *means*,
 * `SATURATED_PALETTE` is the muted ink the panel physically emits,
 * and the driver blends them at a `saturation`. The fleet renders
 * at **0.5** (`IMMICH_SATURATION`), so the 0.5 blend below is the
 * quantization target.
 *
 * Authoring an off-palette colour is less dramatic than it sounds,
 * and it was worth measuring rather than assuming: pushed through
 * castkit's real pipeline, a flat field of `#FFFFFF` converges to
 * `#D0D2D2` with **no speckle at all**, and `#1F4FD0` lands on the
 * same `#1F1EAF` the palette blue does. Error diffusion in a flat
 * region has nowhere to put the residual. The cost shows up at
 * edges and in gradients — and, more importantly, in the fact that
 * the value written here is then **not the value that reaches the
 * panel**, so every judgement made about it, contrast most of all,
 * is a judgement about a colour nobody sees.
 *
 * **What the eye actually receives is the emitted ink**, which is
 * dimmer than any of these, and measuring against it says something
 * uncomfortable:
 *
 * | emitted | on paper | black on it |
 * | --- | --- | --- |
 * | black `#000000` | — | — |
 * | paper `#A1A4A5` | — | 8.37 ✅ |
 * | yellow `#D0BE47` | 1.33 ✗ | 11.14 ✅ |
 * | red `#9C484B` | 2.43 ✗ | 3.44 ✗ |
 * | blue `#3D3B5E` | 4.21 ✗ | 1.99 ✗ |
 * | green `#3A5B46` | 3.03 ✗ | 2.76 ✗ |
 *
 * So on real Spectra 6 ink only **black on paper** and **black on
 * yellow** reach WCAG AA; blue and green clear the 3:1 non-text bar
 * as rules and borders, and red clears nothing.
 *
 * **ePaper is deliberately exempt from the contrast gate** —
 * Kevin's call in M5b
 * ([decision](../../../docs/decisions/2026-07-31-epaper-is-exempt-from-the-contrast-gate.md)).
 * Enforcing AA here would reduce a six-ink panel to black, which is
 * not what the hardware is for. The numbers are recorded rather
 * than gated, so an author choosing `danger` on a panel knows what
 * they are choosing.
 */
const SPECTRA_6 = {
  black: "#000000",
  white: "#D0D2D2",
  red: "#CE2426",
  yellow: "#E8DF24",
  blue: "#1F1EAF",
  green: "#1DAD23",
} as const

/**
 * The Inky pHAT is 1-bit and its two states are pure — no blend,
 * no muting. Separate constants because `mono` shares none of
 * Spectra 6's ink chemistry: its paper is `#FFFFFF`, not the
 * `#D0D2D2` an E6 panel calls white.
 */
const MONO = {
  black: "#000000",
  white: "#FFFFFF",
} as const

const buildIntent = ({
  colour,
  paper,
}: {
  colour: string
  paper: string
}): Record<IntentRole, string> => ({
  // No tint is available — a "surface" on ePaper is the paper.
  surface: paper,
  surfaceHover: paper,
  border: colour,
  content: colour,
  solid: colour,
  solidHover: colour,
  onSolid: paper,
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
      neutral: buildIntent({
        colour: SPECTRA_6.black,
        paper: SPECTRA_6.white,
      }),
      accent: buildIntent({
        colour: SPECTRA_6.blue,
        paper: SPECTRA_6.white,
      }),
      success: buildIntent({
        colour: SPECTRA_6.green,
        paper: SPECTRA_6.white,
      }),
      warning: {
        ...buildIntent({
          colour: SPECTRA_6.yellow,
          paper: SPECTRA_6.white,
        }),
        // Yellow on paper is unreadable as text at any size — 1.33
        // against the emitted ink — so warning says its piece in
        // black and uses yellow only as a fill it can put black on
        // top of. That pair is 11.14, the best on the panel.
        content: SPECTRA_6.black,
        onSolid: SPECTRA_6.black,
      },
      danger: buildIntent({
        colour: SPECTRA_6.red,
        paper: SPECTRA_6.white,
      }),
      info: buildIntent({
        colour: SPECTRA_6.blue,
        paper: SPECTRA_6.white,
      }),
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
    // A panel with no opacity cannot dim the page behind a
    // dialog, so it says so rather than faking one. The `Modal`
    // still separates — border and the paper itself — because a
    // scrim was never its only means.
    scrim: "transparent",
  },

  mono: {
    surface: {
      base: MONO.white,
      raised: MONO.white,
      sunken: MONO.white,
      overlay: MONO.white,
      inverse: MONO.black,
    },
    content: {
      primary: MONO.black,
      secondary: MONO.black,
      muted: MONO.black,
      disabled: MONO.black,
      onAccent: MONO.white,
    },
    border: {
      subtle: MONO.black,
      default: MONO.black,
      strong: MONO.black,
      focus: MONO.black,
    },
    intent: Object.fromEntries(
      (
        [
          "neutral",
          "accent",
          "success",
          "warning",
          "danger",
          "info",
        ] as IntentName[]
      ).map((name) => [
        name,
        buildIntent({
          colour: MONO.black,
          paper: MONO.white,
        }),
      ]),
    ) as Record<IntentName, Record<IntentRole, string>>,
    focus: {
      ring: MONO.black,
      ringOffset: MONO.white,
    },
    elevation: {
      none: "none",
      low: "none",
      medium: "none",
      high: "none",
    },
    // A panel with no opacity cannot dim the page behind a
    // dialog, so it says so rather than faking one. The `Modal`
    // still separates — border and the paper itself — because a
    // scrim was never its only means.
    scrim: "transparent",
  },
}

/**
 * ePaper refreshes in whole seconds. Every duration is zero, and
 * that is a hard fact about the hardware rather than a preference.
 *
 * The loop durations matter more than the transition ones here. A
 * transition that never fires is invisible; a *looping* animation
 * on a panel that takes seconds to repaint is a device that looks
 * broken and a battery that drains. Anything that would loop must
 * be switched off outright rather than merely set to zero — an
 * `animation` with a `0ms` duration still holds its first
 * keyframe, which for a sweep means an empty bar.
 */
export const epaperMotion = {
  duration: {
    instant: "0ms",
    fast: "0ms",
    normal: "0ms",
    slow: "0ms",
    loopFast: "0ms",
    loopSlow: "0ms",
  },
  easing: {
    standard: "linear",
    entrance: "linear",
    exit: "linear",
    emphasized: "linear",
  },
} as const
