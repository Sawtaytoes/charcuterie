# @charcuterie/playwright-config

A shared Playwright config **factory** for the Charcuterie fleet's web-UI apps. The
shared defaults — a chromium project, CI-aware retries/workers, trace-on-first-retry,
the HTML reporter — come from here; each app supplies `testDir`, `webServer`, and
`use.baseURL`.

## Usage

```ts
// playwright.config.ts
import { createPlaywrightConfig } from "@charcuterie/playwright-config"

export default createPlaywrightConfig({
  testDir: "./web/tests",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
```

`projects` and `use` are merged intelligently (pass `projects` to replace the default
chromium-only matrix; pass `use` to extend it). `@playwright/test` is a peer dependency —
the app owns the Playwright version; Renovate bumps this package's range fleet-wide.
