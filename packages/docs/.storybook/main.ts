import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"
import { mergeConfig } from "vite"

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.{ts,tsx}",
    "../src/**/*.mdx",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
  ],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Tailwind v4 has to run here, not just in an app, because the
  // `@theme` block that turns `--color-*` into utilities lives in
  // `@charcuterie/tokens/theme.css`. Without this plugin the
  // stories render unstyled and the toolbars appear to do nothing.
  viteFinal: async (storybookViteConfig) =>
    mergeConfig(storybookViteConfig, {
      plugins: [tailwindcss()],
    }),
}

export default config
