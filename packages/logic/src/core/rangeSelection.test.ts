/**
 * The shift-click rules, named one per test.
 *
 * These came over with the reducer from mail-sifter, where the bug
 * that prompted them was reported in one sentence: *"I held 'shift'
 * and clicked on the 4th item after clicking the 1st, and it only
 * selected those two."* The interesting half is not the span — it
 * is the four ways a span does **not** happen, and the verdict the
 * anchor carries.
 */

import { expect, test } from "vitest"

import type { SelectionAnchor } from "./rangeSelection.ts"
import { applySelectionClick } from "./rangeSelection.ts"

const ORDERED_VALUES = ["a", "b", "c", "d", "e"]

const click = (
  selected: string[],
  anchor: SelectionAnchor | null,
  value: string,
  isRange = false,
) =>
  applySelectionClick({
    anchor,
    isRange,
    orderedValues: ORDERED_VALUES,
    selectedValues: new Set(selected),
    value,
  })

const sorted = (result: { selectedValues: Set<string> }) =>
  [...result.selectedValues].sort()

test("a plain click toggles one item and anchors there", () => {
  const result = click([], null, "a")

  expect(sorted(result)).toStrictEqual(["a"])
  expect(result.anchor).toStrictEqual({
    isSelected: true,
    value: "a",
  })
})

test("un-ticking is remembered as a deselecting anchor", () => {
  const result = click(
    ["a"],
    { isSelected: true, value: "a" },
    "a",
  )

  expect(sorted(result)).toStrictEqual([])
  expect(result.anchor).toStrictEqual({
    isSelected: false,
    value: "a",
  })
})

test("a shift click fills in everything between", () => {
  // The reported bug: pick the 1st, shift-pick the 4th, get 1–4.
  const result = click(
    ["a"],
    { isSelected: true, value: "a" },
    "d",
    true,
  )

  expect(sorted(result)).toStrictEqual(["a", "b", "c", "d"])
})

test("the span fills backwards too", () => {
  const result = click(
    ["d"],
    { isSelected: true, value: "d" },
    "b",
    true,
  )

  expect(sorted(result)).toStrictEqual(["b", "c", "d"])
})

test("picks outside the span survive it", () => {
  const result = click(
    ["a", "e"],
    { isSelected: true, value: "a" },
    "c",
    true,
  )

  expect(sorted(result)).toStrictEqual(["a", "b", "c", "e"])
})

test("a span after an un-tick CLEARS the range", () => {
  const result = click(
    ["a", "b", "c", "d"],
    { isSelected: false, value: "b" },
    "d",
    true,
  )

  expect(sorted(result)).toStrictEqual(["a"])
})

test("the anchor moves to the shift-clicked item, keeping its verdict", () => {
  const result = click(
    ["a"],
    { isSelected: true, value: "a" },
    "c",
    true,
  )

  expect(result.anchor).toStrictEqual({
    isSelected: true,
    value: "c",
  })

  // …so a second shift-click walks further down the list rather
  // than re-deriving from an item scrolled off the top.
  const next = applySelectionClick({
    anchor: result.anchor,
    isRange: true,
    orderedValues: ORDERED_VALUES,
    selectedValues: result.selectedValues,
    value: "e",
  })

  expect([...next.selectedValues].sort()).toStrictEqual([
    "a",
    "b",
    "c",
    "d",
    "e",
  ])
})

test("shift-clicking the anchor itself is a one-item span, not a toggle", () => {
  const result = click(
    ["a"],
    { isSelected: true, value: "a" },
    "a",
    true,
  )

  expect(sorted(result)).toStrictEqual(["a"])
})

test("with no anchor yet, shift degrades to a plain toggle", () => {
  const result = click([], null, "c", true)

  expect(sorted(result)).toStrictEqual(["c"])
  expect(result.anchor).toStrictEqual({
    isSelected: true,
    value: "c",
  })
})

test("an anchor that has left the list degrades to a plain toggle", () => {
  // Archived, moved, or filtered away since it was picked.
  const result = click(
    ["a"],
    { isSelected: true, value: "zz" },
    "d",
    true,
  )

  expect(sorted(result)).toStrictEqual(["a", "d"])
  expect(result.anchor).toStrictEqual({
    isSelected: true,
    value: "d",
  })
})

test("the set it was given is never mutated", () => {
  const selectedValues = new Set(["a"])

  applySelectionClick({
    anchor: { isSelected: true, value: "a" },
    isRange: true,
    orderedValues: ORDERED_VALUES,
    selectedValues,
    value: "d",
  })

  expect([...selectedValues]).toStrictEqual(["a"])
})
