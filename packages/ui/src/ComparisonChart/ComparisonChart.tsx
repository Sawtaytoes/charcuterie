import { ComparisonPlot } from "@charcuterie/logic/charts/react"
import type { ChartSeries } from "@charcuterie/logic/core"
import { getReadableTextColour } from "@charcuterie/tokens"
import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react"
import { DataTable } from "../DataTable/DataTable.tsx"

export type ComparisonChartProps = {
  title: string
  labels: readonly string[]
  series: readonly ChartSeries[]
  layout?: "nested" | "grouped"
  formatValue?: (value: number) => string
  isTableVisible?: boolean
}

/** Horizontal comparisons with one legend, a common scale, and original-value labels. */
export const ComparisonChart = ({
  title,
  labels,
  series,
  layout = "nested",
  formatValue = String,
  isTableVisible = false,
}: ComparisonChartProps) => {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0)
        setWidth(entry.contentRect.width)
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  const maximum = Math.max(
    1,
    ...series.flatMap((entry) =>
      entry.values.filter(
        (value): value is number =>
          value !== null && Number.isFinite(value),
      ),
    ),
  )
  const minimum = Math.min(
    0,
    ...series.flatMap((entry) =>
      entry.values.filter(
        (value): value is number =>
          value !== null && Number.isFinite(value),
      ),
    ),
  )
  return (
    <figure
      className="min-w-0 text-content-primary"
      style={
        {
          "--ts-chart-tooltip-background":
            "var(--color-surface-raised)",
          "--ts-chart-tooltip-color":
            "var(--color-content-primary)",
        } as CSSProperties
      }
    >
      <figcaption className="sr-only">{title}</figcaption>
      <ul
        aria-label={`${title} legend`}
        className="mb-3 flex flex-wrap gap-3 text-xs"
      >
        {series.map((entry) => (
          <li
            key={entry.id}
            className="min-w-0 wrap-anywhere"
          >
            <span
              aria-hidden="true"
              className="me-1 inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.label}
          </li>
        ))}
      </ul>
      <div ref={container} className="space-y-3">
        {labels.map((label, index) => {
          const values = series.map((entry) => ({
            id: entry.id,
            label: entry.label,
            value: entry.values[index] ?? null,
            colour: entry.color ?? "currentColor",
            textColour:
              entry.color &&
              /^#[0-9a-f]{6}$/i.test(entry.color)
                ? getReadableTextColour(entry.color)
                : "var(--color-surface-base)",
          }))
          const shown = values.filter(
            (entry) => entry.value !== null,
          )
          return (
            <div
              key={JSON.stringify([
                label,
                values
                  .filter((entry) => entry.value !== null)
                  .map((entry) => entry.id),
              ])}
            >
              <p className="text-sm wrap-anywhere">
                {label}
              </p>
              <ComparisonPlot
                title={`${title}: ${label}`}
                values={values}
                maximum={maximum}
                minimum={minimum}
                layout={layout}
                formatValue={formatValue}
                width={width}
                height={shown.length > 1 ? 60 : 34}
              />
            </div>
          )
        })}
      </div>
      {isTableVisible && (
        <DataTable
          label={`${title} values`}
          rows={labels.map((label, index) => ({
            label,
            index,
          }))}
          getRowKey={(row) => String(row.index)}
          columns={[
            {
              key: "label",
              header: "Card",
              renderCell: (row) => row.label,
            },
            ...series.map((entry) => ({
              key: entry.id,
              header: entry.label,
              renderCell: (row: { index: number }) => {
                const value = entry.values[row.index]
                return value == null
                  ? "-"
                  : formatValue(value)
              },
            })),
          ]}
        />
      )}
    </figure>
  )
}
