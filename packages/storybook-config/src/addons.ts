import remarkGfm from "remark-gfm"

/**
 * `@storybook/addon-docs`, wired for GitHub-flavoured Markdown.
 *
 * MDX is CommonMark by default, and a GFM table is not CommonMark —
 * so without this a `| Attribute | Values |` block renders as a
 * paragraph of literal pipe characters. It reads as a Markdown typo
 * rather than a missing plugin, which is exactly why it is easy to
 * ship: the source is correct and every other block on the page
 * renders. Charcuterie's Tokens/Overview shipped that bug, and the
 * composed host's Welcome page shipped it again independently.
 *
 * Spread into a Storybook `addons` array in place of the bare
 * `"@storybook/addon-docs"` string:
 *
 * @example
 *   import { docsAddonWithGfm } from "@charcuterie/storybook-config"
 *   const config = {
 *     addons: [docsAddonWithGfm, "@storybook/addon-a11y"],
 *   }
 */
export const docsAddonWithGfm = {
  name: "@storybook/addon-docs",
  options: {
    mdxPluginOptions: {
      mdxCompileOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  },
}
