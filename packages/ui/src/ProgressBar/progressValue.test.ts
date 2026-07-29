/**
 * The arithmetic a progress bar gets handed by a log parser.
 *
 * None of these inputs is hypothetical: rip-deck's `fillPercent`
 * comes out of a ripper's stdout, and `-1`, `101`, `NaN`, and
 * `0 of 0` all arrive in normal operation. Today each of them
 * renders as a bar that overflows its track, vanishes, or reads as
 * finished.
 */

import { expect, test } from "vitest"

import type { ProgressThreshold } from "./progressValue.ts"
import {
  getProgressIntent,
  toProgressPercent,
  toProgressValue,
} from "./progressValue.ts"

test("a normal value becomes a rounded percentage", () => {
  expect(toProgressPercent(38, 100)).toBe(38)

  expect(toProgressPercent(4, 9)).toBe(44)

  expect(toProgressPercent(1, 3)).toBe(33)
})

test("out-of-range values clamp rather than overflow", () => {
  expect(toProgressPercent(-5, 100)).toBe(0)

  expect(toProgressPercent(150, 100)).toBe(100)
})

test("an empty queue is 0%, not NaN%", () => {
  // `0 of 0 files done` — every empty queue's first render.
  expect(toProgressPercent(0, 0)).toBe(0)

  expect(toProgressPercent(1, 0)).toBe(0)

  expect(toProgressPercent(Number.NaN, 100)).toBe(0)

  expect(
    toProgressPercent(Number.POSITIVE_INFINITY, 100),
  ).toBe(0)
})

test("aria-valuenow never leaves its own min/max", () => {
  // A `valuenow` outside `valuemin`/`valuemax` is read as a nonsense
  // percentage by some screen readers and dropped by others, and
  // either way it disagrees with the bar on screen.
  expect(toProgressValue(38, 100)).toBe(38)

  expect(toProgressValue(-5, 100)).toBe(0)

  expect(toProgressValue(150, 100)).toBe(100)

  expect(toProgressValue(5, 0)).toBe(0)

  expect(toProgressValue(Number.NaN, 100)).toBe(0)
})

const THRESHOLDS: ProgressThreshold[] = [
  { from: 100, intent: "success" },
  { from: 90, intent: "warning" },
]

test("with no thresholds the component's intent wins", () => {
  expect(getProgressIntent(50, "accent")).toBe("accent")

  expect(getProgressIntent(50, "accent", [])).toBe("accent")
})

test("the highest matching threshold wins, whatever the array order", () => {
  // Order-independence is the point: a caller appending to a config
  // array should not have to know it was meant to be sorted.
  expect(getProgressIntent(94, "accent", THRESHOLDS)).toBe(
    "warning",
  )

  expect(
    getProgressIntent(
      94,
      "accent",
      [...THRESHOLDS].reverse(),
    ),
  ).toBe("warning")

  expect(getProgressIntent(100, "accent", THRESHOLDS)).toBe(
    "success",
  )

  expect(getProgressIntent(89, "accent", THRESHOLDS)).toBe(
    "accent",
  )
})

test("a threshold at the boundary is inclusive", () => {
  expect(getProgressIntent(90, "accent", THRESHOLDS)).toBe(
    "warning",
  )
})
