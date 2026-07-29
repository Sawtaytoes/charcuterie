import { withThemeByDataAttribute } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react"

import "../src/styles/tokens.css"

/**
 * All three axes are `<html>` data attributes, and the toolbars
 * write them directly.
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
    defaultValue: "comfortable",
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
    defaultValue: "daylight",
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
  decorators: [
    writeHtmlAttribute("data-density", "density"),
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
