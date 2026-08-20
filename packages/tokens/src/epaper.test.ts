/**
 * ePaper is a profile, not a scheme and not a variant, because it
 * *removes* capabilities rather than restyling them. These tests
 * pin the removals — the ones a future variant author would
 * otherwise reintroduce by copying a normal scheme.
 */

import { describe, expect, test } from "vitest"

import { CATEGORICAL_INDEXES } from "./categorical.ts"
import { INTENT_NAMES } from "./contrastAudit.ts"
import type {
  EpaperFixedInkPanel,
  EpaperPalette,
  EpaperPanelId,
} from "./epaper.ts"
import {
  epaperColours,
  epaperMotion,
  epaperPanels,
  getIsReachableBlend,
  listReachableBlendPairs,
  monoBlends,
  spectra6Blends,
} from "./epaper.ts"

const PALETTES: EpaperPalette[] = ["spectra6", "mono"]

/**
 * What each panel's quantizer maps 1:1 — the six inks a single
 * *pixel* can be, which is not the same thing as what the panel can
 * show. Blends are held to a separate bar further down.
 *
 * Per palette, because a Spectra 6 panel's "white" is `#D0D2D2` —
 * the 0.5 blend of Pimoroni's vivid and device-real palettes, which
 * is what the fleet renders at — while the 1-bit pHAT's really is
 * `#FFFFFF`.
 *
 * **These literals are the point of this file.** The source used to
 * hold them too, and both copies were invented, so the test passed
 * for a whole milestone against six hexes nobody had measured.
 * `epaper.ts` now *derives* its inks from Pimoroni's two palettes;
 * keeping the expected values written out here by hand is what
 * makes this an independent check rather than a restatement.
 */
const RENDERABLE_HEXES: Record<
  EpaperPalette,
  Set<string>
> = {
  spectra6: new Set([
    "#000000",
    "#D0D2D2",
    "#CE2426",
    "#E8DF24",
    "#1F1EAF",
    "#1DAD23",
  ]),
  mono: new Set(["#000000", "#FFFFFF"]),
}

const getFixedInkPanel = (panelId: EpaperPalette) => {
  const panel = epaperPanels[panelId]

  // Narrowing, not an assertion about the fleet — the
  // correspondence itself is gated in its own test below.
  if (panel.family !== "fixedInk") {
    throw new Error(`${panelId} is not a fixed-ink panel`)
  }

  return panel satisfies EpaperFixedInkPanel
}

const listSwatches = (palette: EpaperPalette) => {
  const colour = epaperColours[palette]

  return [
    ...Object.values(colour.surface),
    ...Object.values(colour.content),
    ...Object.values(colour.border),
    ...INTENT_NAMES.flatMap((name) =>
      Object.values(colour.intent[name]),
    ),
    // The categorical family is held to the same bar, and it is the
    // family most likely to arrive with a hue this panel has never
    // heard of — it is generated in OKLCh against an sRGB gamut,
    // and ePaper has neither.
    ...CATEGORICAL_INDEXES.flatMap((index) =>
      Object.values(colour.categorical[index]),
    ),
    colour.focus.ring,
    colour.focus.ringOffset,
  ]
}

describe.each(PALETTES)("%s", (palette) => {
  test("derives its inks, and they are the measured ones", () => {
    // The source computes these from Pimoroni's vivid and emitted
    // palettes at the fleet's 0.5 saturation. If that arithmetic
    // ever drifts, this is what catches it — the literals here
    // were typed from `castkit`'s palette by hand.
    expect(
      new Set(
        Object.values(getFixedInkPanel(palette).inks),
      ),
    ).toEqual(RENDERABLE_HEXES[palette])
  })

  test("keeps role colours on the six inks, never a blend", () => {
    // The blend tier is for **fills**. Every role listed here is
    // or can be small geometry — a border, a focus ring, text —
    // and a checkerboard at that scale is the smeared grey line
    // the restriction exists to prevent. This is the gate that
    // stops the wider palette leaking into the narrow places.
    for (const swatch of listSwatches(palette)) {
      expect(RENDERABLE_HEXES[palette]).toContain(swatch)
    }
  })

  test("has no elevation", () => {
    expect(
      Object.values(epaperColours[palette].elevation),
    ).toEqual(["none", "none", "none", "none"])
  })

  test("hover is indistinguishable from rest", () => {
    // There is no pointer on these panels. A hover state that
    // differs is a repaint that will never be triggered.
    const { intent } = epaperColours[palette]

    for (const name of INTENT_NAMES) {
      expect(intent[name].surfaceHover).toBe(
        intent[name].surface,
      )

      expect(intent[name].solidHover).toBe(
        intent[name].solid,
      )
    }
  })
})

test("mono collapses every intent to black", () => {
  const { intent } = epaperColours.mono

  for (const name of INTENT_NAMES) {
    expect(intent[name].solid).toBe("#000000")
    expect(intent[name].content).toBe("#000000")
    expect(intent[name].border).toBe("#000000")
  }
})

test("every categorical index collapses to one ink, on both panels", () => {
  // Deliberate, and the opposite of what the sibling test asks of
  // the intents. Spectra 6 has four chromatic inks; ten indexes
  // spread round-robin across them would make index 1 and index 6
  // *identical*, and a reader would trust a colour that is lying.
  // Uniform black is the honest answer — on ePaper a categorical
  // badge is told apart by its label, the same trade
  // `content.secondary` already makes on these panels.
  for (const palette of PALETTES) {
    const { categorical } = epaperColours[palette]

    const inks = new Set(
      CATEGORICAL_INDEXES.flatMap((index) => [
        categorical[index].solid,
        categorical[index].content,
        categorical[index].border,
      ]),
    )

    expect([...inks]).toEqual(["#000000"])
  }
})

test("spectra6 keeps intents distinguishable", () => {
  const { intent } = epaperColours.spectra6

  const solids = new Set(
    INTENT_NAMES.map((name) => intent[name].solid),
  )

  // info and accent share blue; the rest are distinct. Five
  // distinct fills out of six intents is the most the panel
  // affords, and collapsing further would make success and
  // danger the same shape and the same colour.
  expect(solids.size).toBe(5)
})

test("yellow never carries text", () => {
  // Yellow on paper measures 1.33 against the emitted ink, so
  // warning says its piece in black and uses yellow only as a fill
  // it can put black on top of — 11.14, the best pair the panel
  // has.
  const warning = epaperColours.spectra6.intent.warning

  expect(warning.solid).toBe("#E8DF24")
  expect(warning.content).toBe("#000000")
  expect(warning.onSolid).toBe("#000000")
})

describe("the blend tier", () => {
  test("spectra6 ships every reachable pair and only those", () => {
    // 15 ink pairs exist; 13 are reachable. Deriving the list and
    // comparing it to the hand-written keys is what keeps the two
    // honest — the keys are greppable, the values are computed,
    // and neither is allowed to invent a colour.
    expect(
      listReachableBlendPairs(
        getFixedInkPanel("spectra6").inks,
      ).map(([inkA, inkB]) => `${inkA}+${inkB}`),
    ).toEqual([
      "black+white",
      "black+red",
      "black+blue",
      "black+green",
      "white+yellow",
      "white+red",
      "white+blue",
      "white+green",
      "yellow+red",
      "yellow+green",
      "red+blue",
      "red+green",
      "blue+green",
    ])

    expect(Object.keys(spectra6Blends)).toHaveLength(13)
  })

  test("blackYellow and yellowBlue are absent, not wrong", () => {
    // Both are unreachable: a third ink sits between them, so the
    // authored midpoint quantizes to a different pair entirely.
    // Shipping them would ship a token that renders as something
    // else, which is worse than not shipping it.
    const { inks } = getFixedInkPanel("spectra6")

    expect(
      getIsReachableBlend({
        inks,
        inkNames: ["black", "yellow"],
      }),
    ).toBe(false)

    expect(
      getIsReachableBlend({
        inks,
        inkNames: ["yellow", "blue"],
      }),
    ).toBe(false)

    expect(spectra6Blends).not.toHaveProperty("blackYellow")

    expect(spectra6Blends).not.toHaveProperty("yellowBlue")
  })

  test("every blend is the midpoint of its two inks", () => {
    // Authoring the encoded midpoint is *how* the checkerboard is
    // reached — error diffusion splits it 50/50 between the two
    // nearest inks. Measured through castkit's real
    // `ditherToPanel`: 50.0% / 50.0%, every pair.
    expect(spectra6Blends.yellowRed).toBe("#DB8225")
    expect(spectra6Blends.blueGreen).toBe("#1E6669")
    expect(spectra6Blends.whiteYellow).toBe("#DCD97B")
    expect(monoBlends.blackWhite).toBe("#808080")
  })

  test("no blend is reachable twice under another name", () => {
    expect(
      new Set(Object.values(spectra6Blends)).size,
    ).toBe(Object.keys(spectra6Blends).length)
  })

  test("blends widen spectra6 from six colours to nineteen", () => {
    // The headline number, and the reason any of this changed:
    // six is what one *pixel* can be, not what the panel can show.
    const panel = getFixedInkPanel("spectra6")

    expect(
      Object.keys(panel.inks).length +
        Object.keys(panel.blends).length,
    ).toBe(19)
  })
})

describe("panel families", () => {
  test("every fixed-ink panel has role colours, and only those do", () => {
    // The gate that keeps a continuous-tone panel out of a
    // six-hex set. `epaperColours` may only be keyed by panels
    // whose colour constraint is actually a palette.
    const fixedInkPanelIds = (
      Object.keys(epaperPanels) as EpaperPanelId[]
    ).filter(
      (panelId) =>
        epaperPanels[panelId].family === "fixedInk",
    )

    expect(Object.keys(epaperColours).sort()).toEqual(
      fixedInkPanelIds.sort(),
    )
  })

  test("gallery3 is continuous tone, so it has no palette to get wrong", () => {
    // Not in the fleet, and the only facts recorded about it are
    // sourced ones. A six-hex entry would have been fabricated,
    // which is exactly the failure this profile already had once.
    const gallery3 = epaperPanels.gallery3

    expect(gallery3.family).toBe("continuousTone")
    expect(gallery3).not.toHaveProperty("inks")
    expect(gallery3).not.toHaveProperty("blends")
    expect(gallery3.isInFleet).toBe(false)
  })

  test("both fleet panels say they are in the fleet", () => {
    expect(epaperPanels.spectra6.isInFleet).toBe(true)
    expect(epaperPanels.mono.isInFleet).toBe(true)
  })
})

test("there is no motion at all", () => {
  // Whole-second refreshes. Every duration is zero, and that is a
  // hard fact about the hardware rather than a preference.
  expect(Object.values(epaperMotion.duration)).toEqual([
    "0ms",
    "0ms",
    "0ms",
    "0ms",
    "0ms",
    "0ms",
  ])

  expect(Object.values(epaperMotion.easing)).toEqual([
    "linear",
    "linear",
    "linear",
    "linear",
  ])
})

test.each(PALETTES)(
  "%s carries every content role in black on the paper",
  (palette) => {
    // Black on the paper is the one pair that clears AA on both
    // panels — 8.37 against Spectra 6's emitted ink, 21 on the
    // 1-bit pHAT. Asserting it is what catches somebody
    // "improving" secondary content to grey on a panel that has
    // no grey.
    const { content, surface } = epaperColours[palette]

    for (const role of [
      "primary",
      "secondary",
      "muted",
    ] as const) {
      expect(content[role]).toBe("#000000")
    }

    expect(surface.base).toBe(
      palette === "mono" ? "#FFFFFF" : "#D0D2D2",
    )
  },
)
