/**
 * The fallback colour for a row nobody has picked one for.
 *
 * Three properties, and they are not the same property said three
 * ways. **Stability** is that the answer never changes — across
 * runs, machines, and the server-rendered copy. **Uniformity** is
 * that the ten indexes get roughly a tenth of the names each,
 * because a hash that is stable and lands 60% of a household's
 * labels on index 4 has solved nothing. **Sensitivity** is that
 * near-identical names separate, which is the case that actually
 * shows up: "Kitchen" and "Kitchens", "Season 1" and "Season 2".
 */

import { expect, test } from "vitest"

import {
  CATEGORICAL_INDEX_COUNT,
  CATEGORICAL_INDEXES,
} from "./categorical.ts"
import { getCategoricalIndex } from "./getCategoricalIndex.ts"

test("the answer is always a real index", () => {
  for (const key of [
    "",
    "a",
    "Homelab",
    "  spaced  ",
    "1",
    "🎛️ knobs",
    "a".repeat(500),
  ]) {
    expect([...CATEGORICAL_INDEXES]).toContain(
      getCategoricalIndex(key),
    )
  }
})

test("the same key gives the same index, pinned to literals", () => {
  // Pinned rather than merely self-consistent. A test that only
  // called the function twice would pass just as happily on a
  // reimplementation that changed every answer — and changing every
  // answer means every label in Docket silently changes colour on
  // deploy, which is the one thing this function exists to prevent.
  expect(getCategoricalIndex("Homelab")).toBe(2)

  expect(getCategoricalIndex("Kitchen")).toBe(4)

  expect(getCategoricalIndex("Anime backlog")).toBe(9)

  expect(getCategoricalIndex("")).toBe(2)
})

test("case and whitespace are different keys, deliberately", () => {
  // No normalization, because case-folding and trimming are policy
  // the consumer owns and neither is reversible from in here. A
  // consumer that wants a rename to keep its colour hashes the
  // row's **id**, which is why the parameter is `key`.
  expect(getCategoricalIndex("homelab")).not.toBe(
    getCategoricalIndex("Homelab "),
  )
})

/** Deterministic, so the uniformity numbers below are reproducible. */
const buildKeys = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `label-${index}-${(index * 7919) % 1013}`,
  )

test("ten thousand names land on all ten indexes, roughly evenly", () => {
  const counts = new Map(
    CATEGORICAL_INDEXES.map((index) => [index, 0]),
  )

  const keys = buildKeys(10_000)

  for (const key of keys) {
    const index = getCategoricalIndex(key)

    counts.set(index, (counts.get(index) ?? 0) + 1)
  }

  const expected = keys.length / CATEGORICAL_INDEX_COUNT

  for (const index of CATEGORICAL_INDEXES) {
    // ±20% of even. A perfect split is not the goal and would be
    // suspicious; what matters is that no index is starved and none
    // is a magnet.
    expect(counts.get(index)).toBeGreaterThan(
      expected * 0.8,
    )

    expect(counts.get(index)).toBeLessThan(expected * 1.2)
  }
})

test("household-scale name lists still reach most of the ring", () => {
  // 10,000 synthetic keys is the easy case. The real input is a few
  // dozen human-written labels, and a hash with poor avalanche in
  // the low bits looks fine at scale and collapses here.
  const labels = [
    "Homelab",
    "Errands",
    "Anime backlog",
    "Garage",
    "Kitchen",
    "Yard",
    "Reading",
    "Music library",
    "Comics",
    "Firmware",
    "Groceries",
    "Taxes",
    "Bikes",
    "Prints",
    "Networking",
  ]

  expect(
    new Set(labels.map(getCategoricalIndex)).size,
  ).toBeGreaterThanOrEqual(7)
})

test("names one character apart separate", () => {
  // The realistic near-collision. A hash that only mixes the tail
  // of a string maps a whole numbered series onto one colour.
  const series = [
    "Season 1",
    "Season 2",
    "Season 3",
    "Season 4",
    "Season 5",
  ]

  expect(
    new Set(series.map(getCategoricalIndex)).size,
  ).toBeGreaterThanOrEqual(4)
})

test("long keys keep mixing rather than saturating", () => {
  // The failure that arrives with `Math.imul` missing: past 2^53
  // the multiply loses its low bits as a float64 and every long key
  // converges. Two 400-character keys differing in one character
  // must still separate more often than not.
  const indexes = new Set(
    Array.from({ length: 40 }, (_, index) =>
      getCategoricalIndex(
        `${"x".repeat(400)}${index}${"y".repeat(400)}`,
      ),
    ),
  )

  expect(indexes.size).toBeGreaterThanOrEqual(7)
})
