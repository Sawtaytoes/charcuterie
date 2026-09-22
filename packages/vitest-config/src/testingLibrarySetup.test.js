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
