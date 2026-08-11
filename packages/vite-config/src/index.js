/**
 * Shared Vite config factory for the Charcuterie fleet.
 *
 * A lean preset: the build/server defaults every app wants, with
 * plugins left to the caller so a React SPA, an Electron renderer,
 * and a library build can each spread it and add their own. That
 * is what lets one package serve divergent apps (image-viewer's
 * Electron trio calls it once per target with different overrides)
 * without forcing them into one shape.
 */

import { defineConfig, mergeConfig } from "vite"

const baseConfig = defineConfig({
  build: {
    /**
     * NO `target` here, deliberately — do not put it back.
     *
     * This base used to set `target: "esnext"`. Vite derives
     * `build.cssTarget` from `build.target` when `cssTarget` is
     * not given, so that one line silently made the CSS target
     * `esnext` too, and at that level lightningcss stops emitting
     * the `-webkit-` prefixes Safari still needs. Every consumer
     * lost `-webkit-user-select` (so `select-none` does nothing),
     * `-webkit-backdrop-filter` (blurred surfaces render flat)
     * and `-webkit-text-decoration` the moment it adopted this
     * package — no error, no warning, nothing visible until
     * someone opened the app on an iPhone.
     *
     * Pinning `cssTarget` on its own is NOT an option: it takes
     * esbuild-style browser strings and rejects Vite's keyword
     * outright (`Unsupported target "baseline-widely-available"`).
     * So the fix is to stop overriding `target` and let Vite's
     * own default — which is chosen to be browser-safe — apply to
     * both JS and CSS.
     *
     * An app that genuinely wants `esnext` (an Electron renderer,
     * say, where the runtime is a known Chromium) sets it in its
     * own override, where the choice is visible.
     */
    sourcemap: true,
    reportCompressedSize: false,
  },
  server: {
    host: true,
  },
})

/**
 * @param {import("vite").UserConfig} [overrides]
 * @returns the merged Vite config — deep-merged over the shared base.
 */
export const createViteConfig = (overrides = {}) =>
  mergeConfig(baseConfig, defineConfig(overrides))
