import { describe, expect, test } from "vitest"

import { createViteConfig } from "./index.js"

describe("createViteConfig", () => {
  /**
   * The regression this package shipped once already.
   *
   * Vite derives `build.cssTarget` from `build.target` when
   * `cssTarget` is not given. The base used to set
   * `target: "esnext"`, which made the CSS target `esnext` too and
   * dropped the `-webkit-` prefixes Safari needs — silently, in
   * every consumer, with no build error.
   *
   * Pinning `cssTarget` instead is not available: lightningcss
   * rejects Vite's keyword (`Unsupported target
   * "baseline-widely-available"`). So the base must simply not set
   * `target`, and this test is what says so out loud.
   */
  test("does not set build.target, so cssTarget keeps Vite's browser-safe default", () => {
    const config = createViteConfig()

    expect(config.build?.target).toBeUndefined()
    expect(config.build?.cssTarget).toBeUndefined()
  })

  test("still supplies the shared build defaults", () => {
    const config = createViteConfig()

    expect(config.build?.sourcemap).toBe(true)
    expect(config.build?.reportCompressedSize).toBe(false)
    expect(config.server?.host).toBe(true)
  })

  test("an app that genuinely wants esnext can still opt in", () => {
    const config = createViteConfig({
      build: { target: "esnext" },
    })

    expect(config.build?.target).toBe("esnext")
  })

  test("overrides deep-merge rather than replace the build block", () => {
    const config = createViteConfig({
      build: { sourcemap: "hidden", outDir: "dist" },
    })

    expect(config.build?.sourcemap).toBe("hidden")
    expect(config.build?.outDir).toBe("dist")
    // Untouched keys survive the merge.
    expect(config.build?.reportCompressedSize).toBe(false)
  })
})
