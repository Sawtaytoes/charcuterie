// biome-ignore-all lint/security/noDangerouslySetInnerHtml: The shared definition sanitizes colors; TanStack escapes producer text.
import { createChartRendererAdapter } from "@tanstack/charts/adapter/renderer"
import { h } from "preact"
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks"
import type { ChartOptions } from "../core/chart.ts"
import {
  chartRenderer,
  createInteractiveChartDefinition,
  observeReducedMotion,
} from "./browser.ts"
import { chartDimensions } from "./definition.ts"

/** Native Preact surface on TanStack's renderer adapter, without React or a compatibility layer. */
export const ChartPlot = (
  options: ChartOptions & { isAnimated?: boolean },
) => {
  const {
    title,
    description,
    labels,
    series,
    kind,
    barLayout,
    width,
    height,
    fontSize,
    isAnimated = true,
  } = options
  const idPrefix = useId()
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
  const hostOptions = useMemo(
    () => ({
      definition,
      renderer: chartRenderer(
        isAnimated && !isReducedMotion,
      ),
      ...chartDimensions({
        title,
        labels,
        series,
        width,
        height,
        fontSize,
      }),
      ariaLabel: title,
      ariaDescription: description,
      idPrefix,
    }),
    [
      definition,
      isAnimated,
      isReducedMotion,
      width,
      height,
      fontSize,
      title,
      description,
      idPrefix,
      labels,
      series,
    ],
  )
  const [adapter] = useState(() =>
    createChartRendererAdapter(hostOptions),
  )
  const [markup] = useState(() => adapter.prerender())
  const container = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    adapter.mount(element)
    return () => adapter.destroy()
  }, [adapter])
  useLayoutEffect(
    () => adapter.update(hostOptions),
    [adapter, hostOptions],
  )
  return h("div", {
    ref: container,
    style: { width: "100%", height: "100%" },
    dangerouslySetInnerHTML: { __html: markup },
  })
}
