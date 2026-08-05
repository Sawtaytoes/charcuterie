# The Storybook setup is a published package, not a copied `.storybook/`

**Status:** Accepted
**Date:** 2026-08-05
**Type:** Tooling / packaging
**Supersedes:** —
**Superseded by:** —

## Decision

The fleet's shared Storybook setup ships as **`@charcuterie/storybook-config`**, a
sixth published package beside `tokens` / `logic` / `ui` / `eslint-config` /
`biome-config`. The name matches the `*-config` shared-config siblings.

It owns the pieces every `@charcuterie/ui` consumer had been hand-copying:

- the three theme-axis toolbars (`scheme` / `variant` / `density`) and the one
  `SET_GLOBALS`/`GLOBALS_UPDATED` writer that stamps them onto `<html>` — the
  mechanism from
  [2026-08-03-the-theme-axes-are-written-at-preview-bootstrap](2026-08-03-the-theme-axes-are-written-at-preview-bootstrap.md),
  now behind `installThemeAxes(keys)` with the axis subset as an argument;
- the first-paint `previewHead` seed (`buildPreviewHead`), wrapping
  `@charcuterie/tokens`' `buildFirstPaintRule` +
  [the first-paint snippet](2026-07-31-tokens-ships-the-first-paint-snippet.md);
- the a11y + controls parameters (`themeParameters`), the GFM docs addon, and
  the Tailwind `viteFinal` (`charcuterieViteFinal`);
- the React-Aria focus preload from
  [2026-07-29-preload-docs-blocks-before-the-focus-patch](2026-07-29-preload-docs-blocks-before-the-focus-patch.md),
  which is why the package is **not** `sideEffects: false`.

Three entry points keep the halves apart: `.` (Node, for `main.ts`), `./preview`
(browser), `./vite` (Node, Tailwind). The design system's own docs Storybook is
the first consumer.

The **first** publish is manual — see `packages/storybook-config/SEEDING.md` —
because npm OIDC trusted publishing cannot be configured for a package that does
not yet exist. Every release after the `0.1.0` seed goes through the normal
changeset → Version PR → CI → deploy flow; `storybook-config` is in the deploy
loop, guarded by the `storybook-config-v0.1.0` tag until a changeset bumps it.

## Context

Four consumers had reproduced this setup by hand:
`packages/docs`, `gallery-downloader` (3 axes) and `rip-deck` (2 axes) each
carried a byte-for-byte copy of the writer + `themeAxes.ts`, trimmed differently;
`mux-magic` did the same job with `@storybook/addon-themes` and an imperative
decorator. Kevin, looking at the composed site, asked to "export some Charcuterie
Storybook default settings for other apps … so they get the same benefits" and
to "document … the ways we do Storybook so other apps can copy the same format."

## Why a package, not a template

The duplication was not incidental — it was the *same code*, and it had already
drifted (three axis subsets, two a11y-enforcement stances, one app on a different
mechanism entirely). A copied template drifts silently; a versioned dependency
drifts visibly, in a lockfile, behind a changelog. The axis subset and a11y
stance that actually differ per app become arguments (`installThemeAxes(keys)`,
`themeParameters({ isA11yEnforced })`), so the thing that varies is a call, not a
fork.

## Evidence

- Kevin, this session (2026-08-05): *"It would also be good to export some
  Charcuterie Storybook default settings for other apps with Storybook, so they
  get the same benefits. And we should document somewhere the ways we do
  Storybook in Charcuterie so other apps can copy the same format."* and *"Do all
  of the repos like this."*
- Verified end-to-end: the docs Storybook builds and its cold-load smoke test
  (`tokens-overview--docs` themed, 189 entries clean) passes against the package.
  `@charcuterie/storybook-config@0.1.0` seed-published to npm.
