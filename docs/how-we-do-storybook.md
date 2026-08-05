# How we do Storybook

Every app in the fleet that renders `@charcuterie/ui` runs the same Storybook
setup, so a component looks the same in the design system's Storybook, in the
app's own, and in the composed site at `storybook.octen.dev`. That setup is the
package **`@charcuterie/storybook-config`** — this doc is the model behind it and
the recipe for adopting it.

## The model, in four pieces

### 1. The theme is written onto `<html>`, before first paint

`@charcuterie/tokens`' `variables.css` keys every `--color-*` off
`[data-scheme]` / `[data-variant]` / `[data-density]` and gives `:root` **no**
colour fallback. So a document with none of those attributes is not "light
scheme" — it is *no theme at all*, and the canvas falls through to stock
Storybook white. On the composed site the cold load is the normal case (it
deep-links straight at a docs path), so the attributes have to be on `<html>`
before the stylesheet is first read. `buildPreviewHead()` writes them in the
`previewHead`: a token first-paint `<style>` (a `var()` fallback, never a flat
hex — an inline `<style>` is unlayered and would outrank the utilities forever)
and a `<script>` that stamps the attributes while the head is still parsing.
See [the first-paint snippet](decisions/2026-07-31-tokens-ships-the-first-paint-snippet.md).

### 2. The toolbars drive the same attributes — through one writer

The `scheme` / `variant` / `density` dropdowns are Storybook `globalTypes`, and
one `writeThemeAxes` keeps `<html>` in step with them. It runs from **two**
triggers: the preview channel (`SET_GLOBALS` / `GLOBALS_UPDATED`), so a
story-less docs page re-themes when you flip the toolbar; and a decorator, for
`composeStories` renders outside the canvas. One writer, two ways in — never two
mechanisms that can disagree. This replaced `@storybook/addon-themes`, which
wrote from a `useEffect` and so could not theme a page with no story. See
[the theme axes are written at preview bootstrap](decisions/2026-08-03-the-theme-axes-are-written-at-preview-bootstrap.md).

### 3. The docs page is ours, in CSS

Prose, headings, the props table, the `Show code` panel — the whole docs page
reads `--color-*`, so it follows `data-scheme` × `data-variant` exactly as a
story canvas does. Done in CSS (`packages/docs/src/styles/tokens.css`), not a
Storybook theme object, because a theme object is resolved colour strings and
`polished` throws on a `var()`. See
[the docs page is themed by our tokens](decisions/2026-07-31-the-docs-page-is-themed-by-our-tokens.md).

### 4. Storybook reads the built `dist`

`build:storybook` runs `yarn build` first, and a stale `dist` is a red test
(`distFreshness.test.ts`). Storybook resolves `@charcuterie/*` through `exports`
to `dist` exactly as a real consumer does, so it exercises `exports`, `main`, and
the generator rather than quietly reading `src`. See
[Storybook reads the built dist](decisions/2026-07-30-storybook-reads-the-built-dist.md).

One more load-bearing detail: the top-level `import "@storybook/addon-docs/blocks"`
is the React-Aria focus preload — importing it at preview bootstrap keeps
`HTMLElement.prototype.focus` a plain function before Storybook's loader patches
it. It ships inside the package's `/preview` entry, which is why that package is
never `sideEffects: false`. See
[preload docs blocks before the focus patch](decisions/2026-07-29-preload-docs-blocks-before-the-focus-patch.md).

## Adopting it in an app

Add the dep, then two thin config files. Pick the axes the app actually themes —
`mux-magic` wants `density` only, `rip-deck` wants `density` + `scheme`,
`gallery-downloader` and the design system want all three.

```bash
yarn add -D @charcuterie/storybook-config
```

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
  // A standalone app repo (not the monorepo) needs the React dedupe.
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
// Your Tailwind entry, which imports @charcuterie/tokens/theme.css.
import "../src/styles/tailwind.css"

const themeAxes = installThemeAxes(["density", "scheme"])

export const globalTypes = themeAxes.globalTypes

export default {
  initialGlobals: themeAxes.initialGlobals,
  decorators: themeAxes.decorators,
  // Enforce a11y once the app's colours are all tokenised; report-only until.
  parameters: themeParameters({ isA11yEnforced: true }),
}
```

Rules of thumb:

- **The axes in `buildPreviewHead` must match the axes in `installThemeAxes`** —
  both read one table, and a mismatch paints the wrong theme for one frame.
- **`isReactDeduped: true` in every app repo**, off only in this monorepo. A
  symlinked React library otherwise renders with its own React and the first
  shared hook throws `Cannot read properties of null`.
- **`isA11yEnforced`** fails the run on an axe violation; leave it off while an
  app still carries un-tokenised colours, on once it doesn't.
- App-only decorators (an `AppProviders`, a `ToastProvider`, an MSW loader) and
  app-only addons (`storybook-addon-pseudo-states`, `msw-storybook-addon`) stay
  in the app's own `preview.tsx` / `main.ts` — the package carries only what the
  fleet shares.

## Reference

- Package: `packages/storybook-config/` (`README.md`, `SEEDING.md`).
- Decision: [the Storybook setup is a published package](decisions/2026-08-05-storybook-config-is-a-shared-package.md).
- The composed site that stitches every app's Storybook together lives in the
  `storybook-container` repo.
