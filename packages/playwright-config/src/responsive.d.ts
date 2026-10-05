import type { Page } from "@playwright/test"

/**
 * Throws when anything makes the document wider than the window, and
 * names the widest offenders.
 */
export declare const expectNoHorizontalOverflow: (
  page: Page,
) => Promise<void>
