import { Chart as TanStackChart } from "@tanstack/charts/react/core"
import { svgChartRenderer } from "@tanstack/charts/svg/renderer"
import { createElement, useMemo } from "react"
import {
  type ComparisonDatum,
  type ComparisonOptions,
  createComparisonDefinition,
} from "./comparison.ts"

export const ComparisonPlot = (
  options: ComparisonOptions & {
    title: string
    height: number
  },
) => {
  const definition = useMemo(
    () => createComparisonDefinition(options),
    [options],
  )
  return createElement(
    TanStackChart<ComparisonDatum, number, number>,
    {
      definition,
      width: options.width,
      height: options.height,
      style: { width: "100%" },
      renderer: svgChartRenderer,
      ariaLabel: options.title,
    },
  )
}
