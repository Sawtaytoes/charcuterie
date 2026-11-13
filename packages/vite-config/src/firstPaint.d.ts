import type { Variant } from "@charcuterie/tokens"
import type { HtmlTagDescriptor, Plugin } from "vite"

export type FirstPaintOptions = {
  /**
   * The `localStorage` key the script reads the stored scheme from.
   * It must match the key the app's runtime `useColorScheme` uses,
   * or the two disagree by exactly one flash. Defaults to
   * `DEFAULT_COLOR_SCHEME_STORAGE_KEY` from `@charcuterie/tokens`.
   */
  storageKey?: string
  /**
   * The variant whose surface colours paint the canvas. Defaults to
   * `daylight`, the variant the unqualified `[data-scheme]` rule
   * resolves to, so a document with no `data-variant` matches it by
   * construction. Pass the variant your `index.html` declares.
   */
  variant?: Variant
}

/**
 * The first-paint script's body, without its `<script>` wrapper,
 * for a test that runs it or a page that inlines it by hand.
 */
export declare const buildFirstPaintScriptBody: (
  options?: FirstPaintOptions,
) => string

/**
 * The Vite plugin that injects the first-paint script at the top of
 * `<head>`, ahead of every stylesheet, in dev and in the build.
 */
export declare const createFirstPaintPlugin: (
  options?: FirstPaintOptions,
) => Plugin & {
  transformIndexHtml: {
    handler: () => HtmlTagDescriptor[]
    order: "pre"
  }
}
