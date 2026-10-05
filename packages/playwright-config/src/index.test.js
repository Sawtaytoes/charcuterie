import { afterEach, describe, expect, test } from "vitest"

import {
  createPlaywrightConfig,
  createViewportProjects,
} from "./index.js"

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

  test("runs the suite once per named window", () => {
    const { projects } = createPlaywrightConfig()

    expect(
      projects.map(({ name, use }) => [
        name,
        use.viewport.width,
        use.viewport.height,
        use.isMobile,
      ]),
    ).toEqual([
      ["chromium-narrow", 384, 824, true],
      ["chromium-tall", 1080, 1920, false],
      ["chromium-wide", 1920, 1080, false],
      ["chromium-ultrawide", 3440, 1440, false],
    ])
  })

  test("renders the phone at its own pixel ratio, with touch", () => {
    const [narrow] = createViewportProjects(["narrow"])

    expect(narrow.use).toMatchObject({
      deviceScaleFactor: 3.75,
      hasTouch: true,
    })
    expect(narrow.metadata).toEqual({ viewport: "narrow" })
  })

  test("an app's own projects still replace the default", () => {
    const projects = [{ name: "only-this" }]

    expect(
      createPlaywrightConfig({ projects }).projects,
    ).toBe(projects)
  })
})
