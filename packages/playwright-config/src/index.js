/**
 * Shared Playwright config factory for the Charcuterie fleet's
 * web-UI apps.
 *
 * Factory, not a static file: the shared defaults (a chromium
 * project, CI-aware retries/workers, trace-on-first-retry, the
 * HTML reporter) come from here; each app supplies `testDir`,
 * `webServer`, and `use.baseURL`. Wiring Playwright consistently
 * across the web apps is exactly what this closes — several have a
 * web surface but no Playwright, or wire it differently.
 */

import { defineConfig, devices } from "@playwright/test"

const isCi = Boolean(process.env.CI)

/**
 * @param {import("@playwright/test").PlaywrightTestConfig} [overrides]
 * @returns a Playwright config with the shared defaults applied.
 */
export const createPlaywrightConfig = (overrides = {}) => {
  const { use = {}, projects, ...rest } = overrides

  return defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: isCi,
    retries: isCi ? 2 : 0,
    workers: isCi ? 1 : undefined,
    reporter: "html",
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
