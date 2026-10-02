// biome-ignore-all lint/security/noDangerouslySetInnerHtml: The portable renderer escapes text and restricts color references; security tests cover this boundary.

import { ChartPlot } from "@charcuterie/logic/charts/react"
import {
  type ChartOptions,
  renderChartSvg,
} from "@charcuterie/logic/core"
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { toClassName } from "../toClassName.ts"

export type ChartProps = ChartOptions & {
  className?: string
  /** A text table exposes every value without relying on color, hover, or SVG. */
  isTableVisible?: boolean
  /** The portable renderer is an explicit fallback for constrained environments. */
  renderer?: "tanstack" | "portable"
  isAnimated?: boolean
}

/** The same escaped SVG renderer is available without React for kiosk/image consumers. */
export const Chart = ({
  className,
  isTableVisible = false,
  renderer = "tanstack",
  isAnimated = true,
  ...options
}: ChartProps): ReactNode => {
  const container = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState(
    options.width ?? 640,
  )
  useEffect(() => {
    const element = container.current
    if (!element || options.width !== undefined) return
    const frame = { id: 0 }
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame.id)
      frame.id = requestAnimationFrame(() => {
        if (entry.contentRect.width > 0) {
          setMeasuredWidth(entry.contentRect.width)
        }
      })
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame.id)
    }
  }, [options.width])
  return (
    <figure
      style={
        {
          "--ts-chart-tooltip-background":
            "var(--color-surface-raised)",
          "--ts-chart-tooltip-color":
            "var(--color-content-primary)",
          "--ts-chart-tooltip-border":
            "1px solid var(--color-border-subtle)",
          "--ts-chart-tooltip-font": "inherit",
        } as CSSProperties
      }
      className={toClassName(
        "min-w-0 text-content-primary",
        className,
      )}
    >
      <figcaption className="mb-2 text-sm font-semibold">
        {options.title}
      </figcaption>
      <div
        ref={container}
        style={{ height: options.height ?? 240 }}
      >
        {renderer === "portable" ? (
          <div
            style={{ height: "100%" }}
            dangerouslySetInnerHTML={{
              __html: renderChartSvg({
                ...options,
                width: options.width ?? measuredWidth,
              }),
            }}
          />
        ) : (
          <ChartPlot
            {...options}
            width={options.width ?? measuredWidth}
            isAnimated={isAnimated}
          />
        )}
      </div>
      <ul
        aria-label={`${options.title} legend`}
        className="mt-2 flex flex-wrap gap-3 text-xs"
      >
        {options.series.map((entry, index) => (
          <li
            className="min-w-0 wrap-anywhere"
            key={entry.id}
          >
            <span
              aria-hidden="true"
              style={{
                color: entry.color ?? "currentColor",
                borderTop: `3px ${index % 3 === 0 ? "solid" : index % 3 === 1 ? "dashed" : "dotted"} currentColor`,
                display: "inline-block",
                width: "1rem",
                marginRight: "0.4rem",
              }}
            />
            {entry.label}
          </li>
        ))}
      </ul>
      {options.description && (
        <p className="mt-2 text-xs text-content-muted">
          {options.description}
        </p>
      )}
      {isTableVisible && (
        <div className="mt-3 overflow-auto">
          <table className="w-full text-start text-xs">
            <caption className="sr-only">
              {options.title} values
            </caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                {options.series.map((entry) => (
                  <th scope="col" key={entry.id}>
                    {entry.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.labels.map((label, index) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {options.series.map((entry) => (
                    <td key={entry.id}>
                      {entry.values[index] ?? "Unavailable"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  )
}
