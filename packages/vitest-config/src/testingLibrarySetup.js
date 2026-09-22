/**
 * The fleet's CI-aware budget for Testing Library's own clock.
 *
 * ⚠️ **`waitFor` does NOT read `testTimeout`.** Testing Library keeps
 * its own clock — `asyncUtilTimeout`, 1000ms by default — so raising
 * Vitest's budget does nothing for it. 1000ms is the smallest number
 * in the whole stack, which makes it the first budget a starved
 * shared runner blows through.
 *
 * On 2026-09-22 mux-magic's `master` went red on ONE browser test:
 * `LinkPicker keyboard > Escape closes the picker`, a `waitFor` on a
 * picker that closes synchronously, reported after 1632ms while its
 * 3820 siblings passed on the same run.
 *
 * Call it from the app's OWN setup file:
 *
 *     import { configure } from "@testing-library/react"
 *     import { applyCiAsyncUtilTimeout } from "@charcuterie/vitest-config/testingLibrarySetup.js"
 *
 *     applyCiAsyncUtilTimeout(configure)
 *
 * ⚠️ **The APP passes its own `configure`, and this module imports no
 * Testing Library at all.** A browser project pre-bundles its
 * dependencies through `optimizeDeps`, and a bare
 * `import { configure } from "@testing-library/dom"` inside
 * `node_modules` is outside that list — it failed in mux-magic with
 * *"does not provide an export named 'elementRoles'"* from
 * `aria-query`, a CJS dependency Vite had not pre-bundled for this
 * entry. Taking `configure` as an argument makes the import the
 * app's, from source Vite already handles, and means this package
 * needs no Testing Library dependency of any kind.
 */

/**
 * Ten times the default, and still well inside the 30s this fleet
 * gives a test on CI — so a genuinely stuck `waitFor` still fails as a
 * `waitFor`, with Testing Library's own DOM dump, rather than as a
 * bare Vitest timeout with nothing to read.
 */
export const CI_ASYNC_UTIL_TIMEOUT = 10_000

/**
 * `createVitestConfig` substitutes `import.meta.env.CHARCUTERIE_CI`
 * through Vite's `define`, because a browser has no `process` at all
 * and reading `process.env.CI` there throws.
 *
 * @returns {boolean}
 */
export const getIsCi = () => {
  /*
   * Node first, and deliberately. Vitest maps `import.meta.env` onto
   * `process.env` in a node run, so reaching for it there buys
   * nothing and only adds a way to fail.
   */
  if (typeof process !== "undefined" && process.env?.CI) {
    return true
  }

  return Boolean(import.meta.env?.CHARCUTERIE_CI)
}

/**
 * @param {(options: { asyncUtilTimeout: number }) => void} configureTestingLibrary
 *   Testing Library's own `configure`, imported by the app.
 * @returns {boolean} whether the budget was raised
 */
export const applyCiAsyncUtilTimeout = (
  configureTestingLibrary,
) => {
  if (!getIsCi()) {
    return false
  }

  configureTestingLibrary({
    asyncUtilTimeout: CI_ASYNC_UTIL_TIMEOUT,
  })

  return true
}
