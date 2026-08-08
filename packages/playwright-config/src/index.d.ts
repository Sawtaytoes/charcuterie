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
