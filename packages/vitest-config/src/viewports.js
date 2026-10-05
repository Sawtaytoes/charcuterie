/**
 * The four windows every browser test in the fleet runs in.
 *
 * Each one is a real device's window, not a breakpoint picked to
 * straddle a media query. A responsive layout breaks on the screens
 * people actually hold, and an unnamed width proves nothing: Vitest's
 * own default window is 414x896, so before this list existed nearly
 * every app in the fleet was tested ONLY at a phone-like width, by
 * accident, and never at a desktop one.
 *
 * - `narrow` — a large Android phone; the reference is a Samsung
 *   Galaxy S23 Ultra in Chrome. 1440x3088 physical pixels at a 3.75
 *   device pixel ratio is 384x823.5 CSS pixels; Chrome reports
 *   384x824. The Narrow View, and tall with it.
 * - `tall` — a 1080p monitor turned to portrait. Wide enough to cross
 *   most breakpoints, and taller than anything else on the list, so a
 *   layout that only ever fills a landscape window shows its gap.
 * - `wide` — 16:9 at 1080p. The ordinary desktop window and the Wide
 *   View.
 * - `ultrawide` — 21:9 at 3440x1440. Where a single row of cards
 *   spans 3000px of empty background and a centered column floats.
 *
 * The keys are the names a test reads back through
 * `inject("viewport")`, the suffix on each Vitest instance
 * (`chromium-narrow`) and each Playwright project, so
 * `vitest --project chromium-narrow` runs one window on its own.
 */
export const viewports = Object.freeze({
  narrow: Object.freeze({
    deviceScaleFactor: 3.75,
    height: 824,
    isMobile: true,
    width: 384,
  }),
  tall: Object.freeze({
    deviceScaleFactor: 1,
    height: 1920,
    isMobile: false,
    width: 1080,
  }),
  wide: Object.freeze({
    deviceScaleFactor: 1,
    height: 1080,
    isMobile: false,
    width: 1920,
  }),
  ultrawide: Object.freeze({
    deviceScaleFactor: 1,
    height: 1440,
    isMobile: false,
    width: 3440,
  }),
})

/** Every viewport name, in the order the list above gives them. */
export const viewportNames = Object.freeze(
  Object.keys(viewports),
)
