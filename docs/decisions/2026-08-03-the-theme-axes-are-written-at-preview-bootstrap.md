# The theming axes are written at preview bootstrap, not by story decorators

**Status:** Accepted
**Date:** 2026-08-03
**Type:** Docs / tooling
**Supersedes:** —
**Superseded by:** —

## Decision

`data-scheme`, `data-density` and `data-variant` are written onto `<html>` by the **preview
itself**, in three places that share one table:

1. a **`previewHead` seed** in `packages/docs/.storybook/main.ts` — an inline `<script>`
   that stamps all three attributes while the head is still parsing, plus the fleet's
   `buildFirstPaintRule(daylight, "dark")` `<style>`;
2. a **module-scope subscription** in `preview.tsx` to `SET_GLOBALS` and `GLOBALS_UPDATED`
   on the preview channel, which re-writes them from `globals` whenever the toolbar moves;
3. a **decorator**, kept only for the renders that have no channel behind them —
   `composeStories` under `test:ui-dom`, and a story's own `globals` override.

All three call the same `writeThemeAxes`, and all three read their defaults from
`.storybook/themeAxes.ts`. One writer, three ways in; not three mechanisms that can
disagree.

**`@storybook/addon-themes` is removed.** `scheme` is now our own `globalType` beside
`density` and `variant`.

**MDX prose tables are themed in `tokens.css`**, transparent cells with a
`surface-raised` zebra, scoped `:not(.docblock-argstable):not(.sb-story *)`.

**`scripts/smokeStorybook.ts` gained a second, cold pass** — a fresh browser context that
`goto`s straight at `/?path=/docs/tokens-overview--docs` and asserts the axes resolve and
the prose table clears AA. The existing SPA pass stays; it exists for a different defect.

## Context

Kevin, looking at the composed site at `storybook.octen.dev`:

> *"the Charcuterie docs pages load in light mode until you click a story, and the tables
> on those pages are unreadable in dark mode"*

Measured in the preview iframe on `tokens-overview--docs`, before the fix:

| | cold load | after clicking a story |
| --- | --- | --- |
| `<html data-scheme/density/variant>` | **all three absent** | present |
| `--color-surface-base` | **empty string** | `#131822` |
| MDX `th`/`td` colour | `rgb(46, 51, 56)` | `rgb(46, 51, 56)` — ~**1.1:1** on `#131822` |
| MDX even-row background | `rgb(246, 249, 252)` | `rgb(246, 249, 252)` under `rgb(237, 240, 245)` text |

After: `data-scheme="dark"`, `data-density="comfortable"`, `data-variant="daylight"`,
`--color-surface-base` `#131822`, `th` `rgb(169, 178, 193)`, `td` `rgb(237, 240, 245)`,
zebra `rgb(29, 36, 48)`. Flipping the toolbar to Light **while sitting on Overview**, with
no story ever rendered, gives `#f5f7fa` / `rgb(78, 87, 105)` / `rgb(23, 29, 40)`.

## Why

**A missing attribute is not "light scheme" — it is no theme at all.**
`packages/tokens/dist/variables.css` defines every `--color-*` under `[data-scheme]`, and
`:root` carries no colour fallback. So a page that never got the attribute resolves every
token to the empty string and falls through to stock Storybook light. That is why the
symptom read as "loads in light mode": it was not a scheme, it was the absence of one.

**Decorators are the wrong altitude for a document-level attribute.** Every axis was
written by a story decorator — `writeHtmlAttribute` for two of them, and
`withThemeByDataAttribute`, which is also a decorator, for the third. `Tokens.mdx` is
unattached prose: no `<Meta of={…}>`, no `<Canvas>`, not one `<Story>`. Nothing
story-shaped ever runs on it, so nothing ever wrote the attributes. And because the
preview document is *shared*, clicking any story stamped them and nothing removed them —
so navigating back to Overview showed a correctly dark page, and the bug looked like it
did not exist.

**A seed alone would have been a half-fix**, and the visible half. `previewHead` is static:
it would have made the cold load correct and left the toolbar dead on Overview, which is
worse than the original in one respect — the page would look right, so nobody would find
the control that does nothing. The channel subscription is the half that makes the axes
*live* without a story, and it is the reason `withThemeByDataAttribute` had to go: its
write happens inside a decorator's `useEffect`, which is not reachable from outside a
render.

**The decorator is kept, narrowly, and that is not a hedge.** `setProjectAnnotations` under
`vitest.ui.setup.ts` applies this preview with no preview runtime behind it, so
`addons.ready()` never resolves there — and `test:ui-dom` is the *one* suite that asserts
density-derived sizes. Removing the decorator outright would have left 129 tests rendering
against `:root`, passing, measuring fallbacks. Story `globals` overrides
(`TokenSpecimen`'s `Light`, `Compact`, `Kiosk`) reach a decorator's context too.

**`themeAxes.ts` exists because `main.ts` and `preview.tsx` cannot see each other.** One
runs in Node, one in the browser, separate bundlers, separate module graphs. A seed of
`dark` under an `initialGlobals` of `light` paints the wrong theme for exactly one frame —
which reads as a flash, not as a bug, and would survive indefinitely. The only thing that
stops that is a file both import, so the seed *script string* is generated from the same
table rather than hand-written.

**Owning `scheme` costs one small UI change and buys the ability to fix it.** The addon
rendered a two-state paintbrush toggle labelled "dark theme"; there is now a `Scheme`
dropdown with Dark/Light, placed last so `Density` and `Variant` do not move. Three
sibling axes that look like siblings is the better read anyway, and running two axes
through a mechanism we own and the third through an addon's internals meant the one that
broke was the one we could not reach.

**The tables were never covered, and no component could cover them.** `tokens.css` set
`border-color` on `table, th, td, tr` and stopped; the transparent-cell and tokenised-text
rules were scoped to `.docblock-argstable`, the props table. Storybook's own `Table`
styled-component then painted rows from the stock **light** DocsContainer theme. A GFM
table in MDX is a plain `<table>`, and Charcuterie deliberately ships `SortableTableHeader`
and nothing else ([2026-08-02](2026-08-02-sortabletableheader-toast-and-filedropzone-ship-in-1-0-0.md)
— *"The header cell, and nothing else"*), so CSS is the only layer that can reach it.
Ten MDX files render one: `Tokens`, `Menu`, `Button`, `Select`, `Field`, `Toast`,
`Tooltip`, `Accordion`, `MediaTile`, `SortableTableHeader`. A real `Table` component is
tracked separately, per Kevin's call; it would not have fixed this page.

**`!important` again, under the existing exception**
([2026-07-31](2026-07-31-important-is-for-storybook-chrome-only.md)) and for the identical
reason: Storybook's rule doubles its own runtime-injected emotion class, and a static
stylesheet loses equal specificity on source order. `:not(.sb-story *)` is more
load-bearing here than anywhere else in the file — `SortableTableHeader`'s own stories
render tables, and restyling the component being documented is the exact opposite of the
point.

**Why CI missed both, and what the cold pass is really for.** `smokeStorybook.ts` does one
`page.goto` at a **story**, then SPA-navigates every docs page over the addons channel —
deliberately, because the `addon-docs/blocks` ordering defect it was written for *only*
exists on an SPA transition. But that shape means a decorator has always already run
before any docs page is measured, so the cold-load case was **structurally unobservable**.
Its contrast probe read `.docblock-argstable` cells and never `.sbdocs-content table`. The
composed site deep-links straight at a docs path, so **cold load is the normal case
there** — the one case the gate could not see was the one users hit.

## Evidence

The gate fails before the fix and passes after, which is the only claim worth making about
a gate. Against the pre-fix build:

```
✗ Tokens/Overview › cold load (tokens-overview--docs)
  <html> has no usable `data-scheme` (got null) on a cold load.
✗ Tokens/Overview › cold load (tokens-overview--docs)
  `--color-surface-base` resolves to nothing, so every token below it is unset…
✗ Components/Toast › Docs (components-toast--docs)
  prose table cell (…) is 1.39:1 — below WCAG AA.

22 problem(s) across 151 entries.
```

After: `✓ 151 Storybook entries rendered clean under SPA navigation, and
tokens-overview--docs is themed on a cold load.` — with `test:ui-dom` 129/129,
`test:storybook` 125/125, `lint` and `typecheck` clean.

Screenshots: `__screenshots__/docs-cold-load-dark.png` (cold, never touched a story) and
`__screenshots__/docs-toolbar-flip-light.png` (toolbar flipped **on Overview**, still no
story).

Chat: 2026-08-03, *"Add gallery-downloader to the composed Storybook, and fix the theming
it exposes"*.
