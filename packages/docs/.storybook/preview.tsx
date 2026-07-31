import { withThemeByDataAttribute } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react"

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
 */
const writeHtmlAttribute =
  (attribute: string, value: string): Decorator =>
  (Story, context) => {
    document.documentElement.setAttribute(
      attribute,
      String(context.globals[value]),
    )

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
  /**
   * The M5 bake-off, as three independent axes rather than one list
   * of pairings — liking a heading and disliking the body it came
   * bundled with left nothing to click. Mono joined them once the
   * owner named a specific face rather than accepting the default.
   *
   * Each list is ordered pick-first, with `system` kept as an
   * explicit entry: the thing being replaced should stay one click
   * away, not disappear because it lost.
   */
  bodyFont: {
    description:
      "Body face under evaluation. Preview-only until one is chosen.",
    toolbar: {
      title: "Body",
      icon: "paragraph",
      dynamicTitle: true,
      items: [
        { value: "outfit", title: "Outfit" },
        { value: "system", title: "System (today)" },
        { value: "nunito", title: "Nunito" },
        { value: "dm-sans", title: "DM Sans" },
        { value: "figtree", title: "Figtree" },
        { value: "rubik", title: "Rubik" },
        { value: "nunito-sans", title: "Nunito Sans" },
        { value: "quicksand", title: "Quicksand" },
        { value: "inter", title: "Inter" },
        { value: "source-sans-3", title: "Source Sans 3" },
      ],
    },
  },
  headingFont: {
    description:
      "Display face for headings. `system` means no display family — the body face, bolder.",
    toolbar: {
      title: "Heading",
      icon: "typography",
      dynamicTitle: true,
      items: [
        { value: "baloo", title: "Baloo 2" },
        { value: "system", title: "System (today)" },
        { value: "fraunces", title: "Fraunces" },
        { value: "fraunces-soft", title: "Fraunces Soft" },
        {
          value: "bricolage",
          title: "Bricolage Grotesque",
        },
        { value: "inter", title: "Inter" },
        { value: "source-sans-3", title: "Source Sans 3" },
      ],
    },
  },
  monoFont: {
    description:
      "Monospace face. Dank Mono is paid and gitignored — see `dankMono.css`.",
    toolbar: {
      title: "Mono",
      icon: "browser",
      dynamicTitle: true,
      items: [
        { value: "dank-mono", title: "Dank Mono" },
        { value: "victor-mono", title: "Victor Mono" },
        { value: "fira-code", title: "Fira Code" },
        {
          value: "jetbrains-mono",
          title: "JetBrains Mono",
        },
        { value: "system", title: "System (today)" },
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
   * The three font axes default to the owner's picks rather than to
   * `system`, as of 2026-07-30: Baloo 2 headings, Outfit body, Dank
   * Mono for code. That makes every story in the canvas a preview of
   * the intended end state instead of a preview of the thing being
   * replaced.
   */
  initialGlobals: {
    bodyFont: "outfit",
    density: "comfortable",
    headingFont: "baloo",
    monoFont: "dank-mono",
    variant: "daylight",
  },
  decorators: [
    writeHtmlAttribute("data-body-font", "bodyFont"),
    writeHtmlAttribute("data-density", "density"),
    writeHtmlAttribute("data-heading-font", "headingFont"),
    writeHtmlAttribute("data-mono-font", "monoFont"),
    writeHtmlAttribute("data-variant", "variant"),
    withThemeByDataAttribute({
      attributeName: "data-scheme",
      themes: {
        dark: "dark",
        light: "light",
      },
      // Dark, deliberately. Picking a light-first visual
      // direction at M0 is not the same as flipping the fleet to
      // light, and the kiosk Pis stay pinned to dark — a light
      // kiosk in a dark room is a lamp.
      defaultTheme: "dark",
    }),
  ],
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
