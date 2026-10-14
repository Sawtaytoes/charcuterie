import type { DomChartDefinition } from "@tanstack/charts"
import { motion } from "@tanstack/charts/motion"
import { svgChartRenderer } from "@tanstack/charts/svg/renderer"
import { tooltip } from "@tanstack/charts/tooltip"
import type { ChartOptions } from "../core/chart.ts"
import {
  type ChartDatum,
  createChartDefinition,
} from "./definition.ts"

const animatedRenderer = motion({
  transition: { type: "tween", duration: 450 },
})
/** Use a truly static renderer when animation is disabled; motion also honors reduced motion. */
export const chartRenderer = (isAnimated: boolean) =>
  isAnimated ? animatedRenderer : svgChartRenderer

/** The day tooltip reads original samples, never stacked endpoints or substituted zeroes. */
export const createInteractiveChartDefinition = (
  options: ChartOptions,
): DomChartDefinition<ChartDatum, number, number> => ({
  ...createChartDefinition(options),
  focus: "group-x",
  tooltip: {
    use: tooltip,
    content: (
      points: readonly { datum: { index: number } }[],
    ) => {
      const index = points[0]?.datum.index
      return {
        title:
          index === undefined ? "" : options.labels[index],
        rows: options.series.map((entry) => {
          const value =
            index === undefined ? null : entry.values[index]
          return {
            label: entry.label,
            value:
              typeof value === "number" &&
              Number.isFinite(value)
                ? Intl.NumberFormat("en-US", {
                    maximumSignificantDigits: 21,
                  }).format(value)
                : "Unavailable",
            color: undefined,
          }
        }),
      }
    },
  },
})

/** Observe reduced motion, including preference changes while a chart is mounted. */
export const observeReducedMotion = (
  onChange: (isReduced: boolean) => void,
) => {
  if (typeof matchMedia === "undefined") return () => {}
  const query = matchMedia(
    "(prefers-reduced-motion: reduce)",
  )
  const update = () => onChange(query.matches)
  update()
  query.addEventListener("change", update)
  return () => query.removeEventListener("change", update)
}
