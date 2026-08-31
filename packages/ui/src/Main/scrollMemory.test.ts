import { afterEach, expect, test } from "vitest"

import {
  forgetScrollOffsets,
  recallScrollOffset,
  rememberScrollOffset,
} from "./scrollMemory.ts"

afterEach(() => {
  forgetScrollOffsets()
})

test("an entry nobody has scrolled recalls the top", () => {
  expect(recallScrollOffset("entry-never-seen")).toBe(0)
})

test("an entry recalls the offset it was last left at", () => {
  rememberScrollOffset("entry-1", 900)
  rememberScrollOffset("entry-1", 1240)

  expect(recallScrollOffset("entry-1")).toBe(1240)
})

/**
 * A long session pushes a new history entry per link press, and
 * every one of them would otherwise keep a number forever. The
 * eviction is least-recently-*written*, which is why re-writing an
 * entry has to move it to the end — a plain `Map.set` on an
 * existing key keeps its original position, so the entry the
 * reader is using would age out while it was in use.
 */
test("a long session evicts the least recently written entry", () => {
  for (let index = 0; index < 60; index += 1) {
    rememberScrollOffset(`entry-${index}`, index * 10)
  }

  // Written first, never re-written: gone.
  expect(recallScrollOffset("entry-0")).toBe(0)

  // Inside the last fifty: kept.
  expect(recallScrollOffset("entry-59")).toBe(590)
  expect(recallScrollOffset("entry-10")).toBe(100)
})

test("re-writing an entry saves it from eviction", () => {
  rememberScrollOffset("entry-old", 500)

  for (let index = 0; index < 49; index += 1) {
    rememberScrollOffset(`entry-${index}`, index * 10)
  }

  rememberScrollOffset("entry-old", 640)

  for (let index = 49; index < 60; index += 1) {
    rememberScrollOffset(`entry-${index}`, index * 10)
  }

  expect(recallScrollOffset("entry-old")).toBe(640)
})
