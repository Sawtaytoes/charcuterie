import { describe, expect, test } from "vitest"

import {
  clampToRange,
  fromFraction,
  roundToStepPrecision,
  snapToStep,
  toPercent,
} from "./sliderValue.ts"

describe("clampToRange", () => {
  test("it holds a value inside the range", () => {
    expect(clampToRange(5, 0, 10)).toBe(5)

    expect(clampToRange(-3, 0, 10)).toBe(0)

    expect(clampToRange(30, 0, 10)).toBe(10)
  })

  test("a reversed range still has two ends", () => {
    expect(clampToRange(5, 10, 0)).toBe(5)

    expect(clampToRange(-1, 10, 0)).toBe(0)
  })

  // A NaN reaching the style attribute renders `inline-size: NaN%`,
  // which paints nothing and reports nothing. An infinity is ordered,
  // so it clamps to the end it is nearest rather than to the floor.
  test("a NaN falls to the floor and an infinity clamps", () => {
    expect(clampToRange(Number.NaN, 4, 10)).toBe(4)

    expect(
      clampToRange(Number.POSITIVE_INFINITY, 4, 10),
    ).toBe(10)

    expect(
      clampToRange(Number.NEGATIVE_INFINITY, 4, 10),
    ).toBe(4)
  })
})

describe("snapToStep", () => {
  test("it lands on the nearest step", () => {
    expect(snapToStep(7, 0, 10, 5)).toBe(5)

    expect(snapToStep(8, 0, 10, 5)).toBe(10)
  })

  /**
   * The anchoring rule. Stepping a 7–19 range by 4 must be able to
   * reach 7 — anchored on zero its reachable values are 8, 12 and 16,
   * and neither end of its own range is one of them.
   */
  test("steps are anchored on min, not on zero", () => {
    expect(snapToStep(7, 7, 19, 4)).toBe(7)

    expect(snapToStep(10, 7, 19, 4)).toBe(11)

    expect(snapToStep(19, 7, 19, 4)).toBe(19)
  })

  test("a snap never escapes the range", () => {
    // 0–10 by 4: the nearest step to 10 is 12, which is not a value
    // this slider has.
    expect(snapToStep(10, 0, 10, 4)).toBe(10)
  })

  test("a zero or non-finite step means continuous", () => {
    expect(snapToStep(7.3, 0, 10, 0)).toBe(7.3)

    expect(snapToStep(7.3, 0, 10, Number.NaN)).toBe(7.3)

    expect(snapToStep(-2, 0, 10, 0)).toBe(0)
  })

  test("a float step does not accumulate drift", () => {
    // 0.1 * 3 is 0.30000000000000004 in IEEE 754, and that reaches
    // aria-valuenow and the visible value both.
    expect(snapToStep(0.3, 0, 1, 0.1)).toBe(0.3)

    expect(snapToStep(0.25, 0, 1, 0.1)).toBe(0.3)
  })
})

describe("roundToStepPrecision", () => {
  test("it rounds to the decimals the step declares", () => {
    expect(
      roundToStepPrecision(0.30000000000000004, 0.1),
    ).toBe(0.3)

    expect(roundToStepPrecision(2.5, 1)).toBe(3)
  })

  // "1e-7" has no visible decimal point, so counting characters after
  // a "." would report zero decimals and round it to an integer.
  test("an exponential step is left alone", () => {
    expect(roundToStepPrecision(0.00000012, 1e-7)).toBe(
      0.00000012,
    )
  })
})

describe("toPercent", () => {
  test("it maps the range onto 0-100", () => {
    expect(toPercent(0, 0, 200)).toBe(0)

    expect(toPercent(100, 0, 200)).toBe(50)

    expect(toPercent(200, 0, 200)).toBe(100)
  })

  test("an offset range starts at its own floor", () => {
    expect(toPercent(7, 7, 19)).toBe(0)

    expect(toPercent(19, 7, 19)).toBe(100)
  })

  // A single-valued slider is degenerate but legal, and it should paint
  // at the start rather than divide by zero and disappear.
  test("a zero-width range is 0 rather than NaN", () => {
    expect(toPercent(5, 5, 5)).toBe(0)
  })
})

describe("fromFraction", () => {
  test("it reads a position along the track", () => {
    expect(fromFraction(0, 0, 100, 1)).toBe(0)

    expect(fromFraction(0.5, 0, 100, 1)).toBe(50)

    expect(fromFraction(1, 0, 100, 1)).toBe(100)
  })

  test("a pointer past either end is still in range", () => {
    expect(fromFraction(-0.4, 0, 100, 1)).toBe(0)

    expect(fromFraction(1.8, 0, 100, 1)).toBe(100)
  })

  /**
   * `getBoundingClientRect()` is physical and knows nothing about
   * writing direction, so without this a right-to-left slider runs
   * backwards under the pointer while its keyboard path is correct.
   */
  test("right-to-left inverts the track", () => {
    expect(fromFraction(0, 0, 100, 1, true)).toBe(100)

    expect(fromFraction(0.25, 0, 100, 1, true)).toBe(75)

    expect(fromFraction(1, 0, 100, 1, true)).toBe(0)
  })

  test("it snaps to the step like everything else", () => {
    expect(fromFraction(0.44, 0, 10, 5)).toBe(5)
  })
})
