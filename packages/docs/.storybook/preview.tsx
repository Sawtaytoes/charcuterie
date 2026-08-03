import type { Decorator, Preview } from "@storybook/react"
import {
  GLOBALS_UPDATED,
  SET_GLOBALS,
} from "storybook/internal/core-events"
import { addons } from "storybook/preview-api"

import { THEME_AXES } from "./themeAxes.ts"

/**
 * Load-bearing, and not a style import — see
 * `docs/decisions/2026-07-29-preload-docs-blocks-before-the-focus-patch.md`.
 *
 * Storybook 10.5.5's `enhanceContext` loader replaces
 * `HTMLElement.prototype.focus` with an accessor whose getter reads
 * `this.ownerDocument`. React Aria — which Storybook's own docs
 * blocks pull in — does `window.HTMLElement.prototype.focus` at
 * module scope, so `this` is the *prototype*, `ownerDocument`
 * throws `Illegal invocation`, and the docs page renders
 * Storybook's "component failed to render" panel instead of the
 * page.
 *
 * It only bites when the blocks chunk loads *after* a story has
 * rendered — i.e. every docs page a human reaches by clicking,
 * which is every docs page. Importing it here evaluates React
 * Aria's setup at preview bootstrap, while `focus` is still a plain
 * function.
 */
import "@storybook/addon-docs/blocks"

import "../src/styles/tokens.css"

/**
 * Every axis is an `<html>` data attribute, and the toolbars write
 * them directly.
 *
 * That is not a Storybook convenience — it is the production
 * mechanism, exercised. Nothing in React observes these
 * attributes, so switching one re-themes the entire canvas with
 * zero re-render. If a component ever needs a `useTheme()` to
 * respond, the token layer has failed and this toolbar is where
 * it shows up first.
 *
 * **The fallback to `initial` is not defensive padding.** A global
 * that is missing stringifies to the literal `"undefined"`, which
 * is a perfectly valid attribute value that matches no selector in
 * `variables.css` — so every token silently unsets and the failure
 * shows up as a colour, three layers from its cause. That happened
 * once already, to `composeStories` renders outside the canvas.
 */
const writeThemeAxes = (
  globals: Record<string, unknown>,
) => {
  for (const { attribute, global, initial } of THEME_AXES) {
    const value = globals[global]

    document.documentElement.setAttribute(
      attribute,
      typeof value === "string" && value ? value : initial,
    )
  }
}

/**
 * **Trigger one: the preview channel, at module scope.**
 *
 * `SET_GLOBALS` fires once when the preview finishes booting, with
 * whatever `initialGlobals` resolved to; `GLOBALS_UPDATED` fires on
 * every toolbar change. Neither waits for a story, which is the
 * entire point — a decorator cannot run on `Tokens/Overview`,
 * because that page is unattached prose with no `<Canvas>` on it,
 * so flipping the toolbar there used to do nothing at all until you
 * navigated away to a component and back.
 *
 * `addons.ready()` rather than `getChannel()`: the preview runtime
 * installs the channel before it imports these annotations *today*,
 * and a promise costs nothing to be right about tomorrow. Storybook's
 * `Channel.emit` dispatches to local listeners as well as across the
 * transport, so subscribing inside the preview does receive the
 * preview's own events.
 *
 * The subscription is never torn down, and should not be: it is
 * bound to the preview document's whole lifetime, and the only way
 * out of that document is a reload.
 */
addons.ready().then((channel) => {
  const onGlobals = ({
    globals,
  }: {
    globals?: Record<string, unknown>
  }) => {
    writeThemeAxes(globals ?? {})
  }

  channel.on(SET_GLOBALS, onGlobals)
  channel.on(GLOBALS_UPDATED, onGlobals)
})

/**
 * **Trigger two: a decorator, for the renders that have no channel
 * at all.**
 *
 * `composeStories` under `test:ui-dom` applies these annotations
 * without a preview runtime behind them, so nothing above ever
 * fires — and that suite is the one place density-derived sizes are
 * asserted, so it is the last place that should quietly render
 * untokenised. It also covers a story's own `globals` override
 * (`TokenSpecimen`'s `Light`, `Compact`, `Kiosk`), which are story
 * globals and reach a decorator's context before they reach any
 * event.
 *
 * Both triggers call the same writer, so this is one mechanism with
 * two ways in — not two mechanisms that can disagree.
 */
const withThemeAxes: Decorator = (Story, context) => {
  writeThemeAxes(context.globals)

  return <Story />
}

export const globalTypes = {
  density: {
    description:
      "Control sizing and type scale. Composes with scheme and variant.",
    toolbar: {
      title: "Density",
      icon: "component",
      dynamicTitle: true,
      items: [
        {
          value: "comfortable",
          title: "Comfortable",
        },
        { value: "compact", title: "Compact" },
        { value: "kiosk", title: "Kiosk" },
      ],
    },
  },
  variant: {
    description:
      "Visual direction. `daylight` won M0; the other three survive as alternates.",
    toolbar: {
      title: "Variant",
      icon: "paintbrush",
      dynamicTitle: true,
      items: [
        { value: "daylight", title: "Daylight" },
        { value: "hairline", title: "Hairline" },
        { value: "layered", title: "Layered" },
        { value: "legible", title: "Legible" },
      ],
    },
  },
  /**
   * Last, so the two toolbars that were already here do not move.
   *
   * This is the axis `@storybook/addon-themes` used to own, and it
   * reads slightly differently now: a `Scheme` dropdown beside
   * `Density` and `Variant` rather than the addon's two-state
   * paintbrush toggle. Three sibling axes that look like siblings
   * is the better read, and it is the price of the three of them
   * going through one writer we can fix.
   */
  scheme: {
    description:
      "Light or dark. `daylight` is a light-first *direction*; the default *scheme* is still dark.",
    toolbar: {
      title: "Scheme",
      icon: "circlehollow",
      dynamicTitle: true,
      items: [
        { value: "dark", title: "Dark" },
        { value: "light", title: "Light" },
      ],
    },
  },
}

const preview: Preview = {
  /**
   * Not `globalTypes[…].defaultValue`, which is deprecated *and*
   * canvas-only: it seeds the toolbar and nothing else, so a
   * `composeStories` render outside the canvas got
   * `context.globals.density === undefined` and the decorator below
   * wrote the literal string `"undefined"` onto `<html>`. Every
   * density-derived size then silently fell back, in the one place
   * — the DOM test suite — where sizes are asserted.
   *
   * Built from `THEME_AXES` so these cannot drift from the
   * `previewHead` seed `main.ts` writes from the same table. A seed
   * and an initial value that disagree paint the wrong theme for
   * one frame, which reads as a flash rather than as a bug.
   */
  initialGlobals: Object.fromEntries(
    THEME_AXES.map(({ global, initial }) => [
      global,
      initial,
    ]),
  ),
  decorators: [withThemeAxes],
  parameters: {
    // Enforced, not reported: axe violations fail the run rather
    // than printing a panel nobody opens.
    a11y: {
      test: "error",
    },
    controls: {
      matchers: {
        color: /(background|colour)$/i,
      },
    },
  },
}

export default preview
