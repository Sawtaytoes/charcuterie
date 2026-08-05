/**
 * Load-bearing, and not a style import — keep it first.
 *
 * Storybook 10.5.x's `enhanceContext` loader replaces
 * `HTMLElement.prototype.focus` with an accessor whose getter reads
 * `this.ownerDocument`. React Aria — which Storybook's own docs
 * blocks pull in, and which `@charcuterie/ui` uses directly — reads
 * `window.HTMLElement.prototype.focus` at module scope, so `this`
 * is the *prototype*, `ownerDocument` throws `Illegal invocation`,
 * and the docs page renders Storybook's "component failed to
 * render" panel instead of the page.
 *
 * It only bites when the blocks chunk loads *after* a story has
 * rendered — i.e. every docs page a human reaches by clicking.
 * Importing it here evaluates React Aria's setup at preview
 * bootstrap, while `focus` is still a plain function. Every
 * consumer that imports from `@charcuterie/storybook-config/preview`
 * gets the fix for free, and it is the reason this must never be
 * marked `sideEffects: false`. See
 * `charcuterie/docs/decisions/2026-07-29-preload-docs-blocks-before-the-focus-patch.md`.
 */
import "@storybook/addon-docs/blocks"

import type { Decorator, Preview } from "@storybook/react"
import {
  GLOBALS_UPDATED,
  SET_GLOBALS,
} from "storybook/internal/core-events"
import { addons } from "storybook/preview-api"

import {
  type AxisKey,
  pickAxes,
  type ThemeAxis,
} from "./themeAxes.ts"

/**
 * Write the chosen axes onto `<html>` from a `globals` bag.
 *
 * Every axis is an `<html>` data attribute and the toolbars write
 * them directly — the production mechanism, exercised, not a
 * Storybook convenience. Nothing in React observes these, so
 * flipping one re-themes the entire canvas with **zero re-render**.
 * If a component ever needs a `useTheme()` to respond, the token
 * layer has failed and this is where it shows up first.
 *
 * **The fallback to `initial` is not defensive padding.** A missing
 * global stringifies to the literal `"undefined"`, a perfectly
 * valid attribute value that matches no selector in `variables.css`
 * — so every token silently unsets and the failure shows up as a
 * colour, three layers from its cause.
 */
export const writeThemeAxes = (
  globals: Record<string, unknown>,
  axes: readonly ThemeAxis[],
): void => {
  for (const { attribute, global, initial } of axes) {
    const value = globals[global]

    document.documentElement.setAttribute(
      attribute,
      typeof value === "string" && value ? value : initial,
    )
  }
}

/**
 * Storybook's own `globalTypes` map type, imported rather than
 * restated — so the toolbar API's property names (`dynamicTitle`)
 * are declared by Storybook, not re-declared here under the house
 * naming rules.
 */
type GlobalTypes = NonNullable<Preview["globalTypes"]>

/**
 * The `globalTypes` map — the toolbar dropdowns — for the given
 * axes, built from the same table the writer and the seed read.
 */
export const buildGlobalTypes = (
  axes: readonly ThemeAxis[],
): GlobalTypes =>
  Object.fromEntries(
    axes.map((axis) => [
      axis.global,
      {
        description: axis.description,
        toolbar: {
          title: axis.toolbar.title,
          icon: axis.toolbar.icon,
          dynamicTitle: true,
          items: axis.toolbar.items,
        },
      },
    ]),
    // Storybook types `icon` as a closed union of its own glyph
    // names; the table's icons are members of it, but `ThemeAxis`
    // keeps `icon` a plain `string` so this leaf never imports a
    // Storybook type. The assertion is where those two meet.
  ) as GlobalTypes

/**
 * The a11y + controls parameters every Charcuterie Storybook runs.
 *
 * `isA11yEnforced` toggles the one real difference between the apps:
 * the design system and gallery-downloader fail the run on an axe
 * violation (`test: "error"`); rip-deck, mid-migration with ~155
 * hardcoded colours still to move, only reports them.
 *
 * The `data-floating-ui-focus-guard` exclusion is not a rule
 * switch-off: floating-ui renders `<span aria-hidden tabindex="0">`
 * focus-guard sentinels around a portalled panel — the standard,
 * correct focus-trap-across-a-portal technique, and the one axe's
 * `aria-hidden-focus` flags as a false positive. They carry a
 * stable marker attribute and appear only once an overlay portals,
 * so they are excluded by that marker rather than by turning the
 * rule off. The default `include` (the whole body) is preserved.
 */
export const themeParameters = ({
  isA11yEnforced = false,
}: {
  isA11yEnforced?: boolean
} = {}) => ({
  a11y: {
    context: {
      exclude: ["[data-floating-ui-focus-guard]"],
    },
    test: isA11yEnforced
      ? ("error" as const)
      : ("todo" as const),
  },
  controls: {
    matchers: {
      color: /(background|colour)$/i,
    },
  },
})

/**
 * The theme toolbars, plus the writer that keeps `<html>` in step
 * with them — the whole browser-side theming setup in one call.
 *
 * Call it **once at module scope** in a `preview.tsx`, and spread
 * the result into the preview:
 *
 * @example
 *   import {
 *     installThemeAxes,
 *     themeParameters,
 *   } from "@charcuterie/storybook-config/preview"
 *   import "../src/styles/tailwind.css"
 *
 *   const themeAxes = installThemeAxes(["density", "variant", "scheme"])
 *
 *   export const globalTypes = themeAxes.globalTypes
 *
 *   export default {
 *     initialGlobals: themeAxes.initialGlobals,
 *     decorators: themeAxes.decorators,
 *     parameters: themeParameters({ isA11yEnforced: true }),
 *   }
 *
 * Two triggers, one writer:
 *
 * - **the preview channel, at module scope.** `SET_GLOBALS` fires
 *   once when the preview boots; `GLOBALS_UPDATED` on every toolbar
 *   change. Neither waits for a story, which is the entire point — a
 *   decorator cannot run on an unattached MDX page (`Tokens/Overview`
 *   is all prose, no `<Canvas>`), so flipping the toolbar there used
 *   to do nothing until you navigated to a component and back
 *   (`2026-08-03-the-theme-axes-are-written-at-preview-bootstrap.md`);
 * - **a decorator**, for the renders with no channel behind them —
 *   `composeStories` under a DOM test suite, and a story's own
 *   `globals` override, which reaches a decorator's context before
 *   it reaches any event.
 *
 * The channel subscription is never torn down, and should not be:
 * it is bound to the preview document's whole lifetime, and the
 * only way out of that document is a reload.
 */
export const installThemeAxes = (
  keys: readonly AxisKey[],
): {
  globalTypes: GlobalTypes
  initialGlobals: Record<string, string>
  decorators: Decorator[]
} => {
  const axes = pickAxes(keys)

  addons.ready().then((channel) => {
    const onGlobals = ({
      globals,
    }: {
      globals?: Record<string, unknown>
    }) => {
      writeThemeAxes(globals ?? {}, axes)
    }

    channel.on(SET_GLOBALS, onGlobals)
    channel.on(GLOBALS_UPDATED, onGlobals)
  })

  const withThemeAxes: Decorator = (Story, context) => {
    writeThemeAxes(context.globals, axes)

    return <Story />
  }

  return {
    globalTypes: buildGlobalTypes(axes),
    // Not `globalTypes[…].defaultValue`, which is deprecated *and*
    // canvas-only: a `composeStories` render outside the canvas gets
    // `undefined` and the writer would stamp the string `"undefined"`
    // onto `<html>`. Built from the same table as the seed so the two
    // cannot disagree.
    initialGlobals: Object.fromEntries(
      axes.map((axis) => [axis.global, axis.initial]),
    ),
    decorators: [withThemeAxes],
  }
}
