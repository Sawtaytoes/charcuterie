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

  /*
   * Vitest resolves `testTimeout ??= browser.enabled ? 15_000 : 5_000`
   * and `hookTimeout ??= browser.enabled ? 30_000 : 10_000`. Naming
   * either number here would cut a browser suite to a third of its
   * budget, so off CI the factory must leave both UNSET and let
   * Vitest choose for the mode the project actually runs in.
   */
  test("names no timeout off CI, so Vitest's mode-aware default stands", () => {
    delete process.env.CI

    const nodeConfig =
      createVitestConfig(nodeOverrides).test
    const browserConfig = createVitestConfig().test

    expect(nodeConfig.testTimeout).toBeUndefined()
    expect(nodeConfig.hookTimeout).toBeUndefined()
    expect(browserConfig.testTimeout).toBeUndefined()
    expect(browserConfig.hookTimeout).toBeUndefined()
  })

  /*
   * A setup file for a browser project runs in the browser, where
   * `process` does not exist. The flag has to cross that boundary as
   * a literal or `testingLibrarySetup.js` throws on import and takes
   * the whole test file with it.
   */
  test("hands the CI flag to the browser through define", () => {
    process.env.CI = "true"

    expect(createVitestConfig().define).toMatchObject({
      "import.meta.env.CHARCUTERIE_CI": "true",
    })
  })

  test("hands over a false flag off CI, rather than nothing", () => {
    delete process.env.CI

    expect(createVitestConfig().define).toMatchObject({
      "import.meta.env.CHARCUTERIE_CI": "false",
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
