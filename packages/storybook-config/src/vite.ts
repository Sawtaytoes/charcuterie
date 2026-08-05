import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"
import { mergeConfig } from "vite"

/**
 * The `viteFinal` every Tailwind-consuming Charcuterie Storybook
 * runs — kept in its own entry so importing the main config never
 * drags `@tailwindcss/vite` and `vite` into a process that has no
 * Tailwind.
 *
 * Tailwind v4 has to run **here**, not only in the app build,
 * because the `@theme` block that turns `--color-*` into utilities
 * lives in `@charcuterie/tokens/theme.css`. Without this plugin the
 * stories render unstyled and the toolbars appear to do nothing.
 *
 * `isReactDeduped` is off by the design-system docs (it renders
 * with the monorepo's single hoisted React) and **on** for every
 * standalone app repo: a symlinked (`portal:` / `yarn link`) React
 * library resolves from its real path, so it renders with its own
 * React while the app renders with the app's, and the first shared
 * hook throws `Cannot read properties of null (reading 'useRef')`
 * while saying nothing about symlinks.
 *
 * Compose it when an app needs more plugins — it returns a plain
 * `viteFinal`, so call it and merge again:
 *
 * @example
 *   import { charcuterieViteFinal } from "@charcuterie/storybook-config/vite"
 *   const config = {
 *     viteFinal: charcuterieViteFinal({ isReactDeduped: true }),
 *   }
 */
export const charcuterieViteFinal =
  ({
    isReactDeduped = false,
  }: {
    isReactDeduped?: boolean
  } = {}): NonNullable<StorybookConfig["viteFinal"]> =>
  async (config) =>
    mergeConfig(config, {
      plugins: [tailwindcss()],
      ...(isReactDeduped
        ? { resolve: { dedupe: ["react", "react-dom"] } }
        : {}),
    })
