import type { UserConfig } from "vite"

/**
 * The shared Vite config factory. Deep-merges `overrides` over the
 * Charcuterie base (build/server defaults); plugins are the app's.
 */
export declare const createViteConfig: (
  overrides?: UserConfig,
) => UserConfig
