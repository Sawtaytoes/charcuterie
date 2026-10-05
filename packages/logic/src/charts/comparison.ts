import {
  defineChart,
  rect,
  type StaticChartDefinition,
  text,
} from "@tanstack/charts"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { tooltip } from "@tanstack/charts/tooltip"
import { safeChartColor } from "../core/chart.ts"

export type ComparisonValue = {
  id: string
  label: string
  value: number | null
  colour: string
  textColour?: string
}
export type ComparisonDatum = ComparisonValue & {
  value: number
  y1: number
  y2: number
  center: number
  isInside: boolean
  textValue: string
}
export type ComparisonOptions = {
  values: readonly ComparisonValue[]
  maximum: number
  minimum?: number
  width: number
  layout?: "nested" | "grouped"
  formatValue?: (value: number) => string
}

/** Ties occupy separate lanes. Distinct values share zero and nest by thickness. */
export const comparisonGeometry = ({
  values,
  maximum,
  minimum = 0,
  width,
  layout = "nested",
  formatValue = String,
}: ComparisonOptions): ComparisonDatum[] => {
  const valid = values
    .filter(
      (
        entry,
      ): entry is ComparisonValue & { value: number } =>
        entry.value !== null &&
        Number.isFinite(entry.value),
    )
    .toSorted(
      (left, right) =>
        Math.abs(right.value) - Math.abs(left.value),
    )
  const span = Math.max(1, maximum - minimum)
  const plotWidth = Math.max(
    1,
    width - (minimum < 0 ? 120 : 64),
  )
  const hasTies =
    new Set(valid.map((entry) => entry.value)).size <
    valid.length
  // Nearby endpoints leave no room for both labels; separate those lanes too.
  const hasCrowdedLabels = valid.some((entry, index) => {
    const next = valid[index + 1]
    return (
      next !== undefined &&
      (Math.abs(entry.value - next.value) / span) *
        plotWidth <
        formatValue(entry.value).length * 7 + 12
    )
  })
  const isGrouped =
    layout === "grouped" || hasTies || hasCrowdedLabels
  return valid.map((entry, index) => {
    const center = isGrouped
      ? (index + 0.5) / valid.length
      : 0.5
    const thickness = isGrouped
      ? 0.76 / valid.length
      : 0.9 - index * 0.18
    const textValue = formatValue(entry.value)
    return {
      ...entry,
      colour: safeChartColor(entry.colour),
      y1: center - thickness / 2,
      y2: center + thickness / 2,
      center,
      textValue,
      isInside:
        (Math.abs(entry.value) / span) * plotWidth >
        textValue.length * 7 + 16,
    }
  })
}

export const createComparisonDefinition = (
  options: ComparisonOptions,
): StaticChartDefinition<
  ComparisonDatum,
  number,
  number,
  "dom"
> => {
  const rows = comparisonGeometry(options)
  return {
    ...defineChart({
      marks: rows.flatMap((row) => [
        rect([row], {
          id: `bar-${row.id}`,
          key: "id",
          x1: (row) => Math.min(0, row.value),
          x2: (row) => Math.max(0, row.value),
          x: "value",
          y1: "y1",
          y2: "y2",
          y: "center",
          fill: row.colour,
          radius: 3,
        }),
        text([row], {
          id: `value-${row.id}`,
          key: "id",
          x: "value",
          y: "center",
          text: "textValue",
          anchor:
            row.value < 0 === row.isInside
              ? "start"
              : "end",
          dx: (row.value < 0 === row.isInside ? 1 : -1) * 6,
          dy: 4,
          fontSize: 12,
          fill: row.isInside
            ? (row.textColour ?? "currentColor")
            : "currentColor",
        }),
      ]),
      theme: {
        foreground: "currentColor",
        muted: "currentColor",
        grid: "currentColor",
        background: "transparent",
      },
      scales: {
        x: {
          scale: scaleLinear().domain([
            options.minimum ?? 0,
            Math.max(1, options.maximum),
          ]),
          axis: false,
        },
        y: {
          scale: scaleLinear().domain([1, 0]),
          axis: false,
        },
      },
      margin: {
        top: 2,
        bottom: 2,
        left: (options.minimum ?? 0) < 0 ? 60 : 2,
        right: 60,
      },
    }),
    focus: "nearest" as const,
    tooltip: {
      use: tooltip,
      content: () => ({
        title: "",
        rows: options.values.map((entry) => ({
          label: entry.label,
          value:
            entry.value === null
              ? "-"
              : (options.formatValue ?? String)(
                  entry.value,
                ),
          color: undefined,
        })),
      }),
    },
  }
}
