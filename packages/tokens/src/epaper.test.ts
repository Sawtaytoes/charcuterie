/**
 * ePaper is a profile, not a scheme and not a variant, because it
 * *removes* capabilities rather than restyling them. These tests
 * pin the removals — the ones a future variant author would
 * otherwise reintroduce by copying a normal scheme.
 */

import { describe, expect, test } from "vitest"

import { INTENT_NAMES } from "./contrastAudit.ts"
import type { EpaperPalette } from "./epaper.ts"
import { epaperColours, epaperMotion } from "./epaper.ts"

const PALETTES: EpaperPalette[] = ["spectra6", "mono"]

/** What an E Ink Spectra 6 panel can physically render. */
const SPECTRA_6_HEXES = new Set([
  "#000000",
  "#FFFFFF",
  "#D02F2A",
  "#E8C11C",
  "#2B4C9B",
  "#2E7D46",
])

const listSwatches = (palette: EpaperPalette) => {
  const colour = epaperColours[palette]

  return [
    ...Object.values(colour.surface),
    ...Object.values(colour.content),
    ...Object.values(colour.border),
    ...INTENT_NAMES.flatMap((name) =>
      Object.values(colour.intent[name]),
    ),
    colour.focus.ring,
    colour.focus.ringOffset,
  ]
}

describe.each(PALETTES)("%s", (palette) => {
  test("uses only colours the panel can render", () => {
    // Anything else dithers, and dithering a 1px border is how
    // you get a smeared grey line instead of a line.
    for (const swatch of listSwatches(palette)) {
      expect(SPECTRA_6_HEXES).toContain(swatch)
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
  // Yellow on white is unreadable at any size, so warning says
  // its piece in black and uses yellow only as a fill it can put
  // black on top of.
  const warning = epaperColours.spectra6.intent.warning

  expect(warning.solid).toBe("#E8C11C")
  expect(warning.content).toBe("#000000")
  expect(warning.onSolid).toBe("#000000")
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

test("primary content clears AA against the paper", () => {
  // Black on white, so this is 21:1 — but asserting it here is
  // what catches somebody "improving" secondary content to grey
  // on a panel that has no grey.
  const { content, surface } = epaperColours.spectra6

  for (const role of [
    "primary",
    "secondary",
    "muted",
  ] as const) {
    expect(content[role]).toBe("#000000")
    expect(surface.base).toBe("#FFFFFF")
  }
})
