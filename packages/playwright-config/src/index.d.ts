import type { PlaywrightTestConfig } from "@playwright/test"

/**
 * The shared Playwright config factory. Applies the Charcuterie
 * defaults (chromium project, CI-aware retries/workers, HTML
 * reporter, trace-on-first-retry); the app supplies testDir,
 * webServer, and use.baseURL.
 */
export declare const createPlaywrightConfig: (
  overrides?: PlaywrightTestConfig,
) => PlaywrightTestConfig

/**
 * One Chromium project per named viewport — all four by default.
 * `testInfo.project.metadata.viewport` names the window in a test.
 */
export declare const createViewportProjects: (
  names?: readonly import("@charcuterie/vitest-config/viewports.js").ViewportName[],
) => import("@playwright/test").Project[]
