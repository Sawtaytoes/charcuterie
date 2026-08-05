# @charcuterie/storybook-config

The shared Storybook setup for the fleet. Every app that renders
`@charcuterie/ui` gets the same **theme-axis toolbars**
(scheme · variant · density), the same **first-paint seed** so a
cold-loaded docs page is themed before it paints, and the same
**a11y + controls** defaults — from one package instead of a
hand-copied `.storybook/`.

Before this package, `charcuterie/packages/docs`, `gallery-downloader`
and `rip-deck` each carried a byte-for-byte copy of the theme-axis
writer and its `themeAxes.ts`, two of them trimmed to a different
axis subset; mux-magic did the same job by hand with
`@storybook/addon-themes`. The subset is now a call argument, not a
fork.

## What it gives you

- **`installThemeAxes(keys)`** — the toolbar dropdowns plus the
  writer that stamps `data-scheme` / `data-variant` / `data-density`
  onto `<html>` on every toolbar change *and* on a story-less docs
  page. Returns `{ globalTypes, initialGlobals, decorators }`.
- **`buildPreviewHead({ variant, scheme, axes })`** — the
  `previewHead` transformer: the token first-paint `<style>` +
  the axis-seed `<script>`.
- **`themeParameters({ isA11yEnforced })`** — the a11y + controls
  parameters (`isA11yEnforced` fails the run on an axe violation
  instead of only reporting).
- **`docsAddonWithGfm`** — `@storybook/addon-docs` wired for
  GitHub-flavoured Markdown tables.
- **`charcuterieViteFinal({ isReactDeduped })`** — Tailwind v4 in
  `viteFinal`, with the React dedupe every standalone app repo needs.

## Adopt it in an app

Pick the axes the app actually themes. mux-magic wants `density`
only; rip-deck wants `density` + `scheme`; gallery-downloader and
the design-system docs want all three.

`.storybook/main.ts`:

```ts
import {
  buildPreviewHead,
  docsAddonWithGfm,
} from "@charcuterie/storybook-config"
import { charcuterieViteFinal } from "@charcuterie/storybook-config/vite"
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.{ts,tsx}"],
  addons: [docsAddonWithGfm, "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  previewHead: buildPreviewHead({ axes: ["density", "scheme"] }),
  // A standalone app repo (not the monorepo) → dedupe React.
  viteFinal: charcuterieViteFinal({ isReactDeduped: true }),
}

export default config
```

`.storybook/preview.tsx`:

```tsx
import {
  installThemeAxes,
  themeParameters,
} from "@charcuterie/storybook-config/preview"
// Your app's Tailwind entry, which imports @charcuterie/tokens/theme.css.
import "../src/styles/tailwind.css"

const themeAxes = installThemeAxes(["density", "scheme"])

export const globalTypes = themeAxes.globalTypes

export default {
  initialGlobals: themeAxes.initialGlobals,
  decorators: themeAxes.decorators,
  parameters: themeParameters({ isA11yEnforced: true }),
}
```

The axes you seed in `buildPreviewHead` must match the axes you pass
`installThemeAxes` — the seed and the toolbar read the same table,
and a mismatch paints the wrong theme for one frame.

## Two entry points, on purpose

`@charcuterie/storybook-config` (this entry) is **Node-side** — safe
to import from `main.ts`. `/preview` is **browser-side** and pulls
in React and `@storybook/addon-docs/blocks`; `/vite` pulls in
Tailwind. They are split so a `main.ts` import never drags browser or
Tailwind code into a Node process that has no use for it.

`/preview` must never be tree-shaken: its top-level
`@storybook/addon-docs/blocks` import is the React-Aria focus patch
(`charcuterie/docs/decisions/2026-07-29-preload-docs-blocks-before-the-focus-patch.md`),
which is why this package does not declare `sideEffects: false`.

See `charcuterie/docs/how-we-do-storybook.md` for the full model and
the reasoning behind each piece.
