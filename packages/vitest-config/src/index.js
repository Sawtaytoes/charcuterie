/**
 * Shared Vitest config factory for the Charcuterie fleet.
 *
 * Ships a factory, not a static file: each app calls
 * `createVitestConfig({ ... })` and supplies its own 20% (project
 * name, setup files, extra `test` fields) while the shared
 * defaults — globals, sensible excludes, v8 coverage — come from
 * here. Mirrors `@charcuterie/eslint-config`'s
 * factory-not-fixed-array shape, so one package serves apps whose
 * suites otherwise diverge.
 */

import { playwright } from "@vitest/browser-playwright"
import { defineConfig, mergeConfig } from "vitest/config"

const baseConfig = defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
    globals: true,
    exclude: [
      "**/dist/**",
      "**/node_modules/**",
      "**/storybook-static/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "**/dist/**",
        "**/*.config.*",
        "**/*.stories.*",
      ],
    },
  },
})

/**
 * @param {import("vitest/config").UserConfig} [overrides]
 * @returns the merged Vitest config — deep-merged over the shared base.
 */
export const createVitestConfig = (overrides = {}) =>
  mergeConfig(baseConfig, defineConfig(overrides))
