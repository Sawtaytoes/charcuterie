import { describe, expect, test } from "vitest"

import {
  firstPaintAxesScript,
  pickAxes,
  THEME_AXES,
} from "./themeAxes.ts"

describe("pickAxes", () => {
  test("returns axes in canonical order, ignoring requested order", () => {
    // Asked scheme-first; must still come back density → scheme.
    const picked = pickAxes(["scheme", "density"])

    expect(picked.map((axis) => axis.global)).toEqual([
      "density",
      "scheme",
    ])
  })

  test("drops axes an app does not want", () => {
    expect(
      pickAxes(["density"]).map((axis) => axis.global),
    ).toEqual(["density"])
  })

  test("covers all three when asked", () => {
    expect(
      pickAxes(["density", "variant", "scheme"]),
    ).toHaveLength(3)
  })
})

describe("firstPaintAxesScript", () => {
  test("stamps every axis at its initial value", () => {
    const script = firstPaintAxesScript()

    expect(script).toContain(
      'document.documentElement.setAttribute("data-scheme","dark")',
    )
    expect(script).toContain(
      'document.documentElement.setAttribute("data-density","comfortable")',
    )
    expect(script).toContain(
      'document.documentElement.setAttribute("data-variant","daylight")',
    )
  })

  test("emits only the axes it is handed", () => {
    const script = firstPaintAxesScript(
      pickAxes(["density", "scheme"]),
    )

    expect(script).not.toContain("data-variant")
    expect(script.split(";")).toHaveLength(2)
  })

  test("defaults to the full table", () => {
    expect(firstPaintAxesScript().split(";")).toHaveLength(
      THEME_AXES.length,
    )
  })
})
