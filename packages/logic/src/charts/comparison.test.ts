import { createChartScene } from "@tanstack/charts"
import { expect, test } from "vitest"
import {
  comparisonGeometry,
  createComparisonDefinition,
} from "./comparison.ts"

const value = (id: string, amount: number | null) => ({
  id,
  label: id,
  value: amount,
  colour: "var(--color-intent-accent-solid)",
})
test("unequal bars share zero, retain original lengths, and nest by thickness", () => {
  const rows = comparisonGeometry({
    values: [value("a", 2), value("b", 6)],
    width: 600,
    maximum: 6,
  })
  expect(rows.map((row) => row.value)).toEqual([6, 2])
  expect(rows.map((row) => row.center)).toEqual([0.5, 0.5])
  expect(rows[0].y2 - rows[0].y1).toBeGreaterThan(
    rows[1].y2 - rows[1].y1,
  )
})
test("equal values have equal lengths and separate lanes", () => {
  const rows = comparisonGeometry({
    values: [value("a", 4), value("b", 4)],
    width: 600,
    maximum: 6,
  })
  expect(rows[0].value).toBe(rows[1].value)
  expect(rows[0].y2).toBeLessThan(rows[1].y1)
})
test("null is missing, zero is visible, and invalid values are omitted", () => {
  const rows = comparisonGeometry({
    values: [
      value("missing", null),
      value("zero", 0),
      value("invalid", NaN),
    ],
    width: 300,
    maximum: 6,
  })
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    value: 0,
    isInside: false,
  })
})
test("TanStack produces finite original-value geometry for the comparison", () => {
  const scene = createChartScene(
    createComparisonDefinition({
      values: [value("a", 2), value("b", 6)],
      width: 600,
      maximum: 6,
    }),
    { width: 600, height: 60 },
  )
  expect(JSON.stringify(scene)).not.toMatch(/NaN|Infinity/)
})

test("signed values size their labels against the full domain", () => {
  const rows = comparisonGeometry({
    values: [value("large", -200), value("small", -1)],
    width: 600,
    minimum: -200,
    maximum: 1,
  })
  expect(
    rows.find((row) => row.id === "large")?.isInside,
  ).toBe(true)
  expect(
    rows.find((row) => row.id === "small")?.isInside,
  ).toBe(false)
})
