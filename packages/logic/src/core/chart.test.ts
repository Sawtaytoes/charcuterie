import { describe, expect, test } from "vitest"
import { renderChartSvg } from "./chart.ts"

describe("portable charts", () => {
  test("compact trends omit axes and dense dots while preserving gaps and isolated observations", () => {
    const svg = renderChartSvg({
      title: "Power history",
      description: "Watts",
      isSparkline: true,
      kind: "line",
      width: 200,
      height: 24,
      labels: ["1", "2", "3", "4", "5", "6"],
      series: [
        {
          id: "power",
          label: "Power",
          values: [10, 20, null, -5, null, 0],
        },
      ],
    })
    expect(svg).toContain('viewBox="0 0 200 24"')
    expect(svg).toContain('preserveAspectRatio="none"')
    expect(svg).toContain('aria-label="Power history"')
    expect(svg).toContain("<desc>Watts</desc>")
    expect(svg).not.toContain("<text ")
    expect(svg).not.toContain("<line ")
    expect(svg.match(/<polyline /g)).toHaveLength(1)
    expect(svg.match(/<circle /g)).toHaveLength(2)
    expect(svg).toContain("Power, 4: -5")
    expect(svg).toContain("Power, 6: 0")
    expect(svg).not.toMatch(/NaN|Infinity/)
  })
  test.each(
    [[], [null], [0], [-10], [10, 10]].map((values) => ({
      values,
    })),
  )(
    "compact constant and empty data stay finite: $values",
    ({ values }) => {
      const svg = renderChartSvg({
        title: "Trend",
        isSparkline: true,
        kind: "line",
        width: 0,
        height: -1,
        labels: ["a", "b"],
        series: [{ id: "a", label: "A", values }],
      })
      expect(svg).toContain('viewBox="0 0 32 16"')
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(svg).not.toContain("<text ")
      if (values.length === 1 && values[0] !== null)
        expect(svg).toContain("<circle ")
    },
  )
  test("compact bar previews preserve positive and negative contributions", () => {
    const svg = renderChartSvg({
      title: "Net",
      isSparkline: true,
      width: 80,
      height: 24,
      labels: ["a", "b", "c"],
      series: [
        { id: "a", label: "A", values: [10, -10, null] },
      ],
    })
    expect(svg.match(/<rect /g)).toHaveLength(2)
    expect(svg).toContain("A, b: -10")
    expect(svg).not.toMatch(/NaN|Infinity/)
  })
  test("keeps negative bars below the zero baseline and does not invent missing samples", () => {
    const svg = renderChartSvg({
      title: "Net",
      labels: ["Mon", "Tue", "Wed"],
      series: [
        {
          id: "net",
          label: "Net",
          values: [10, -10, null],
        },
      ],
    })
    expect(svg.match(/<rect /g)).toHaveLength(2)
    expect(svg).toContain("Mon: 10")
    expect(svg).toContain("Tue: -10")
    expect(svg).not.toMatch(/NaN|Infinity/)
  })
  test("breaks a line across missing data and keeps isolated points visible", () => {
    const svg = renderChartSvg({
      title: "History",
      kind: "line",
      labels: ["1", "2", "3", "4", "5"],
      series: [
        { id: "a", label: "A", values: [1, 2, null, 3, 4] },
      ],
    })
    expect(svg.match(/<polyline /g)).toHaveLength(2)
    expect(svg.match(/<circle /g)).toHaveLength(4)
  })
  test("escapes producer text and rejects colors that reference external resources", () => {
    const svg = renderChartSvg({
      title: '<script>"&',
      labels: ["<img>"],
      series: [
        {
          id: "a",
          label: "<iframe>",
          color: "url(https://example.com)",
          values: [0],
        },
      ],
    })
    expect(svg).not.toContain("<script>")
    expect(svg).not.toContain("<img>")
    expect(svg).not.toContain("https://example.com")
    expect(svg).toContain("&lt;script&gt;")
  })
  test("preserves configured hex, CSS token, and functional series colors", () => {
    for (const color of [
      "#A6D96A",
      "var(--color-intent-danger-solid)",
      "rgba(10, 20, 30, 0.5)",
      "currentColor",
    ]) {
      const svg = renderChartSvg({
        title: "Colors",
        labels: ["Day"],
        series: [
          {
            id: "series",
            label: "Series",
            color,
            values: [10],
          },
        ],
      })
      expect(svg).toContain(`fill="${color}"`)
    }
  })
  test("renders empty, constant, and malformed dimensions without invalid geometry", () => {
    for (const values of [
      [],
      [0],
      [null],
      [Number.NaN],
      [500, 500],
    ]) {
      const svg = renderChartSvg({
        title: "Chart",
        labels: ["a", "b"],
        width: Number.NaN,
        height: -1,
        series: [{ id: "a", label: "A", values }],
      })
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(svg).toContain('viewBox="0 0 640 120"')
    }
  })
})
