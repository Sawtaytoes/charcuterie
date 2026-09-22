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

import { createRequire } from "node:module"

import { defineConfig, mergeConfig } from "vitest/config"

const requireFromHere = createRequire(import.meta.url)

const baseConfig = defineConfig({
  test: {
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
 * Chromium through Playwright — the default, and the only
 * environment where a Charcuterie component's focus, ARIA and
 * computed styles mean anything. It is also the only place a
 * container query resolves.
 *
 * ⚠️ **Resolved lazily, and that is the whole point of this
 * function existing.** `@vitest/browser-playwright` used to be a
 * top-level `import`, which made the module unloadable for a
 * consumer that has no browser suite at all — a `node:fs` mock
 * harness or a contracts package could not so much as *read* its
 * own config without installing a browser provider it never runs.
 * Four repos hit that on one afternoon.
 */
const createBrowserConfig = () =>
  defineConfig({
    test: {
      browser: {
        enabled: true,
        provider: requireFromHere(
          "@vitest/browser-playwright",
        ).playwright(),
        headless: true,
        instances: [{ browser: "chromium" }],
      },
    },
  })

/**
 * @param {import("vitest/config").UserConfig} [overrides]
 * @returns the merged Vitest config — deep-merged over the shared base.
 */
export const createVitestConfig = (overrides = {}) => {
  // `browser: { enabled: false }` is read BEFORE the merge, so a node
  // suite never resolves the provider package. Reading it after would
  // defeat the laziness above: the value would already be needed to
  // build the object being merged.
  const isBrowserEnabled =
    overrides?.test?.browser?.enabled !== false

  const base = isBrowserEnabled
    ? mergeConfig(baseConfig, createBrowserConfig())
    : baseConfig

  return mergeConfig(base, defineConfig(overrides))
}
