import React from 'react'
import { renderChartSvg } from '../../../packages/logic/src/core/chart.ts'
import { categories, shades, shortDay } from './fixtures.mjs'
export default function Chart({ rows, color, width = 640 }) {
  return <div dangerouslySetInnerHTML={{ __html: renderChartSvg({ title: 'Daily points', labels: rows.map(row => shortDay(row.day)), series: categories.map((label, index) => ({ id: label, label, color: shades(color)[index], values: rows.map(row => row[label]) })), width, height: 280 }) }} />
}
