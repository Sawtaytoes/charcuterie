#!/usr/bin/env node

/**
 * CI step: assert a package's `optimizeDeps.include` still matches what
 * Vite's optimizer actually optimized.
 *
 * Run it AFTER the test suite in the same job — the optimizer writes its
 * metadata as it discovers, so before a run there is nothing to compare
 * and mid-run the picture is incomplete:
 *
 *   - run: yarn vitest run
 *   - run: yarn charcuterie-check-optimize-deps ./optimizeDeps.js
 *
 * The argument is a module that exports the SAME array the Vitest config
 * spreads into `optimizeDeps.include`. Exporting the list from its own
 * module — rather than inlining it in `vitest.config.ts` — is what lets a
 * plain Node process read it without loading a Vite config.
 *
 * Exits 1 with the names to add when the list has drifted.
 */

import { resolve } from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"

import {
  checkOptimizeDepsParity,
  formatOptimizeDepsParityReport,
} from "../checkOptimizeDeps.js"

const args = process.argv.slice(2)

const getFlag = (name, fallback) => {
  const index = args.indexOf(`--${name}`)

  return index === -1 ? fallback : args[index + 1]
}

const positional = args.filter(
  (arg, index) =>
    !arg.startsWith("--") &&
    !args[index - 1]?.startsWith("--"),
)

const listModule = positional[0]

if (!listModule) {
  console.error(
    "Usage: charcuterie-check-optimize-deps <path-to-list-module> [--cache-dir <dir>] [--allow-extra]",
  )
  process.exit(2)
}

const cacheDir = resolve(
  getFlag("cache-dir", "node_modules/.vite"),
)
const isExtraAllowed = args.includes("--allow-extra")

const imported = await import(
  pathToFileURL(resolve(listModule)).href
)
const include =
  imported.optimizeDepsInclude ?? imported.default

if (!Array.isArray(include)) {
  console.error(
    `${listModule} must export an array as \`optimizeDepsInclude\` or as its default export.`,
  )
  process.exit(2)
}

let result

try {
  result = checkOptimizeDepsParity({ cacheDir, include })
} catch (error) {
  console.error(
    error instanceof Error ? error.message : error,
  )
  process.exit(2)
}

const isDrifted =
  result.missing.length > 0 ||
  (result.extra.length > 0 && !isExtraAllowed)

console[isDrifted ? "error" : "log"](
  formatOptimizeDepsParityReport(result),
)

process.exit(isDrifted ? 1 : 0)
