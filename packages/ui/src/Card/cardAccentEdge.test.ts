import { describe, expect, test } from "vitest"

import {
  ACCENT_EDGE_BASE_CLASS,
  ACCENT_EDGE_CATEGORICAL_CLASS,
  ACCENT_EDGE_COLOR_CLASS,
  ACCENT_EDGE_COLOR_PROPERTY,
  getAccentEdgeClassName,
  getAccentEdgeStyle,
} from "./cardAccentEdge.ts"

describe("getAccentEdgeClassName", () => {
  test("reads a categorical index off the ten-wide family", () => {
    const className = getAccentEdgeClassName({
      categorical: 3,
    })

    expect(className).toContain(ACCENT_EDGE_BASE_CLASS)
    expect(className).toContain(
      ACCENT_EDGE_CATEGORICAL_CLASS[3],
    )
  })

  test("threads an app's own colour through one literal", () => {
    const className = getAccentEdgeClassName({
      color: "hsl(210 55% 52%)",
    })

    expect(className).toContain(ACCENT_EDGE_BASE_CLASS)
    expect(className).toContain(ACCENT_EDGE_COLOR_CLASS)
  })

  /**
   * The bar overlays the whole card, links and buttons included, so
   * this is the difference between a card you can click and one you
   * cannot.
   */
  test("never eats a pointer", () => {
    expect(
      getAccentEdgeClassName({ categorical: 1 }),
    ).toContain("before:pointer-events-none")
  })

  /**
   * The card already has a radius; the bar must not restate it.
   * `inherit` is what makes one component work on `rounded-lg`,
   * `rounded-xl` and whatever an app overrides it to.
   */
  test("takes the card's own radius rather than naming one", () => {
    expect(
      getAccentEdgeClassName({ categorical: 1 }),
    ).toContain("before:rounded-[inherit]")
  })

  /**
   * `box-shadow` has no logical form. Without the `rtl:` twin the
   * bar sits on the left of an Arabic page, which is the trailing
   * edge there.
   */
  test("carries the bar to the other side under rtl", () => {
    for (const className of [
      ...Object.values(ACCENT_EDGE_CATEGORICAL_CLASS),
      ACCENT_EDGE_COLOR_CLASS,
    ]) {
      expect(className).toContain("rtl:before:shadow-")
      expect(className).toContain("inset_-3px")
    }
  })

  /**
   * Tailwind scans source text for COMPLETE class strings, so an
   * interpolated index generates nothing, paints nothing and
   * reports nothing. This is the cheap half of that guarantee;
   * `tailwindCandidates.test.ts` is the half that compiles them.
   */
  test("names every categorical index in full", () => {
    for (const [index, className] of Object.entries(
      ACCENT_EDGE_CATEGORICAL_CLASS,
    )) {
      expect(className).toContain(
        `var(--color-categorical-${index}-solid)`,
      )
    }
  })
})

describe("getAccentEdgeStyle", () => {
  test("writes one custom property for an app's own colour", () => {
    expect(
      getAccentEdgeStyle({ color: "hsl(210 55% 52%)" }),
    ).toStrictEqual({
      [ACCENT_EDGE_COLOR_PROPERTY]: "hsl(210 55% 52%)",
    })
  })

  /**
   * `undefined`, not `{}`, so a categorical card renders no `style`
   * attribute at all.
   */
  test("writes nothing when the colour came from an index", () => {
    expect(
      getAccentEdgeStyle({ categorical: 7 }),
    ).toBeUndefined()
  })
})
