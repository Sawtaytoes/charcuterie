/**
 * Checks that a package's `optimizeDeps.include` list matches what Vite's
 * dep optimizer actually optimized.
 *
 * WHY THIS EXISTS — Vite discovers dependencies lazily. One that is not
 * pre-declared gets found part-way through a run, which triggers a
 * re-optimization and reloads the page underneath the running tests. In
 * Vitest browser mode that throws away React's compiler-runtime cache and
 * surfaces as either:
 *
 *   TypeError: Cannot read properties of null (reading 'useMemoCache')
 *   TypeError: Failed to fetch dynamically imported module: …?v=<hash>
 *
 * Neither message names the dependency that is missing, and Vitest reports
 * the second through a `beforeEach`/`afterEach` frame — the least
 * informative place to look.
 *
 * It is a RACE, not a determinate break, so an incomplete list passes
 * until it doesn't. Two fleet repos carried a comment describing this
 * hazard and drifted anyway: the 2026-08-11 query adoption added
 * `@charcuterie/logic/query` imports to seven repos and updated no list.
 * mux-magic lost the race on 2026-08-15 and took 16 tests with it; an
 * audit then found the lists short by three and four entries. A comment
 * asking a human to remember is not a mechanism — this is.
 *
 * Each SUBPATH is its own optimizer entry: `@charcuterie/logic` in the
 * list does NOT cover `@charcuterie/logic/query`.
 *
 * @see docs/decisions/2026-08-15-a-new-subpath-import-must-join-the-consumers-optimizedeps-list.md
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs"
import { join } from "node:path"

/**
 * Vite names transitive deps `parent > child` in the metadata. Those are
 * not entry points and never belong in an `include` list.
 *
 * @param {string} key
 */
const isEntryPoint = (key) => !key.includes(" > ")

/**
 * Locates the optimizer metadata Vite wrote for the last run.
 *
 * The cache lives beside the PACKAGE (`packages/web/node_modules/.vite`),
 * not at the repo root — deleting the root one leaves this warm, which is
 * how a "cold" run can pass and prove nothing.
 *
 * @param {string} cacheDir — a `node_modules/.vite` directory
 * @returns {string | null} path to `_metadata.json`, or null if absent
 */
const findMetadataFile = (cacheDir) => {
  const vitestDir = join(cacheDir, "vitest")

  if (!existsSync(vitestDir)) {
    return null
  }

  for (const hash of readdirSync(vitestDir)) {
    const candidate = join(
      vitestDir,
      hash,
      "deps",
      "_metadata.json",
    )

    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * @typedef {object} OptimizeDepsParityResult
 * @property {string[]} missing — optimized but not declared. These are the
 *   dangerous ones: each is a re-optimization waiting to fire mid-run.
 * @property {string[]} extra — declared but not optimized. Harmless at
 *   runtime, but a sign the list is drifting from reality.
 * @property {string[]} optimized — every entry point Vite optimized.
 * @property {string} metadataFile — where the truth was read from.
 */

/**
 * Compares a declared `optimizeDeps.include` against the optimizer's own
 * `_metadata.json`.
 *
 * Run this AFTER the suite, not inside it: discovery happens as modules
 * import, so mid-run the metadata is still filling up and a check would
 * under-report.
 *
 * @param {object} options
 * @param {readonly string[]} options.include — the declared list
 * @param {string} options.cacheDir — the package's `node_modules/.vite`
 * @returns {OptimizeDepsParityResult}
 */
export const checkOptimizeDepsParity = ({
  include,
  cacheDir,
}) => {
  const metadataFile = findMetadataFile(cacheDir)

  if (!metadataFile) {
    throw new Error(
      `No Vite optimizer metadata under ${cacheDir}. Run the test suite first — ` +
        "this check reads what the optimizer actually did, so it has nothing to " +
        "compare against until a run has happened. Note the cache lives beside " +
        "the package, not at the repo root.",
    )
  }

  const metadata = JSON.parse(
    readFileSync(metadataFile, "utf8"),
  )
  const optimized = Object.keys(metadata.optimized ?? {})
    .filter(isEntryPoint)
    .sort()

  return {
    extra: include
      .filter((name) => !optimized.includes(name))
      .sort(),
    metadataFile,
    missing: optimized
      .filter((name) => !include.includes(name))
      .sort(),
    optimized,
  }
}

/**
 * Formats a parity result as a human-readable report.
 *
 * The message leads with the copy-pasteable fix, because the person
 * reading it is usually mid-PR and does not yet know this failure mode
 * exists.
 *
 * @param {OptimizeDepsParityResult} result
 * @returns {string}
 */
export const formatOptimizeDepsParityReport = ({
  extra,
  metadataFile,
  missing,
  optimized,
}) => {
  if (!missing.length && !extra.length) {
    return `optimizeDeps.include matches the optimizer: ${optimized.length} entries.`
  }

  const lines = []

  if (missing.length) {
    lines.push(
      `${missing.length} dependency/ies were optimized but are NOT in optimizeDeps.include.`,
      "Vite discovered them mid-run, which re-optimizes and reloads the page under",
      "the tests — a race that passes until it doesn't. Add them:",
      "",
      ...missing.map(
        (name) => `      ${JSON.stringify(name)},`,
      ),
      "",
      "Remember each subpath is its own entry: listing a package does not cover its subpaths.",
    )
  }

  if (extra.length) {
    if (lines.length) lines.push("")
    lines.push(
      `${extra.length} entry/ies are declared but were never optimized (stale):`,
      "",
      ...extra.map(
        (name) => `      ${JSON.stringify(name)},`,
      ),
    )
  }

  lines.push("", `Source of truth: ${metadataFile}`)

  return lines.join("\n")
}
