import { afterEach, describe, expect, test } from "vitest"

import {
  createCiTimeouts,
  createViewportInstances,
  createVitestConfig,
} from "./index.js"

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
    })
    expect(
      config.test.browser.instances.every(
        ({ browser }) => browser === "chromium",
      ),
    ).toBe(true)
  })

  test("runs every browser test in all four named windows", () => {
    const { instances } = createVitestConfig().test.browser

    expect(instances).toEqual([
      {
        browser: "chromium",
        name: "chromium-narrow",
        provide: { viewport: "narrow" },
        viewport: { height: 824, width: 384 },
      },
      {
        browser: "chromium",
        name: "chromium-tall",
        provide: { viewport: "tall" },
        viewport: { height: 1920, width: 1080 },
      },
      {
        browser: "chromium",
        name: "chromium-wide",
        provide: { viewport: "wide" },
        viewport: { height: 1080, width: 1920 },
      },
      {
        browser: "chromium",
        name: "chromium-ultrawide",
        provide: { viewport: "ultrawide" },
        viewport: { height: 1440, width: 3440 },
      },
    ])
  })

  /*
   * `mergeConfig` concatenates arrays, so without the replacement an
   * app naming one window would silently run five.
   */
  test("lets an app's own instances REPLACE the four, not add to them", () => {
    const config = createVitestConfig({
      test: {
        browser: {
          instances: createViewportInstances({
            names: ["wide"],
          }),
        },
      },
    })

    expect(
      config.test.browser.instances.map(({ name }) => name),
    ).toEqual(["chromium-wide"])
  })

  /*
   * Vitest refuses to start when two projects in one run define the
   * same instance name, which is what three browser projects that all
   * said `chromium-narrow` did in Charcuterie's own CI.
   */
  test("leads each instance name with the project's name", () => {
    const { instances } = createVitestConfig({
      test: { name: "ui-dom" },
    }).test.browser

    expect(instances.map(({ name }) => name)).toEqual([
      "ui-dom-narrow",
      "ui-dom-tall",
      "ui-dom-wide",
      "ui-dom-ultrawide",
    ])
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
  test("hands the same budget to a hand-rolled config", () => {
    process.env.CI = "true"

    expect(createCiTimeouts()).toEqual({
      hookTimeout: 30_000,
      testTimeout: 30_000,
    })

    delete process.env.CI

    expect(createCiTimeouts()).toEqual({})
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
