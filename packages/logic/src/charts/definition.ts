import {
  barY,
  defineChart,
  group,
  lineY,
  type StaticChartDefinition,
} from "@tanstack/charts"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import {
  type ChartOptions,
  safeChartColor,
} from "../core/chart.ts"

/** Original values remain separate from stacked coordinates, including missing samples. */
export type ChartDatum = {
  index: number
  value: number | null
  bottom: number
  top: number | null
  seriesId: string
  color: string
}

/** Sanitize dimensions once for browser and standalone exports. */
export const chartDimensions = ({
  width = 640,
  height = 240,
}: ChartOptions) => ({
  width: Number.isFinite(width)
    ? Math.max(180, Math.min(4096, width))
    : 640,
  height: Number.isFinite(height)
    ? Math.max(120, Math.min(2160, height))
    : 240,
})

/** Build renderer-neutral marks; no framework, DOM, or report calculations. */
export const createChartDefinition = (
  options: ChartOptions,
): StaticChartDefinition<ChartDatum, number, number> => {
  const {
    labels,
    series,
    kind = "bar",
    barLayout = "grouped",
  } = options
  const rows = series.map((entry, seriesIndex) =>
    labels.map((_, index): ChartDatum => {
      const sample = entry.values[index]
      const value =
        typeof sample === "number" &&
        Number.isFinite(sample)
          ? sample
          : null
      const bottom =
        barLayout === "stacked" &&
        (entry.kind ?? kind) === "bar" &&
        value !== null
          ? series
              .slice(0, seriesIndex)
              .reduce((sum, preceding) => {
                const amount = preceding.values[index]
                return (preceding.kind ?? kind) === "bar" &&
                  typeof amount === "number" &&
                  Number.isFinite(amount) &&
                  amount >= 0 === value >= 0
                  ? sum + amount
                  : sum
              }, 0)
          : 0
      return {
        index,
        value,
        bottom,
        top: value === null ? null : bottom + value,
        seriesId: entry.id,
        color: safeChartColor(entry.color),
      }
    }),
  )
  const bars = rows.flatMap((entry, index) =>
    (series[index].kind ?? kind) === "bar"
      ? entry.filter((row) => row.value !== null)
      : [],
  )
  const marks = [
    ...(bars.length > 0
      ? [
          barY(bars, {
            id: "bars",
            key: (row) => `${row.seriesId}:${row.index}`,
            x: "index",
            y1: "bottom",
            y2: "top",
            z: "seriesId",
            fill: (row) => row.color,
            inset: 1,
            ...(barLayout === "grouped"
              ? { layout: group({ padding: 0.1 }) }
              : {}),
          }),
        ]
      : []),
    ...rows.flatMap((entry, index) =>
      (series[index].kind ?? kind) === "line"
        ? [
            lineY(entry, {
              id: series[index].id,
              key: "index",
              x: "index",
              y: "value",
              stroke: safeChartColor(series[index].color),
              strokeWidth: 2.5,
              strokeDasharray:
                index % 3 === 0
                  ? ""
                  : index % 3 === 1
                    ? "6 3"
                    : "2 3",
              points: true,
            }),
          ]
        : [],
    ),
  ]
  const extent = rows
    .flat()
    .flatMap((row) =>
      row.top === null ? [] : [row.bottom, row.top],
    )
  const domain = [
    extent.reduce(
      (lowest, value) => Math.min(lowest, value),
      0,
    ),
    extent.reduce(
      (highest, value) => Math.max(highest, value),
      1,
    ),
  ]
  const fontSize =
    typeof options.fontSize === "number" &&
    Number.isFinite(options.fontSize)
      ? Math.max(11, Math.min(32, options.fontSize))
      : 11
  const { width } = chartDimensions(options)
  const stride = Math.max(
    1,
    Math.ceil(
      labels.length / Math.max(2, Math.floor(width / 90)),
    ),
  )
  const ticks = labels.flatMap((_, index) =>
    index % stride === 0 || index === labels.length - 1
      ? [index]
      : [],
  )
  return defineChart({
    marks,
    theme: {
      foreground: "currentColor",
      muted: "currentColor",
      grid: "currentColor",
      background: "transparent",
    },
    scales: {
      x: {
        scale: scaleBand<number>()
          .domain(labels.map((_, index) => index))
          .padding(0.2),
        axis: {
          tickLabels: { fontSize },
          ticks: {
            values: ticks,
            format: (index) => {
              const label = labels[index] ?? ""
              return label.length > 14
                ? `${label.slice(0, 13)}…`
                : label
            },
          },
        },
      },
      y: {
        scale: scaleLinear().domain(domain),
        nice: true,
        grid: { strokeOpacity: 0.15 },
        axis: { tickLabels: { fontSize } },
      },
    },
  })
}
