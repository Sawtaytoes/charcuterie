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
  parameters: {
    ...themeParameters({ isA11yEnforced: true }),
    options: {
      /**
       * Sidebar order, and it is deliberately not alphabetical.
       *
       * Roots run in reading order — the guide is what a new reader,
       * or a new agent, is meant to hit before writing a component.
       * The nested array is the group order inside `Components`, and
       * it runs from what an app reaches for first to what it
       * reaches for last; `Data` before `Feedback` because the table
       * is further up the page than the spinner that preceded it.
       *
       * **This must stay an inline literal.** Storybook reads
       * `storySort` out of this file with a Babel pass at index
       * time, not by importing it — a reference to a `const` above
       * throws "storySort must be defined inline", and a function
       * form is `eval`'d in isolation, so it could not see one
       * either.
       *
       * Anything the list does not name keeps **index order**
       * (`method` defaults to `configure`), which is what preserves
       * two things worth keeping: components stay alphabetical
       * inside their group, and each component's `Docs` page stays
       * above its stories — that one comes from `main.ts` listing
       * `*.mdx` before `*.stories.tsx`, and an alphabetical
       * fallback would undo it by sorting `All Variants` first.
       */
      storySort: {
        order: [
          "Welcome",
          "Guides",
          "Components",
          [
            "Actions",
            "Controls",
            "Overlays",
            "Layout",
            "Data",
            "Feedback",
          ],
          "Tokens",
          "Utilities",
        ],
      },
    },
  },
}
