import type { UserConfig } from "vitest/config"

/**
 * The shared Vitest config factory. Deep-merges `overrides` over the
 * Charcuterie base (globals, excludes, v8 coverage).
 */
export declare const createVitestConfig: (
  overrides?: UserConfig,
) => UserConfig

/**
 * One Chromium browser instance per named viewport — all four by
 * default. Pass a subset when a suite genuinely needs fewer windows
 * (a visual-regression suite whose baselines cost storage, say).
 */
export declare const createViewportInstances: (
  names?: readonly import("./viewports.js").ViewportName[],
) => {
  browser: "chromium"
  name: string
  provide: {
    viewport: import("./viewports.js").ViewportName
  }
  viewport: { height: number; width: number }
}[]

export {
  type Viewport,
  type ViewportName,
  viewportNames,
  viewports,
} from "./viewports.js"
