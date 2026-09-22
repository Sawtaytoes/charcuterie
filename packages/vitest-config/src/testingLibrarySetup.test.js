import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import {
  applyCiAsyncUtilTimeout,
  CI_ASYNC_UTIL_TIMEOUT,
  getIsCi,
} from "./testingLibrarySetup.js"

const originalCi = process.env.CI

afterEach(() => {
  if (originalCi === undefined) {
    delete process.env.CI
  } else {
    process.env.CI = originalCi
  }
})

describe("applyCiAsyncUtilTimeout", () => {
  test("raises Testing Library's own clock on CI", () => {
    process.env.CI = "true"
    const configure = vi.fn()

    expect(applyCiAsyncUtilTimeout(configure)).toBe(true)
    expect(configure).toHaveBeenCalledWith({
      asyncUtilTimeout: CI_ASYNC_UTIL_TIMEOUT,
    })
  })

  /*
   * Off CI a `waitFor` that the application never satisfies should
   * fail in a second, not in ten. The budget exists for a starved
   * shared runner, and a workstation is not one.
   */
  test("leaves the 1000ms default alone off CI", () => {
    delete process.env.CI
    const configure = vi.fn()

    expect(applyCiAsyncUtilTimeout(configure)).toBe(false)
    expect(configure).not.toHaveBeenCalled()
  })

  test("stays inside the 30s Vitest budget, so waitFor reports first", () => {
    expect(CI_ASYNC_UTIL_TIMEOUT).toBeLessThan(30_000)
  })
})

describe("getIsCi", () => {
  test("reads node's answer when there is one", () => {
    process.env.CI = "true"

    expect(getIsCi()).toBe(true)
  })

  /*
   * ⚠️ The BROWSER branch is not asserted here, and cannot be. Vitest
   * maps `import.meta.env` onto `process.env` in a node run, so
   * deleting the `process` global to fake a browser makes
   * `import.meta.env` itself throw — a failure mode a real browser
   * does not have, where Vite has already substituted a literal.
   *
   * That branch is proven end to end instead: mux-magic's `storybook`
   * project loads this file in chromium, and it threw
   * `ReferenceError: process is not defined` until
   * `createVitestConfig` started handing the flag over through
   * `define`.
   */
})
