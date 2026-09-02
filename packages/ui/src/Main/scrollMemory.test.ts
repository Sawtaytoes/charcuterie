import { afterEach, expect, test } from "vitest"

import {
  enterScrollEntry,
  forgetScrollOffsets,
  rememberScrollOffset,
  resolveScrollOffset,
} from "./scrollMemory.ts"

afterEach(() => {
  forgetScrollOffsets()
})

const toEntry = (key: string, path = "/backlog") => ({
  key,
  path,
})

test("the first page a reader opens starts at the top", () => {
  expect(resolveScrollOffset(toEntry("entry-1"))).toBe(0)
})

test("an entry recalls the offset it was last left at", () => {
  rememberScrollOffset(toEntry("entry-1"), 900)
  rememberScrollOffset(toEntry("entry-1"), 1240)

  expect(resolveScrollOffset(toEntry("entry-1"))).toBe(1240)
})

test("a page the reader has not seen starts at the top", () => {
  enterScrollEntry(toEntry("entry-1", "/backlog"))

  expect(
    resolveScrollOffset(toEntry("entry-2", "/tasks/9")),
  ).toBe(0)
})

/**
 * The defect this whole field exists for, and it shipped: a filter
 * chip, an expanded group and a selected tab all write a search
 * param, `setSearchParams` navigates, and the new entry is one the
 * memory has never seen. Read as "unseen ⇒ top", opening a group
 * threw the reader to the top of the list they were reading.
 *
 * `null` is a third answer — **leave the scrollport alone** — and
 * it is what the page did before any of this existed, so it cannot
 * be a regression.
 */
test("a new entry on the same page leaves the scrollport alone", () => {
  enterScrollEntry(toEntry("entry-1", "/backlog"))

  expect(
    resolveScrollOffset(toEntry("entry-2", "/backlog")),
  ).toBeNull()
})

test("a remembered entry beats the page comparison", () => {
  rememberScrollOffset(toEntry("entry-1", "/backlog"), 1240)
  enterScrollEntry(toEntry("entry-2", "/backlog"))

  expect(
    resolveScrollOffset(toEntry("entry-1", "/backlog")),
  ).toBe(1240)
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
    rememberScrollOffset(
      toEntry(`entry-${index}`),
      index * 10,
    )
  }

  // Written first, never re-written: gone, so it falls through to
  // the page comparison and starts at the top.
  expect(resolveScrollOffset(toEntry("entry-0"))).toBe(0)

  // Inside the last fifty: kept.
  expect(resolveScrollOffset(toEntry("entry-59"))).toBe(590)
  expect(resolveScrollOffset(toEntry("entry-10"))).toBe(100)
})

test("re-writing an entry saves it from eviction", () => {
  rememberScrollOffset(toEntry("entry-old"), 500)

  for (let index = 0; index < 49; index += 1) {
    rememberScrollOffset(
      toEntry(`entry-${index}`),
      index * 10,
    )
  }

  rememberScrollOffset(toEntry("entry-old"), 640)

  for (let index = 49; index < 60; index += 1) {
    rememberScrollOffset(
      toEntry(`entry-${index}`),
      index * 10,
    )
  }

  expect(resolveScrollOffset(toEntry("entry-old"))).toBe(
    640,
  )
})
