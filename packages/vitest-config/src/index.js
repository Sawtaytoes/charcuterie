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

import { viewportNames, viewports } from "./viewports.js"

const requireFromHere = createRequire(import.meta.url)

/**
 * Vitest's own defaults — 5s for a test in node, 15s in a browser —
 * are budgets for a machine running one suite.
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
/**
 * The CI budget on its own, for a config that cannot adopt the whole
 * factory — Charcuterie's Storybook and DOM projects are hand-rolled
 * and sat on Vitest's 15s browser default until four test windows
 * multiplied the runner's load and a 4s story took 17s (CI,
 * 2026-10-05). Spread it into `test`. Off CI it is empty, for the
 * reason below.
 *
 * @returns {{ hookTimeout?: number, testTimeout?: number }}
 */
export const createCiTimeouts = () =>
  process.env.CI
    ? {
        hookTimeout: CI_TIMEOUT,
        testTimeout: CI_TIMEOUT,
      }
    : {}

const createBaseConfig = () =>
  defineConfig({
    test: {
      globals: true,
      /*
       * ⚠️ On CI ONLY. Off CI this factory names no number at all,
       * because Vitest's own defaults are MODE-AWARE and naming one
       * here would lower them:
       *
       *   testTimeout ??= browser.enabled ? 15_000 : 5_000
       *   hookTimeout ??= browser.enabled ? 30_000 : 10_000
       *
       * 1.2.0 wrote `5_000` and `10_000` off CI, which restated the
       * node defaults and quietly CUT every browser suite's budget to
       * a third. mux-magic's two preview-modal stories take about ten
       * seconds each; they passed for months on the 15s browser
       * default and failed the moment their project adopted this
       * factory.
       */
      ...createCiTimeouts(),
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
    /*
     * ⚠️ How `testingLibrarySetup.js` learns it is on CI.
     *
     * A setup file for a BROWSER project runs in the browser, where
     * `process` does not exist at all — reading `process.env.CI`
     * there throws `ReferenceError: process is not defined` and takes
     * the whole test file down with it. Vite only ever substitutes
     * `process.env.NODE_ENV`, so the flag has to be handed over
     * deliberately.
     *
     * This config is evaluated in node, so it knows the answer. Vite
     * replaces the expression at transform time and the browser sees
     * a literal.
     */
    define: {
      "import.meta.env.CHARCUTERIE_CI": JSON.stringify(
        Boolean(process.env.CI),
      ),
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
/** @param {string} [project] the Vitest project name, when there is one */
const createBrowserConfig = (project) =>
  defineConfig({
    test: {
      browser: {
        enabled: true,
        provider: requireFromHere(
          "@vitest/browser-playwright",
        ).playwright(),
        headless: true,
        instances: createViewportInstances({ project }),
      },
    },
  })

/**
 * One Chromium instance per viewport, so every browser test runs in
 * all four windows. Each instance provides its own name, which a test
 * reads with `inject("viewport")` when an assertion only makes sense
 * in some of them.
 *
 * ⚠️ Vitest wants every instance name unique across the WHOLE run, not
 * just within one project. A repo whose root config lists three
 * browser projects would otherwise define `chromium-narrow` three times
 * and refuse to start, so the name leads with the project's own name
 * when it has one: `ui-dom-narrow`, `storybook-narrow`. One window
 * across every project is `vitest --project '*-narrow'`.
 *
 * @param {{
 *   names?: readonly import("./viewports.js").ViewportName[],
 *   project?: string,
 * }} [options]
 */
export const createViewportInstances = ({
  names = viewportNames,
  project = "chromium",
} = {}) =>
  names.map((name) => ({
    browser: "chromium",
    name: `${project}-${name}`,
    provide: { viewport: name },
    viewport: {
      height: viewports[name].height,
      width: viewports[name].width,
    },
  }))

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
    ? mergeConfig(
        baseConfig,
        createBrowserConfig(overrides?.test?.name),
      )
    : baseConfig

  /*
   * `mergeConfig` CONCATENATES arrays. An app that names its own
   * `instances` would otherwise run the four shared windows plus its
   * own — so a caller's list replaces the default instead.
   */
  const overrideInstances =
    overrides?.test?.browser?.instances

  const merged = mergeConfig(base, defineConfig(overrides))

  if (isBrowserEnabled && overrideInstances) {
    merged.test.browser.instances = overrideInstances
  }

  return merged
}

export { viewportNames, viewports } from "./viewports.js"
