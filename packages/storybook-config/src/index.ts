/**
 * `@charcuterie/storybook-config` — the **Node half** of the fleet's
 * shared Storybook setup, imported from an app's `.storybook/main.ts`.
 *
 * The browser half (`globalTypes`, the theme-axis writer, the a11y
 * and controls parameters) lives at `@charcuterie/storybook-config/preview`
 * and the optional Vite/Tailwind helper at
 * `@charcuterie/storybook-config/vite` — kept apart so importing
 * anything here never drags `react`, `@storybook/addon-docs/blocks`,
 * or `@tailwindcss/vite` into a Node process that has no use for them.
 *
 * Everything both halves share — the axis table and the first-paint
 * script generator — comes through here from the pure `themeAxes`
 * leaf, so an app never has to know which module a symbol lives in.
 */

export { docsAddonWithGfm } from "./addons.ts"
export { buildPreviewHead } from "./previewHead.ts"
export {
  type AxisKey,
  firstPaintAxesScript,
  pickAxes,
  THEME_AXES,
  type ThemeAxis,
} from "./themeAxes.ts"
