/**
 * The conversions the categorical family is generated with.
 *
 * These matter more than a colour-space test usually would,
 * because nothing downstream can tell a wrong one from a
 * deliberate design choice: a hue-shifting gamut map produces a
 * palette that passes every contrast gate, passes the distinctness
 * gate, and is simply not the ring anybody specified.
 */

import { expect, test } from "vitest"

import {
  getColourDistance,
  toGamut,
  toHex,
  toOkLab,
} from "./colourSpace.ts"
import { getContrastRatio } from "./contrast.ts"

test("the sRGB primaries round-trip through OKLab", () => {
  for (const hex of [
    "#000000",
    "#FFFFFF",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#131822",
    "#5A54E8",
  ]) {
    const { a, b, lightness } = toOkLab(hex)

    const hue =
      ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360

    expect(
      toHex({ chroma: Math.hypot(a, b), hue, lightness }),
    ).toBe(hex)
  }
})

test("black and white are the ends of the lightness axis", () => {
  expect(toOkLab("#000000").lightness).toBeCloseTo(0, 6)

  expect(toOkLab("#FFFFFF").lightness).toBeCloseTo(1, 6)
})

test("a grey has no chroma", () => {
  const { a, b } = toOkLab("#808080")

  expect(Math.hypot(a, b)).toBeLessThan(0.001)
})

test("gamut mapping gives up chroma, never hue or lightness", () => {
  // The whole reason `toGamut` is a chroma search rather than a
  // per-channel clip. A clip shifts hue, and a hue shift means two
  // indexes specified 36° apart arrive on screen 20° apart — with
  // the distinctness gate measuring the shifted pair and reporting
  // it as the specified one.
  const asked = { chroma: 0.4, hue: 145, lightness: 0.55 }

  const mapped = toGamut(asked)

  expect(mapped.hue).toBe(asked.hue)

  expect(mapped.lightness).toBe(asked.lightness)

  expect(mapped.chroma).toBeLessThan(asked.chroma)

  const { a, b } = toOkLab(toHex(asked))

  expect(
    ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  ).toBeCloseTo(asked.hue, 0)
})

test("a colour already inside the gamut is left alone", () => {
  const inside = { chroma: 0.05, hue: 145, lightness: 0.55 }

  expect(toGamut(inside)).toEqual(inside)
})

test("lightness moves contrast monotonically, which is what the solver assumes", () => {
  // `solveLightness` walks in one direction and stops at the first
  // value that clears its threshold. That is only correct if
  // contrast against a fixed background is monotonic in lightness
  // on the side being walked.
  let previous = 0

  for (
    let lightness = 0.2;
    lightness <= 0.95;
    lightness += 0.05
  ) {
    const ratio = getContrastRatio(
      toHex({ chroma: 0.1, hue: 250, lightness }),
      "#000000",
    )

    expect(ratio).toBeGreaterThan(previous)

    previous = ratio
  }
})

test("distance is zero for a colour against itself and 1.0 black to white", () => {
  expect(getColourDistance("#5A54E8", "#5A54E8")).toBe(0)

  expect(
    getColourDistance("#000000", "#FFFFFF"),
  ).toBeCloseTo(1, 2)
})

test("distance is symmetric", () => {
  expect(
    getColourDistance("#F97676", "#87B73A"),
  ).toBeCloseTo(getColourDistance("#87B73A", "#F97676"), 10)
})

test("a just-noticeable step is around 0.02", () => {
  // The scale every floor in `categorical.ts` is quoted against, so
  // it is pinned rather than remembered. Two mid greys one 8-bit
  // code apart are nowhere near noticeable; the pair below is
  // roughly where it starts.
  expect(
    getColourDistance("#808080", "#818181"),
  ).toBeLessThan(0.005)

  expect(
    getColourDistance("#808080", "#888888"),
  ).toBeGreaterThan(0.015)
})

test("non-hex input is refused rather than guessed at", () => {
  expect(() => toOkLab("rgb(1 2 3)")).toThrow(/6-digit hex/)
})
