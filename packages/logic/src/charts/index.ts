import { createChartScene } from "@tanstack/charts"
import { renderChartSvg as renderTanStackSvg } from "@tanstack/charts/svg"
import type { ChartOptions } from "../core/chart.ts"
import {
  chartDimensions,
  createChartDefinition,
} from "./definition.ts"

export {
  chartDimensions,
  createChartDefinition,
} from "./definition.ts"

/** Standalone, script-free TanStack SVG with explicit image dimensions and namespace. */
export const renderChartSvg = (
  options: ChartOptions,
): string => {
  const dimensions = chartDimensions(options)
  const scene = createChartScene(
    createChartDefinition(options),
    dimensions,
  )
  return renderTanStackSvg(scene, {
    ariaLabel: options.title,
    ariaDescription: options.description,
  }).replace(
    /^<svg\b([^>]*)>/,
    (_, attributes: string) =>
      `<svg${attributes.replace(/\s(?:width|height)="[^"]*"/g, "")} xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}">`,
  )
}
