import {
  buildPreviewHead,
  docsAddonWithGfm,
} from "@charcuterie/storybook-config"
import { charcuterieViteFinal } from "@charcuterie/storybook-config/vite"
import type { StorybookConfig } from "@storybook/react-vite"

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
    // `@storybook/addon-docs`, wired for GFM tables — shared, because
    // `Tokens/Overview` and the composed host's Welcome page each
    // shipped the literal-pipe bug independently.
    docsAddonWithGfm,
    "@storybook/addon-a11y",
    // `@storybook/addon-themes` used to be here, for `data-scheme`
    // alone. It is gone: it wrote its attribute from a decorator's
    // `useEffect`, so it could not theme a page with no story, and
    // running two of the three axes through a mechanism we own and
    // the third through an addon's internals meant the one that
    // broke was the one we could not fix. The shared preview declares
    // a `scheme` global beside `density` and `variant`, and one
    // writer serves all three.
    "@storybook/addon-vitest",
    // The pseudo-states addon version-matches the installed Storybook
    // exactly. Without it, an `AllStates` story cannot show hover or
    // active at all, and "trust me, the hover colour is fine" is not
    // a design review. App-specific, so it stays here rather than in
    // the shared addons.
    "storybook-addon-pseudo-states",
  ],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // **The theme, before anything renders** — the token first-paint
  // `<style>` plus the axis-seed `<script>`, from the shared package.
  // The seed is what keeps a cold-loaded `Tokens/Overview` from
  // painting stock Storybook white; the reasoning is in
  // `@charcuterie/storybook-config`'s `buildPreviewHead` and
  // `docs/decisions/2026-08-03-the-theme-axes-are-written-at-preview-bootstrap.md`.
  previewHead: buildPreviewHead(),
  // Tailwind v4 in `viteFinal`, shared. No React dedupe: the docs
  // host renders with the monorepo's single hoisted React, unlike a
  // standalone app repo.
  viteFinal: charcuterieViteFinal(),
}

export default config
