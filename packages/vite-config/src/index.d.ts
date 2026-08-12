import type { Plugin, UserConfig } from "vite"

/**
 * The shared Vite config factory. Deep-merges `overrides` over the
 * Charcuterie base (build/server defaults, plus the `index.html`
 * injection-anchor guard); the app brings its own plugins and they
 * are added to the base's, not swapped for them.
 */
export declare const createViteConfig: (
  overrides?: UserConfig,
) => UserConfig

/**
 * One injection anchor whose first occurrence in the file is
 * inside an HTML comment — the shape that sends Vite's dev-script
 * injection into the comment and serves a blank page.
 */
export type ShadowedInjectionAnchor = {
  anchor: string
  line: number
  snippet: string
}

export declare const STRUCTURAL_INJECTION_ANCHORS: readonly {
  label: string
  pattern: RegExp
}[]

/** The pure check. Empty array means the document is safe. */
export declare const findShadowedInjectionAnchors: (
  html: string,
) => ShadowedInjectionAnchor[]

/** Throws with the offending lines, or returns nothing. */
export declare const assertNoShadowedInjectionAnchors: (
  html: string,
  fileLabel: string,
) => void

/**
 * The guard as a standalone plugin, for an app that builds its
 * Vite config without `createViteConfig`. Already in the base, so
 * a `createViteConfig` consumer needs nothing.
 */
export declare const createStructuralTagCommentGuard: () => Plugin & {
  configResolved: (config: {
    build?: { rollupOptions?: { input?: unknown } }
    root: string
  }) => void
  transformIndexHtml: {
    handler: (
      html: string,
      context?: { filename?: string; path?: string },
    ) => string
    order: "pre"
  }
}

/** The formatted error body, exported for tests. */
export declare const formatShadowedAnchorError: (
  issues: ShadowedInjectionAnchor[],
  fileLabel: string,
) => string

/**
 * The HTML entries a resolved config would serve — `root/index.html`
 * plus any HTML rollup input, because a multi-page app's second
 * page fails in exactly the same way.
 */
export declare const getHtmlEntryPaths: (config: {
  build?: { rollupOptions?: { input?: unknown } }
  root: string
}) => string[]
