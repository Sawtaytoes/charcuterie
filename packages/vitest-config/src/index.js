/**
 * Shared Vitest config factory for the Charcuterie fleet.
 *
 * Ships a factory, not a static file: each app calls
 * `createVitestConfig({ ... })` and supplies its own 20% (project
 * name, setup files, extra `test` fields) while the shared
 * defaults — globals, sensible excludes, CI-aware timeouts, v8
 * coverage — come from here. Mirrors `@charcuterie/eslint-config`'s
 * factory-not-fixed-array shape, so one package serves apps whose
 * suites otherwise diverge.
 */

import { createRequire } from "node:module"

import { defineConfig, mergeConfig } from "vitest/config"

const requireFromHere = createRequire(import.meta.url)

/**
 * Vitest's own default — 5s for a test — is a budget for a machine
 * running one suite.
 *
 * This fleet's runner is not that machine. It takes every repo's
 * jobs, and one merge round puts several repos' CI plus image builds
 * on it at the same time. On 2026-09-22 mail-sifter's `unit-tests`
 * job timed out on ONE synchronous better-sqlite3 test — no `await`
 * in it, 33ms on this workstation — while its 65 siblings in the same
 * file passed. That is a 150x slowdown, which is machine starvation
 * and not a defect in the test.
 *
 * A larger budget costs a PASSING test nothing: the clock stops when
 * the test returns. It changes only how long a hung one waits, and
 * only on CI.
 *
 * ⚠️ This is a budget, not a cure for a slow test. A suite that is
 * slow because it does too much work is still slow. Raise this only
 * when the evidence is machine starvation.
 */
const CI_TIMEOUT = 30_000

/*
 * `process.env.CI` is read at CALL time, not at module load: a test
 * can then set the variable and call the factory, rather than import
 * a fresh copy of the module — which Vite's import analysis refuses.
 * Vitest evaluates this config once per run, so the answer is the
 * same either way.
 */
const createBaseConfig = () => {
  const isCi = Boolean(process.env.CI)

  return defineConfig({
    test: {
      globals: true,
      testTimeout: isCi ? CI_TIMEOUT : 5_000,
      hookTimeout: isCi ? CI_TIMEOUT : 10_000,
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
}

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

  const baseConfig = createBaseConfig()

  const base = isBrowserEnabled
    ? mergeConfig(baseConfig, createBrowserConfig())
    : baseConfig

  return mergeConfig(base, defineConfig(overrides))
}
