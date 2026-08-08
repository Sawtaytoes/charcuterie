import type { UserConfig } from "vitest/config"

/**
 * The shared Vitest config factory. Deep-merges `overrides` over the
 * Charcuterie base (globals, excludes, v8 coverage).
 */
export declare const createVitestConfig: (
  overrides?: UserConfig,
) => UserConfig
