import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { containerQuery } from "@charcuterie/tokens/src/scales.ts"
import { expect, test } from "vitest"

/**
 * The move handle swaps its glyph for the word "Move" at the width
 * where the lanes stop being side by side — and it has to be the
 * SAME width the lanes themselves use, or there is a band where the
 * board is one lane and the handle still teaches a drag.
 *
 * Two literals cannot be shared: a container query's threshold is
 * resolved before custom properties exist, so
 * `@container (min-inline-size: var(--cq-lg))` is invalid CSS and
 * `48rem` has to be written out. The lanes get theirs from the
 * generated `cq-lg` variant; the handle writes Tailwind's own
 * `@min-[…]/board:`, because that is the only form that can name a
 * container. This test is what keeps the two from drifting.
 */
const directory = import.meta.dirname

test("the handle's own breakpoint is the scale's `cq-lg`, spelled out", async () => {
  const source = await readFile(
    join(directory, "BoardCard.tsx"),
    "utf8",
  )

  const thresholds = [
    ...source.matchAll(/@min-\[([^\]]+)\]\/board:/g),
  ].map((match) => match[1])

  // The mutation guard: a refactor that renames the variant would
  // otherwise turn the assertion below into `[] === []`.
  expect(thresholds.length).toBeGreaterThan(0)

  expect([...new Set(thresholds)]).toEqual([
    containerQuery.lg,
  ])
})

/**
 * The other half. A named query with no container of that name
 * never matches anything — no error, no warning, and the handle
 * silently keeps whichever affordance the base classes gave it.
 */
test("the board declares the `board` container the handle queries", async () => {
  const source = await readFile(
    join(directory, "Board.tsx"),
    "utf8",
  )

  expect(source).toContain('"@container/board"')
})
