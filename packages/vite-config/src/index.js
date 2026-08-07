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
    target: "esnext",
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
