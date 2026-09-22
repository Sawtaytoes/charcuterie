/**
 * A Vitest setup file that makes Testing Library's async budget
 * CI-aware, for the same reason `createVitestConfig` raises Vitest's.
 *
 * Add it to a browser project's `setupFiles`, before the app's own:
 *
 *     setupFiles: [
 *       "@charcuterie/vitest-config/testingLibrarySetup.js",
 *       "./vitest.setup.ts",
 *     ]
 *
 * ⚠️ **`waitFor` does NOT read `testTimeout`.** Testing Library keeps
 * its own clock — `asyncUtilTimeout`, 1000ms by default — so raising
 * Vitest's budget does nothing for it. That is the budget a starved
 * runner blows through first, because 1000ms is the smallest number in
 * the whole stack.
 *
 * On 2026-09-22 mux-magic's `master` went red on ONE browser test:
 * `LinkPicker keyboard > Escape closes the picker`, a `waitFor` on a
 * picker that closes synchronously, reported after 1632ms while its
 * 3820 siblings passed on the same run.
 *
 * ⚠️ `@testing-library/dom` is an OPTIONAL peer. Only a project that
 * lists this file in `setupFiles` ever loads it, so a node suite with
 * no Testing Library is unaffected.
 */

import { configure } from "@testing-library/dom"

/**
 * Ten times the default, and still well inside the 30s this fleet
 * gives a test on CI — so a genuinely stuck `waitFor` still fails as a
 * `waitFor`, with Testing Library's own DOM dump, rather than as a
 * bare Vitest timeout with nothing to read.
 */
export const CI_ASYNC_UTIL_TIMEOUT = 10_000

/**
 * Exported so the suite can drive both branches without re-importing
 * this module, which Vite's import analysis refuses.
 *
 * @param {(options: { asyncUtilTimeout: number }) => void} [configureTestingLibrary]
 * @returns {boolean} whether the budget was raised
 */
export const applyCiAsyncUtilTimeout = (
  configureTestingLibrary = configure,
) => {
  if (!process.env.CI) {
    return false
  }

  configureTestingLibrary({
    asyncUtilTimeout: CI_ASYNC_UTIL_TIMEOUT,
  })

  return true
}

applyCiAsyncUtilTimeout()
