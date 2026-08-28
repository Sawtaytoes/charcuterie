import { describe, expect, test } from "vitest"

import { createVitestConfig } from "./index.js"

describe("createVitestConfig", () => {
  test("runs DOM tests in Chromium through Playwright by default", () => {
    const config = createVitestConfig()

    expect(config.test.browser).toMatchObject({
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
    })
  })
})
