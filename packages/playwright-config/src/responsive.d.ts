import type { Page } from "@playwright/test"

/**
 * Throws when anything makes the document wider than the window, or
 * when a box with `overflow-x: hidden | clip` (`Shell`, `Main`) holds
 * content wider than itself — overflow cut off out of sight — or when
 * an ellipsis truncation is squeezed narrower than one character. Names
 * the offenders. `ignore` lists selectors whose subtree clips on
 * purpose.
 */
export declare const expectNoHorizontalOverflow: (
  page: Page,
  options?: { ignore?: string[] },
) => Promise<void>

/**
 * Throws when a visible heading (or `selector`) breaks a word across
 * two lines — what a squeezed layout looks like under `Main`'s
 * `wrap-anywhere`.
 */
export declare const expectNoSplitWords: (
  page: Page,
  options?: { selector?: string },
) => Promise<void>
