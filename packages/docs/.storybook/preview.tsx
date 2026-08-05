import {
  installThemeAxes,
  themeParameters,
} from "@charcuterie/storybook-config/preview"

// The docs host's own token custom properties, scoped to `.sbdocs`
// in `tokens.css`. The shared preview (`installThemeAxes`) writes
// the axes onto `<html>` and brings the React-Aria focus preload;
// this line is the design system's own docs-page chrome and stays
// local to it.
import "../src/styles/tokens.css"

/**
 * The design system is the reference consumer of
 * `@charcuterie/storybook-config`: all three axes, a11y enforced.
 *
 * The globals writer, the toolbar dropdowns, the first-paint seed
 * (in `main.ts`) and the a11y/controls parameters all now come from
 * the shared package — the same setup gallery-downloader and
 * rip-deck used to hand-copy. If a component ever needs `useTheme()`
 * to respond to a flip, the token layer has failed; nothing here
 * changes that contract, it just stops three repos from restating
 * it.
 */
const themeAxes = installThemeAxes([
  "density",
  "variant",
  "scheme",
])

export const globalTypes = themeAxes.globalTypes

export default {
  initialGlobals: themeAxes.initialGlobals,
  decorators: themeAxes.decorators,
  parameters: themeParameters({ isA11yEnforced: true }),
}
