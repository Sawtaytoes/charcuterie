import { Chart as TanStackChart } from "@tanstack/charts/react/core"
import {
  createElement,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ChartOptions } from "../core/chart.ts"
import {
  chartRenderer,
  createInteractiveChartDefinition,
  observeReducedMotion,
} from "./browser.ts"
import {
  type ChartDatum,
  chartDimensions,
} from "./definition.ts"

/** Native React surface with pointer, touch, keyboard, and reduced-motion support. */
export const ChartPlot = (
  options: ChartOptions & { isAnimated?: boolean },
) => {
  const {
    title,
    labels,
    series,
    kind,
    barLayout,
    width,
    fontSize,
  } = options
  const [isReducedMotion, setIsReducedMotion] =
    useState(true)
  useEffect(
    () => observeReducedMotion(setIsReducedMotion),
    [],
  )
  const definition = useMemo(
    () =>
      createInteractiveChartDefinition({
        title,
        labels,
        series,
        kind,
        barLayout,
        width,
        fontSize,
      }),
    [
      title,
      labels,
      series,
      kind,
      barLayout,
      width,
      fontSize,
    ],
  )
  return createElement(
    TanStackChart<ChartDatum, number, number>,
    {
      definition,
      style: { width: "100%" },
      renderer: chartRenderer(
        (options.isAnimated ?? true) && !isReducedMotion,
      ),
      ...chartDimensions(options),
      ariaLabel: options.title,
      ariaDescription: options.description,
    },
  )
}
