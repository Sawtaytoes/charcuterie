import { afterEach, describe, expect, test } from "vitest"

import { createVitestConfig } from "./index.js"

const originalCi = process.env.CI

afterEach(() => {
  if (originalCi === undefined) {
    delete process.env.CI
  } else {
    process.env.CI = originalCi
  }
})

/** A node suite, so the browser provider is never resolved here. */
const nodeOverrides = {
  test: { browser: { enabled: false } },
}

describe("createVitestConfig", () => {
  test("runs DOM tests in Chromium through Playwright by default", () => {
    const config = createVitestConfig()

    expect(config.test.browser).toMatchObject({
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
    })
  })

  test("gives a test 30s on CI, where the runner is shared", () => {
    process.env.CI = "true"

    expect(
      createVitestConfig(nodeOverrides).test,
    ).toMatchObject({
      testTimeout: 30_000,
      hookTimeout: 30_000,
    })
  })

  test("keeps Vitest's own 5s off CI, so a hung test fails fast", () => {
    delete process.env.CI

    expect(
      createVitestConfig(nodeOverrides).test,
    ).toMatchObject({
      testTimeout: 5_000,
      hookTimeout: 10_000,
    })
  })

  test("an app's own timeout wins over the shared one", () => {
    process.env.CI = "true"

    expect(
      createVitestConfig({
        test: {
          browser: { enabled: false },
          testTimeout: 1_000,
        },
      }).test,
    ).toMatchObject({ testTimeout: 1_000 })
  })
})
