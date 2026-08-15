import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

import {
  checkOptimizeDepsParity,
  formatOptimizeDepsParityReport,
} from "./checkOptimizeDeps.js"

/**
 * Writes a `_metadata.json` where Vite would, so the check reads a real
 * file layout rather than a mock. The nesting matters: the hash directory
 * is discovered, not known.
 */
const makeCacheDir = (optimizedKeys) => {
  const cacheDir = mkdtempSync(join(tmpdir(), "optdeps-"))
  const depsDir = join(
    cacheDir,
    "vitest",
    "abc123hash",
    "deps",
  )

  mkdirSync(depsDir, { recursive: true })
  writeFileSync(
    join(depsDir, "_metadata.json"),
    JSON.stringify({
      optimized: Object.fromEntries(
        optimizedKeys.map((key) => [
          key,
          { file: `${key}.js` },
        ]),
      ),
    }),
  )

  return cacheDir
}

describe("checkOptimizeDepsParity", () => {
  test("reports nothing when the list matches", () => {
    const cacheDir = makeCacheDir(["react", "react-dom"])

    const result = checkOptimizeDepsParity({
      cacheDir,
      include: ["react", "react-dom"],
    })

    expect(result.missing).toEqual([])
    expect(result.extra).toEqual([])
  })

  test("flags a dep that was optimized but not declared", () => {
    const cacheDir = makeCacheDir([
      "react",
      "@charcuterie/logic/query",
    ])

    const result = checkOptimizeDepsParity({
      cacheDir,
      include: ["react"],
    })

    expect(result.missing).toEqual([
      "@charcuterie/logic/query",
    ])
  })

  test("treats each subpath as its own entry", () => {
    // The whole bug: listing the package does NOT cover its subpaths.
    const cacheDir = makeCacheDir([
      "@charcuterie/logic",
      "@charcuterie/logic/query",
    ])

    const result = checkOptimizeDepsParity({
      cacheDir,
      include: ["@charcuterie/logic"],
    })

    expect(result.missing).toEqual([
      "@charcuterie/logic/query",
    ])
  })

  test("ignores Vite's transitive `parent > child` rows", () => {
    const cacheDir = makeCacheDir([
      "react",
      "vitest > @vitest/expect > chai",
    ])

    const result = checkOptimizeDepsParity({
      cacheDir,
      include: ["react"],
    })

    expect(result.missing).toEqual([])
  })

  test("flags a declared entry that was never optimized", () => {
    const cacheDir = makeCacheDir(["react"])

    const result = checkOptimizeDepsParity({
      cacheDir,
      include: ["react", "jotai"],
    })

    expect(result.extra).toEqual(["jotai"])
  })

  test("explains itself when no run has happened yet", () => {
    const cacheDir = mkdtempSync(
      join(tmpdir(), "optdeps-empty-"),
    )

    expect(() =>
      checkOptimizeDepsParity({ cacheDir, include: [] }),
    ).toThrow(/Run the test suite first/)
  })
})

describe("formatOptimizeDepsParityReport", () => {
  test("prints the missing names in paste-ready form", () => {
    const cacheDir = makeCacheDir([
      "@charcuterie/logic/query",
    ])

    const report = formatOptimizeDepsParityReport(
      checkOptimizeDepsParity({ cacheDir, include: [] }),
    )

    expect(report).toContain('"@charcuterie/logic/query",')
    expect(report).toContain("subpath is its own entry")
  })

  test("says so plainly when everything matches", () => {
    const cacheDir = makeCacheDir(["react"])

    const report = formatOptimizeDepsParityReport(
      checkOptimizeDepsParity({
        cacheDir,
        include: ["react"],
      }),
    )

    expect(report).toContain("matches the optimizer")
  })
})
