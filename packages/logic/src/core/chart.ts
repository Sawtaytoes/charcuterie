/** Portable chart geometry and SVG, shared by React, Preact, and image renderers. */
export type ChartSeries = {
  id: string
  label: string
  color?: string
  kind?: "bar" | "line"
  values: readonly (number | null)[]
}

export type ChartOptions = {
  title: string
  description?: string
  labels: readonly string[]
  series: readonly ChartSeries[]
  kind?: "bar" | "line"
  width?: number
  height?: number
  fontSize?: number
}

const escapeXml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  )

const coordinate = (value: number): string =>
  value.toFixed(2)
const isFiniteValue = (
  value: number | null,
): value is number =>
  typeof value === "number" && Number.isFinite(value)

/** Color references never permit a remote URL or an injected SVG attribute. */
const safeColor = (value: string | undefined): string =>
  value &&
  !/url|[;<>"'\\]/i.test(value) &&
  /^[\w\s#(),.%+-]+$/.test(value)
    ? escapeXml(value)
    : "currentColor"

/**
 * Null is missing data, never zero. A line breaks at nulls. Bar and line domains
 * always contain zero and include negative values; constant/empty data stays finite.
 * Labels, accessible descriptions, and mark titles are escaped, including colors.
 */
export const renderChartSvg = ({
  title,
  description = "",
  labels,
  series,
  kind = "bar",
  width = 640,
  height = 240,
  fontSize = 11,
}: ChartOptions): string => {
  const chartWidth = Number.isFinite(width)
    ? Math.max(180, Math.min(4096, width))
    : 640
  const chartHeight = Number.isFinite(height)
    ? Math.max(120, Math.min(2160, height))
    : 240
  const labelSize = Number.isFinite(fontSize)
    ? Math.max(11, Math.min(32, fontSize))
    : 11
  const start = labelSize * 4.2
  const end = chartWidth - 12
  const top = 14
  const bottom = chartHeight - labelSize * 3.2
  const values = series.flatMap((entry) =>
    entry.values.filter(isFiniteValue),
  )
  const minimum = values.reduce(
    (lowest, value) => Math.min(lowest, value),
    0,
  )
  const maximum = values.reduce(
    (highest, value) => Math.max(highest, value),
    1,
  )
  const span = maximum - minimum
  const positionY = (value: number): number =>
    bottom - ((value - minimum) / span) * (bottom - top)
  const step = (end - start) / Math.max(1, labels.length)
  const positionX = (index: number): number =>
    start + step * (index + 0.5)
  const elements = [
    `<title>${escapeXml(title)}</title>`,
    `<desc>${escapeXml(description)}</desc>`,
  ]
  for (let tick = 0; tick <= 4; tick++) {
    const value = minimum + (span * tick) / 4
    const at = coordinate(positionY(value))
    const label = Intl.NumberFormat("en-US", {
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(value)
    elements.push(
      `<line x1="${start}" x2="${end}" y1="${at}" y2="${at}" stroke="currentColor" opacity="0.15"/>`,
    )
    elements.push(
      `<text x="${start - 6}" y="${at}" text-anchor="end" dominant-baseline="middle" fill="currentColor" font-size="${labelSize}">${escapeXml(label)}</text>`,
    )
  }
  elements.push(
    `<line x1="${start}" x2="${end}" y1="${coordinate(positionY(0))}" y2="${coordinate(positionY(0))}" stroke="currentColor" opacity="0.6"/>`,
  )
  const stride = Math.max(
    1,
    Math.ceil(
      labels.length /
        Math.max(2, Math.floor(chartWidth / 90)),
    ),
  )
  labels.forEach((label, index) => {
    if (
      index % stride === 0 ||
      index === labels.length - 1
    ) {
      const capacity = Math.max(
        6,
        Math.min(
          18,
          Math.floor((step * stride) / (labelSize * 0.65)),
        ),
      )
      const shortLabel =
        label.length > capacity
          ? `${label.slice(0, capacity - 1)}…`
          : label
      elements.push(
        `<text x="${coordinate(positionX(index))}" y="${chartHeight - 10}" text-anchor="middle" fill="currentColor" font-size="${labelSize}"><title>${escapeXml(label)}</title>${escapeXml(shortLabel)}</text>`,
      )
    }
  })
  series.forEach((entry, seriesIndex) => {
    const color = safeColor(entry.color)
    const dash =
      seriesIndex % 3 === 0
        ? ""
        : seriesIndex % 3 === 1
          ? "6 3"
          : "2 3"
    const barWidth = Math.max(
      0.5,
      (step * 0.8) / Math.max(1, series.length),
    )
    let segment: string[] = []
    const flush = () => {
      if (segment.length > 1) {
        elements.push(
          `<polyline points="${segment.join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="${dash}"/>`,
        )
      }
      segment = []
    }
    labels.forEach((label, index) => {
      const value = entry.values[index] ?? null
      if (!isFiniteValue(value)) {
        flush()
        return
      }
      const markTitle = escapeXml(
        `${entry.label}, ${label}: ${value}`,
      )
      if ((entry.kind ?? kind) === "bar") {
        const atX =
          positionX(index) -
          (step * 0.8) / 2 +
          seriesIndex * barWidth
        const atY = Math.min(positionY(value), positionY(0))
        elements.push(
          `<rect x="${coordinate(atX)}" y="${coordinate(atY)}" width="${coordinate(barWidth * 0.9)}" height="${coordinate(Math.abs(positionY(value) - positionY(0)))}" fill="${color}" stroke="currentColor" stroke-width="0.4"><title>${markTitle}</title></rect>`,
        )
      } else {
        segment.push(
          `${coordinate(positionX(index))},${coordinate(positionY(value))}`,
        )
        elements.push(
          `<circle cx="${coordinate(positionX(index))}" cy="${coordinate(positionY(value))}" r="2.5" fill="${color}"><title>${markTitle}</title></circle>`,
        )
      }
    })
    flush()
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(title)}" viewBox="0 0 ${chartWidth} ${chartHeight}" width="100%" height="100%" style="display:block;font-family:inherit">${elements.join("")}</svg>`
}
