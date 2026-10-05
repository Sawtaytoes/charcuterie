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
 * default, named `<project>-<viewport>` (`chromium-narrow` when the
 * project has no name). Pass `names` when a suite genuinely needs
 * fewer windows, and `project` in a hand-rolled config whose project
 * has a name, or two browser projects in one run collide.
 */
export declare const createViewportInstances: (options?: {
  names?: readonly import("./viewports.js").ViewportName[]
  project?: string
}) => {
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
