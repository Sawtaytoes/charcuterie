export interface OptimizeDepsParityResult {
  /**
   * Optimized but not declared — each one is a re-optimization waiting to
   * fire mid-run.
   */
  missing: string[]
  /** Declared but never optimized — harmless, but the list is drifting. */
  extra: string[]
  /** Every entry point Vite optimized. */
  optimized: string[]
  /** The `_metadata.json` the result was read from. */
  metadataFile: string
}

export interface CheckOptimizeDepsParityOptions {
  /** The declared `optimizeDeps.include` list. */
  include: readonly string[]
  /**
   * The package's `node_modules/.vite` directory. Note this lives beside
   * the package, not at the repo root.
   */
  cacheDir: string
}

/**
 * Compares a declared `optimizeDeps.include` against the optimizer's own
 * `_metadata.json`. Run it AFTER the suite — discovery happens as modules
 * import, so mid-run the metadata is still filling up.
 *
 * @throws if no optimizer metadata exists under `cacheDir` yet.
 */
export function checkOptimizeDepsParity(
  options: CheckOptimizeDepsParityOptions,
): OptimizeDepsParityResult

/** Formats a parity result as a human-readable report. */
export function formatOptimizeDepsParityReport(
  result: OptimizeDepsParityResult,
): string
