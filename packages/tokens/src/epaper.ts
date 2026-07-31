/**
 * The ePaper profile.
 *
 * **Not a scheme value, and deliberately not a variant.** ePaper
 * does not compose with the other axes because it removes
 * capabilities rather than restyling them: there is no hover, no
 * opacity, no shadow, no transition, and colour is restricted to a
 * set small enough to hold a sharp edge. Modelling that as
 * `data-scheme="epaper"` would imply a `data-variant` still
 * applies, which it cannot.
 *
 * **Six is what one *pixel* can be, not what the panel can show.**
 * That distinction is the whole of this file and the profile got it
 * wrong until M6g. A Spectra 6 panel sets each pixel to one of six
 * inks; a *region* of pixels renders far more than six colours,
 * because the driver dithers. The photo path depends on that and
 * always has —
 * `home-displays/epaper-clients/immich_impression_frame.py` hands
 * the image straight to inky's Floyd–Steinberg at
 * `saturation=0.5` and gets a near-continuous gamut. **A
 * six-colour restriction applied to photographs would be badly
 * wrong. It is not applied to photographs.** This profile paints UI
 * chrome through Satori, which is a different problem.
 *
 * So the restriction here is not "these are the colours the panel
 * can physically render" — that claim was false. It is **"these are
 * the colours that survive at UI scale"**, and it splits by what is
 * being drawn:
 *
 * | what | what it can use | why |
 * | --- | --- | --- |
 * | photographs | the full dithered gamut | not this profile's business; the fetcher owns it |
 * | flat fills, large areas | `inks` **+ `blends`** — 19 on Spectra 6 | a 50% two-ink checkerboard stays structurally clean |
 * | borders, small text, icons | `inks` only — 6 | dithering visibly mangles small geometry |
 *
 * The last row is the one the original intuition got right, and it
 * now has a source rather than an assertion. From the same
 * measurement that produced the blend tier: *"While more complex
 * algorithms like Rotated Bayer or Error Diffusion are excellent
 * for photographic gradients, **they often struggle with
 * small-scale graphical primitives** … introduced noticeable
 * geometric artifacts that distracted from the clean lines of the
 * UI elements."* —
 * [Beyond 6 Colors](https://myembeddedstuff.com/e-ink-spectra-6-color).
 * That is "a dithered 1px border is a smeared grey line", said by
 * somebody who measured it.
 *
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

/**
 * Panels whose ink set is fixed, and which therefore have a
 * palette `epaperColours` can key. Every panel in the fleet is one
 * of these.
 */
export type EpaperPalette = "spectra6" | "mono"

/**
 * Every panel the profile can describe, fleet or not.
 *
 * Wider than {@link EpaperPalette} on purpose — see
 * {@link epaperPanels}.
 */
export type EpaperPanelId = EpaperPalette | "gallery3"

/**
 * What kind of colour constraint a panel imposes.
 *
 * Not a cosmetic label. It decides whether a fixed hex list is even
 * the right way to describe the panel, which is why it is a
 * discriminant rather than a field: a `continuousTone` panel has no
 * `inks` to get wrong, so the type makes forcing one through a
 * six-hex set unrepresentable rather than merely unwise. That is
 * the same argument that kept ePaper out of `data-scheme`.
 */
export type EpaperPanelFamily =
  | "fixedInk"
  | "continuousTone"

type InkChannels = readonly [number, number, number]

const toHex = (channels: InkChannels) =>
  `#${channels
    .map((channel) =>
      Math.round(channel)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase(),
    )
    .join("")}`

const toChannels = (hex: string): InkChannels => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
]

/**
 * Pimoroni's `DESATURATED_PALETTE` — the pure primary each ink
 * index *means*, before the panel's real-ink muting.
 *
 * Lifted from the `inky` driver (`inky_e673.py`) via
 * `castkit/packages/core/src/panels/palette.ts`. Key order is the
 * driver's index order, so `Object.keys` here is the palette the
 * quantizer is handed.
 */
const SPECTRA_6_VIVID = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  yellow: [255, 255, 0],
  red: [255, 0, 0],
  blue: [0, 0, 255],
  green: [0, 255, 0],
} as const satisfies Record<string, InkChannels>

/**
 * Pimoroni's `SATURATED_PALETTE` — the muted tone the physical E6
 * ink actually emits. **This is what the eye receives**, and it is
 * dimmer than anything in {@link SPECTRA_6_VIVID}.
 */
const SPECTRA_6_EMITTED_CHANNELS = {
  black: [0, 0, 0],
  white: [161, 164, 165],
  yellow: [208, 190, 71],
  red: [156, 72, 75],
  blue: [61, 59, 94],
  green: [58, 91, 70],
} as const satisfies Record<
  keyof typeof SPECTRA_6_VIVID,
  InkChannels
>

/**
 * The fleet renders at `IMMICH_SATURATION = 0.5`, so the 0.5 blend
 * of vivid and emitted is the value the quantizer maps 1:1.
 */
const FLEET_SATURATION = 0.5

type SpectraInkName = keyof typeof SPECTRA_6_VIVID

const SPECTRA_INK_NAMES = Object.keys(
  SPECTRA_6_VIVID,
) as SpectraInkName[]

/**
 * Spectra 6's six inks — **derived, never typed by hand**.
 *
 * This used to be six hardcoded hexes, and the hexes were invented:
 * `#D02F2A`, `#2B4C9B`, … plausible Spectra 6 primaries, not one of
 * them a colour the pipeline maps 1:1. `epaper.test.ts` passed
 * against them for a full milestone, because the test held the same
 * fabricated set the source did. M5b traced the real values;
 * computing them from the driver's two palettes is what stops it
 * happening a third time. The literals now live only in the test,
 * where they are an independent pin rather than a copy.
 *
 * The blend is Pimoroni's `inky._palette_blend(saturation)`, per
 * channel: `emitted × saturation + vivid × (1 − saturation)`.
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
 * is a judgement about a colour nobody sees. That is what
 * {@link spectra6Blends} turns from an accident into a tool.
 *
 * **What the eye actually receives is the emitted ink**, and
 * measuring against it says something uncomfortable:
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
const SPECTRA_6 = Object.fromEntries(
  SPECTRA_INK_NAMES.map((name) => [
    name,
    toHex(
      SPECTRA_6_VIVID[name].map(
        (vividChannel, channelIndex) =>
          SPECTRA_6_EMITTED_CHANNELS[name][channelIndex] *
            FLEET_SATURATION +
          vividChannel * (1 - FLEET_SATURATION),
      ) as unknown as InkChannels,
    ),
  ]),
) as Record<SpectraInkName, string>

/** The emitted ink, as hexes — recorded, never authored. */
const SPECTRA_6_EMITTED = Object.fromEntries(
  SPECTRA_INK_NAMES.map((name) => [
    name,
    toHex(SPECTRA_6_EMITTED_CHANNELS[name]),
  ]),
) as Record<SpectraInkName, string>

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

// ---------------------------------------------------------------
// The blend tier — the ~12 colours that were being thrown away
// ---------------------------------------------------------------

/**
 * castkit's `NEUTRAL_CHROMA_THRESHOLD`. A pixel this close to grey
 * is dithered against **only** the palette's darkest and lightest
 * inks, so that anti-aliased text edges never pick up colour
 * speckle. Mirrored here because it decides which blends are
 * reachable, and a blend that trips it comes out grey.
 *
 * `castkit/packages/core/src/pipeline/dither.ts`.
 */
const NEUTRAL_CHROMA_THRESHOLD = 26

const mapChannels = (
  channels: InkChannels,
  mapChannel: (channel: number, index: number) => number,
): InkChannels =>
  [
    mapChannel(channels[0], 0),
    mapChannel(channels[1], 1),
    mapChannel(channels[2], 2),
  ] as const

/** Rec. 601 luminance, matching castkit's sub-palette pick. */
const getLuminance = (channels: InkChannels) =>
  channels[0] * 0.299 +
  channels[1] * 0.587 +
  channels[2] * 0.114

/** Euclidean RGB distance — the quantizer's own metric. */
const getDistance = (
  channelsA: InkChannels,
  channelsB: InkChannels,
) =>
  Math.hypot(
    channelsA[0] - channelsB[0],
    channelsA[1] - channelsB[1],
    channelsA[2] - channelsB[2],
  )

/**
 * The colour to **author** so the panel lands on a 50/50
 * checkerboard of two inks: their arithmetic mean in the same
 * 8-bit space the quantizer works in.
 *
 * Not the physically-correct linear-light mix, and deliberately so.
 * The pipeline is the arbiter, not optics: error diffusion
 * distributes residual linearly over the encoded values it is
 * handed, so the encoded midpoint is the input that splits evenly.
 * What the *eye* then receives is a different number again — see
 * {@link spectra6Blends}.
 */
const getBlendValue = ({
  inkA,
  inkB,
}: {
  inkA: string
  inkB: string
}) => {
  const channelsB = toChannels(inkB)

  return toHex(
    mapChannels(toChannels(inkA), (channel, channelIndex) =>
      Math.round((channel + channelsB[channelIndex]) / 2),
    ),
  )
}

/**
 * Which two inks castkit's pipeline actually puts on the panel for
 * a given flat colour — the neutral guard first, then nearest
 * neighbour in Euclidean RGB.
 *
 * This reimplements the consumer rather than guessing at it, and
 * the reimplementation was checked against the real thing: all 15
 * Spectra 6 ink pairs were pushed through `ditherToPanel` at
 * `floyd-steinberg` over a flat field, and the predicted pair
 * matched the measured pixel census 15 times out of 15.
 */
const getQuantizedInkPair = ({
  inks,
  colour,
}: {
  inks: Record<string, string>
  colour: string
}): [string, string] => {
  const channels = toChannels(colour)
  const inkNames = Object.keys(inks)

  const isNeutral =
    Math.max(...channels) - Math.min(...channels) <=
    NEUTRAL_CHROMA_THRESHOLD

  const ordered = isNeutral
    ? [...inkNames].sort(
        (nameA, nameB) =>
          getLuminance(toChannels(inks[nameA])) -
          getLuminance(toChannels(inks[nameB])),
      )
    : [...inkNames].sort(
        (nameA, nameB) =>
          getDistance(channels, toChannels(inks[nameA])) -
          getDistance(channels, toChannels(inks[nameB])),
      )

  return isNeutral
    ? [ordered[0], ordered[ordered.length - 1]]
    : [ordered[0], ordered[1]]
}

/**
 * Is a 50% checkerboard of these two inks something the fleet can
 * actually be asked for?
 *
 * Only if the authored midpoint quantizes back to exactly that
 * pair. Two of Spectra 6's fifteen pairs fail, and both fail
 * because a *third* ink sits between them: `black`+`yellow` comes
 * out `green`+`red`, and `yellow`+`blue` is neutral enough to trip
 * the chroma guard and comes out `black`+`white`. Neither is fixable
 * by nudging the hex — there is no input colour whose two nearest
 * inks are black and yellow.
 */
export const getIsReachableBlend = ({
  inks,
  inkNames,
}: {
  inks: Record<string, string>
  inkNames: readonly [string, string]
}) => {
  const reached = getQuantizedInkPair({
    inks,
    colour: getBlendValue({
      inkA: inks[inkNames[0]],
      inkB: inks[inkNames[1]],
    }),
  })

  return (
    reached.includes(inkNames[0]) &&
    reached.includes(inkNames[1])
  )
}

/**
 * Every two-ink pair whose checkerboard is reachable — derived, so
 * a new panel gets its blend tier for free and nobody has to guess
 * which pairs survive.
 */
export const listReachableBlendPairs = (
  inks: Record<string, string>,
): [string, string][] => {
  const inkNames = Object.keys(inks)

  return inkNames.flatMap((nameA, indexA) =>
    inkNames
      .slice(indexA + 1)
      .map((nameB): [string, string] => [nameA, nameB])
      .filter((inkNames) =>
        getIsReachableBlend({ inks, inkNames }),
      ),
  )
}

const blend = (
  inkNameA: SpectraInkName,
  inkNameB: SpectraInkName,
) =>
  getBlendValue({
    inkA: SPECTRA_6[inkNameA],
    inkB: SPECTRA_6[inkNameB],
  })

/**
 * **The thirteen colours Spectra 6 was quietly throwing away.**
 *
 * Each is a 50% A-B-A-B checkerboard of two inks, and each is
 * reached by *authoring the single flat hex below* — the panel-side
 * quantizer produces the pattern. That is worth stating plainly,
 * because it was assumed to need a dither implementation on the
 * Satori side and it does not: pushed through castkit's real
 * `ditherToPanel` over a 96×96 flat field, every one of these
 * comes back an exact **50.0% / 50.0%** census of its two inks.
 *
 * Six inks + thirteen blends = **19 flat-fill colours**, against
 * the six the profile used to admit.
 *
 * **Fills and large areas only.** Never a 1px border, never small
 * text, never an icon — at that scale the checkerboard *is* the
 * artifact the six-ink restriction exists to prevent, which is why
 * `epaperColours` is still built from `SPECTRA_6` alone and a test
 * holds it there.
 *
 * Keys name the ink pair, not the colour, on purpose: `yellowRed`
 * makes no claim about looking orange, and the perceived column
 * below is a **computation, not a measurement** — a linear-light
 * mix of the two *emitted* inks. Nobody has photographed a panel
 * showing these. Treat it as the honest order of magnitude that
 * `#DB8225` is not.
 *
 * | blend | authored | perceived | black on it |
 * | --- | --- | --- | --- |
 * | `blackWhite` | `#686969` | `#757778` | 4.67 |
 * | `blackRed` | `#671213` | `#713235` | 2.21 |
 * | `blackBlue` | `#100F58` | `#2A2943` | 1.50 |
 * | `blackGreen` | `#0F5712` | `#284131` | 1.89 |
 * | `whiteYellow` | `#DCD97B` | `#BAB281` | 9.77 |
 * | `whiteRed` | `#CF7B7C` | `#9F8182` | 5.94 |
 * | `whiteBlue` | `#7878C1` | `#7C7E87` | 5.19 |
 * | `whiteGreen` | `#77C07B` | `#7B8681` | 5.57 |
 * | `yellowRed` | `#DB8225` | `#B89349` | 7.31 |
 * | `yellowGreen` | `#83C624` | `#9D9747` | 6.95 |
 * | `redBlue` | `#77216B` | `#794255` | 2.72 |
 * | `redGreen` | `#766925` | `#785249` | 3.10 |
 * | `blueGreen` | `#1E6669` | `#3C4D53` | 2.38 |
 *
 * Two blends are conspicuously absent. `blackYellow` and
 * `yellowBlue` are **not reachable** — see
 * {@link getIsReachableBlend}. The keys are missing rather than
 * present-and-wrong because a token that silently renders as a
 * different pair is worse than one that does not exist.
 *
 * Some of these are close together once emitted — `blackWhite` and
 * `whiteBlue` land about ΔE 5.5 apart on real ink. Recorded, not
 * gated, exactly as the contrast numbers are.
 */
export const spectra6Blends = {
  blackWhite: blend("black", "white"),
  blackRed: blend("black", "red"),
  blackBlue: blend("black", "blue"),
  blackGreen: blend("black", "green"),
  whiteYellow: blend("white", "yellow"),
  whiteRed: blend("white", "red"),
  whiteBlue: blend("white", "blue"),
  whiteGreen: blend("white", "green"),
  yellowRed: blend("yellow", "red"),
  yellowGreen: blend("yellow", "green"),
  redBlue: blend("red", "blue"),
  redGreen: blend("red", "green"),
  blueGreen: blend("blue", "green"),
} satisfies Record<string, string>

/**
 * The pHAT's one blend: 50% black on white, which is a grey the
 * panel has no ink for. Same rule — a fill, never a hairline.
 */
export const monoBlends = {
  blackWhite: getBlendValue({
    inkA: MONO.black,
    inkB: MONO.white,
  }),
} satisfies Record<string, string>

// ---------------------------------------------------------------
// The panel registry
// ---------------------------------------------------------------

/**
 * A panel whose pixels are one of a fixed ink set.
 *
 * Both fleet panels are this, and so is every E Ink Spectra part.
 */
export type EpaperFixedInkPanel = {
  family: "fixedInk"
  /** What a single pixel can be. */
  inks: Record<string, string>
  /**
   * What the ink emits — what the eye receives. Recorded so a
   * contrast judgement is made against the colour that exists,
   * rather than the one that was authored.
   */
  emittedInks: Record<string, string>
  /** Reachable 50% two-ink checkerboards. Fills only. */
  blends: Record<string, string>
  /** Is this panel actually deployed in the household fleet? */
  isInFleet: boolean
}

/**
 * A panel that renders a continuous-tone gamut rather than a fixed
 * ink set — E Ink Gallery 3's 4-particle ACeP, roughly 50,000
 * colours natively.
 *
 * It carries **no `inks` and no `blends`**, and that is the point.
 * Six hexes would be flatly wrong for it, and until M6g the profile
 * had no way to say so: `EpaperPalette` was a union of panel names
 * with a fixed-ink palette welded to each one, so the only way to
 * add Gallery 3 was to invent six colours for it — the exact
 * mistake M5b caught. The constraint on a continuous-tone panel is
 * tonal (slow refresh, low chroma ceiling, no true white), not
 * palettal, so it has nothing to enumerate.
 */
export type EpaperContinuousTonePanel = {
  family: "continuousTone"
  /** Order of magnitude, from E Ink's own material. */
  approximateColourCount: number
  isInFleet: boolean
}

export type EpaperPanel =
  | EpaperFixedInkPanel
  | EpaperContinuousTonePanel

/**
 * Every panel the profile knows, keyed by panel — not by palette,
 * because "how many colours" is a property of the panel *family*
 * and not every family has a palette.
 *
 * **Deliberately wider than `epaperColours`.** Only `fixedInk`
 * panels appear there, and a test holds that correspondence, so
 * nothing can quietly force a continuous-tone panel through a
 * six-hex set.
 *
 * `gallery3` is **not in the fleet** — it is a shopping-list item
 * in `home-displays/docs/ideas-epaper-wall-art.md`, Pimoroni does
 * not sell one, and the main DIY source is ruled out by the
 * avoid-Chinese-origin decision. It is listed anyway because
 * everything listed about it is sourced and nothing about it is
 * fabricated: a family and an order of magnitude. Should one land,
 * the work is a set of role colours, not a palette to guess at.
 */
export const epaperPanels: Record<
  EpaperPanelId,
  EpaperPanel
> = {
  spectra6: {
    family: "fixedInk",
    inks: SPECTRA_6,
    emittedInks: SPECTRA_6_EMITTED,
    blends: spectra6Blends,
    isInFleet: true,
  },
  mono: {
    family: "fixedInk",
    inks: MONO,
    // 1-bit and pure: the pHAT emits what it is asked for.
    emittedInks: MONO,
    blends: monoBlends,
    isInFleet: true,
  },
  gallery3: {
    family: "continuousTone",
    approximateColourCount: 50_000,
    isInFleet: false,
  },
}

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
