import { afterEach, describe, expect, test } from "vitest"

import { createPlaywrightConfig } from "./index.js"

const originalCi = process.env.CI

afterEach(() => {
  if (originalCi === undefined) {
    delete process.env.CI
  } else {
    process.env.CI = originalCi
  }
})

describe("createPlaywrightConfig", () => {
  test("gives an assertion 15s on CI, where the runner is shared", () => {
    process.env.CI = "true"

    expect(createPlaywrightConfig()).toMatchObject({
      expect: { timeout: 15_000 },
      timeout: 90_000,
    })
  })

  test("keeps Playwright's own 5s off CI, so a real hang fails fast", () => {
    delete process.env.CI

    expect(createPlaywrightConfig()).toMatchObject({
      expect: { timeout: 5_000 },
      timeout: 30_000,
    })
  })

  test("an app's own timeout wins over the shared one", () => {
    process.env.CI = "true"

    expect(
      createPlaywrightConfig({
        expect: { timeout: 1_000 },
        timeout: 2_000,
      }),
    ).toMatchObject({
      expect: { timeout: 1_000 },
      timeout: 2_000,
    })
  })
})
