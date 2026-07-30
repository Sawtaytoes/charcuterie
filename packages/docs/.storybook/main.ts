import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"
import remarkGfm from "remark-gfm"
import { mergeConfig } from "vite"

const config: StorybookConfig = {
  // **`.mdx` before `.stories.tsx`, deliberately.**
  //
  // An attached MDX file (`<Meta of={…} />`) is indexed where its
  // specifier sits, not hoisted the way an `autodocs` entry is — so
  // listing the stories first put every component's `Docs` entry
  // *below* its stories in the sidebar, where nobody looks for it.
  // Sorting cannot fix it either: the sidebar follows index order
  // and the index follows this array.
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.{ts,tsx}",
    // Stories live next to their component, in `@charcuterie/ui` —
    // matching mux-magic, where `Component.tsx` / `.stories.tsx` /
    // `.mdx` / `.test.tsx` are siblings. This package is only the
    // host; nothing about the components lives here.
    "../../ui/src/**/*.mdx",
    "../../ui/src/**/*.stories.tsx",
  ],
  addons: [
    {
      name: "@storybook/addon-docs",
      // MDX is CommonMark by default, and a GitHub-flavoured table
      // is not CommonMark — so `| Attribute | Values |` rendered as
      // a paragraph of literal pipe characters. It reads as a
      // Markdown typo rather than a missing plugin, which is why
      // `Tokens/Overview` shipped that way: the source is correct
      // and every other block on the page renders.
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
    // Answers one of the plan's open questions: the pseudo-states
    // addon does support Storybook 10 — it version-matches the
    // installed 10.5.5 exactly. Without it, an `AllStates` story
    // cannot show hover or active at all, and "trust me, the hover
    // colour is fine" is not a design review.
    "storybook-addon-pseudo-states",
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
