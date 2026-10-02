import React, { useMemo } from 'react'
import { barY, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { Chart } from '@tanstack/charts/react/core'
import { motion } from '@tanstack/charts/motion'
import { svgChartRenderer } from '@tanstack/charts/svg/renderer'
import { tooltip } from '@tanstack/charts/tooltip'
import { categories, shades, shortDay } from './fixtures.mjs'
export const definitionFor = (rows, color) => {
  const marks = categories.map((category, index) => barY(rows.map(row => {
    const isPositive = row[category] >= 0
    const preceding = categories.slice(0, index).reduce((sum, key) => sum + ((row[key] >= 0) === isPositive ? row[key] : 0), 0)
    return { ...row, category, value: row[category], bottom: preceding, top: preceding + row[category] }
  }), { id: category, key: 'day', x: 'day', y1: 'bottom', y2: 'top', fill: shades(color)[index], inset: 2 }))
  return defineChart({ marks, scales: { x: { scale: () => scaleBand().padding(0.2), axis: { ticks: { format: shortDay, count: 8 } } }, y: { scale: scaleLinear, domain: [-100, 350], nice: true, grid: true } }, tooltip: { use: tooltip, content: (points) => ({ title: points[0]?.datum.day, rows: categories.map(category => ({ label: category, value: String(points[0]?.datum[category] ?? 0) })) }) } })
}
const renderer = motion({ transition: { type: 'tween', duration: 450 } })
export default function DailyChart({ rows, color, width = 640, isAnimated = true }) {
  const definition = useMemo(() => definitionFor(rows, color), [rows, color])
  return <Chart definition={definition} renderer={isAnimated ? renderer : svgChartRenderer} width={width} height={280} ariaLabel="Daily points" />
}
