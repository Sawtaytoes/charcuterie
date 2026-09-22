/**
 * Shared Playwright config factory for the Charcuterie fleet's
 * web-UI apps.
 *
 * Factory, not a static file: the shared defaults (a chromium
 * project, CI-aware retries/workers/timeouts, trace-on-first-retry,
 * the HTML reporter) come from here; each app supplies `testDir`,
 * `webServer`, and `use.baseURL`. Wiring Playwright consistently
 * across the web apps is exactly what this closes — several have a
 * web surface but no Playwright, or wire it differently.
 */

import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright's own defaults — 5s for an assertion, 30s for a test —
 * are a budget for a machine running one suite.
 *
 * This fleet's runner is not that machine. It takes every repo's jobs,
 * and one merge round puts several repos' CI plus image builds on it
 * at the same time. On 2026-09-22 mail-sifter's `e2e-tests` job lost
 * `getByRole("dialog")` inside 5s on two consecutive retries, on a
 * commit whose other 55 tests passed, which passed on its own pull
 * request four minutes earlier, and which passes locally. Five repos'
 * jobs and two image builds were on the host in that window. The same
 * spec already carried a written note about an earlier timeout of the
 * same kind, so this is the second occurrence, not the first.
 *
 * A larger budget costs a PASSING assertion nothing — it resolves the
 * moment the element appears, not when the clock runs out. It changes
 * only how long a FAILING one waits, and only on CI, so a real hang
 * still fails fast on a developer's machine.
 *
 * ⚠️ This is a budget, not a fix for a flaky test. A test that fails
 * because it races its own application still fails; raise this only
 * when the evidence is machine starvation.
 */
const CI_EXPECT_TIMEOUT = 15_000
const CI_TEST_TIMEOUT = 90_000

/**
 * @param {import("@playwright/test").PlaywrightTestConfig} [overrides]
 * @returns a Playwright config with the shared defaults applied.
 */
export const createPlaywrightConfig = (overrides = {}) => {
  const {
    expect = {},
    use = {},
    projects,
    ...rest
  } = overrides

  /*
   * Read at CALL time, not at module load. Playwright evaluates this
   * config once per run, so the answer is the same either way — and a
   * test can set the variable and call the factory rather than import
   * a fresh copy of the module, which Vite's import analysis refuses.
   */
  const isCi = Boolean(process.env.CI)

  return defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: isCi,
    retries: isCi ? 2 : 0,
    workers: isCi ? 1 : undefined,
    reporter: "html",
    timeout: isCi ? CI_TEST_TIMEOUT : 30_000,
    expect: {
      timeout: isCi ? CI_EXPECT_TIMEOUT : 5_000,
      ...expect,
    },
    use: {
      trace: "on-first-retry",
      ...use,
    },
    projects: projects ?? [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
      },
    ],
    ...rest,
  })
}
