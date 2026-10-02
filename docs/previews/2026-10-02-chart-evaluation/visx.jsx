import React from 'react'
import { XYChart, BarStack, AnimatedBarStack, BarSeries, AnimatedBarSeries, Axis, Grid, Tooltip } from '@visx/xychart'
import { categories, shades, shortDay } from './fixtures.mjs'
export default function DailyChart({ rows, color, width = 640, isAnimated = true }) {
  const Stack = isAnimated ? AnimatedBarStack : BarStack
  const Series = isAnimated ? AnimatedBarSeries : BarSeries
  return <XYChart width={width} height={280} margin={{ top: 15, right: 12, bottom: 35, left: 45 }} xScale={{ type: 'band', paddingInner: .25 }} yScale={{ type: 'linear', domain: [-100, 350], nice: true }} theme={{ backgroundColor: 'var(--surface)', colors: shades(color), gridColor: '#71839d55', gridColorDark: '#71839d55', svgLabelSmall: { fill: 'currentColor', fontSize: 11 }, svgLabelBig: { fill: 'currentColor', fontSize: 12 }, htmlLabel: { color: 'var(--ink)', fontSize: 13 }, xAxisLineStyles: { stroke: 'currentColor' }, yAxisLineStyles: { stroke: 'currentColor' }, xTickLineStyles: { stroke: 'currentColor' }, yTickLineStyles: { stroke: 'currentColor' }, tickLength: 3 }}>
    <Grid columns={false} numTicks={5} />
    <Axis orientation="bottom" tickFormat={shortDay} numTicks={8} />
    <Axis orientation="left" numTicks={5} />
    <Stack>{categories.map(category => <Series key={category} dataKey={category} data={rows} xAccessor={row => row.day} yAccessor={row => row[category]} />)}</Stack>
    <Tooltip showVerticalCrosshair showSeriesGlyphs renderTooltip={({ tooltipData }) => <div style={{ color: '#182230' }}>{tooltipData?.nearestDatum?.datum.day}{categories.map(category => <div key={category}>{category}: {tooltipData?.nearestDatum?.datum[category]}</div>)}</div>} />
  </XYChart>
}
