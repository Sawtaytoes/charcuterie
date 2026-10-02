import { createChartScene } from "@tanstack/charts"
import { describe, expect, test } from "vitest"
import { renderChartSvg as renderPortableSvg } from "../core/chart.ts"
import { createInteractiveChartDefinition } from "./browser.ts"
import { createChartDefinition } from "./definition.ts"
import { renderChartSvg } from "./index.ts"

const options = {
  title: "Daily points",
  labels: ["Mon", "Tue", "Wed"],
  series: [
    { id: "tasks", label: "Tasks", values: [100, 0, null] },
    { id: "bonus", label: "Bonus", values: [10, 0, null] },
    {
      id: "penalty",
      label: "Penalty",
      values: [-50, 0, null],
    },
    {
      id: "reversal",
      label: "Reversal",
      values: [-10, 0, null],
    },
  ],
  barLayout: "stacked" as const,
}
describe("TanStack chart facade", () => {
  test("stacks positive and negative contributions independently while preserving original values", () => {
    const scene = createChartScene(
      createChartDefinition(options),
      { width: 640, height: 240 },
    )
    expect(
      scene.points.map((point) => point.datum),
    ).toEqual([
      {
        index: 0,
        value: 100,
        bottom: 0,
        top: 100,
        seriesId: "tasks",
        color: "currentColor",
      },
      {
        index: 1,
        value: 0,
        bottom: 0,
        top: 0,
        seriesId: "tasks",
        color: "currentColor",
      },
      {
        index: 0,
        value: 10,
        bottom: 100,
        top: 110,
        seriesId: "bonus",
        color: "currentColor",
      },
      {
        index: 1,
        value: 0,
        bottom: 0,
        top: 0,
        seriesId: "bonus",
        color: "currentColor",
      },
      {
        index: 0,
        value: -50,
        bottom: 0,
        top: -50,
        seriesId: "penalty",
        color: "currentColor",
      },
      {
        index: 1,
        value: 0,
        bottom: 0,
        top: 0,
        seriesId: "penalty",
        color: "currentColor",
      },
      {
        index: 0,
        value: -10,
        bottom: -50,
        top: -60,
        seriesId: "reversal",
        color: "currentColor",
      },
      {
        index: 1,
        value: 0,
        bottom: 0,
        top: 0,
        seriesId: "reversal",
        color: "currentColor",
      },
    ])
    expect(scene.scales.y.domain[0]).toBeLessThanOrEqual(
      -60,
    )
    expect(
      scene.scales.y.domain.at(-1),
    ).toBeGreaterThanOrEqual(110)
    expect(renderPortableSvg(options)).not.toMatch(
      /NaN|Infinity/,
    )
  })
  test("a shared day tooltip reports original amounts and unavailable samples", () => {
    const definition =
      createInteractiveChartDefinition(options)
    const content =
      typeof definition.tooltip === "object" &&
      "content" in definition.tooltip
        ? definition.tooltip.content
        : undefined
    expect(typeof content).toBe("function")
    if (typeof content !== "function")
      throw new Error("Tooltip missing")
    const scene = createChartScene(
      createChartDefinition(options),
      { width: 640, height: 240 },
    )
    const point = scene.points[2]
    expect(
      content([point], {
        pinned: false,
        xLabel: "",
        yLabel: "",
        formatX: String,
        formatY: String,
      }),
    ).toEqual({
      title: "Mon",
      rows: [
        { label: "Tasks", value: "100", color: undefined },
        { label: "Bonus", value: "10", color: undefined },
        {
          label: "Penalty",
          value: "-50",
          color: undefined,
        },
        {
          label: "Reversal",
          value: "-10",
          color: undefined,
        },
      ],
    })
  })
  test("standalone SVG escapes text, rejects external paints, and has image dimensions", () => {
    const svg = renderChartSvg({
      title: '<script>"&',
      labels: ["<img>"],
      series: [
        {
          id: "a",
          label: "<iframe>",
          values: [10],
          color: "url(https://example.com)",
        },
      ],
    })
    expect(svg).not.toMatch(
      /<script>|<img>|https:\/\/example.com/,
    )
    expect(svg).toContain("&lt;script&gt;")
    expect(svg).toContain(
      'xmlns="http://www.w3.org/2000/svg"',
    )
    expect(svg).toContain('width="640" height="240"')
  })
  test("empty, missing, constant, negative, fractional, and malformed data stays finite", () => {
    for (const values of [
      [],
      [null],
      [NaN, Infinity],
      [0, 0],
      [-50, -50],
      [0.1, 0.1],
    ]) {
      expect(
        renderChartSvg({
          title: "Chart",
          labels: ["A", "B"],
          width: NaN,
          height: -1,
          series: [{ id: "a", label: "A", values }],
        }),
      ).not.toMatch(/NaN|Infinity/)
    }
  })
  test("lines preserve gaps rather than connecting through unavailable samples", () => {
    const svg = renderChartSvg({
      title: "History",
      labels: ["1", "2", "3", "4", "5"],
      kind: "line",
      series: [
        { id: "a", label: "A", values: [1, 2, null, 3, 4] },
      ],
    })
    expect(
      svg.match(/<path /g)?.length,
    ).toBeGreaterThanOrEqual(2)
    expect(svg).not.toMatch(/NaN|Infinity/)
  })
})
