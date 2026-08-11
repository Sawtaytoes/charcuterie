# @charcuterie/vite-config

A shared Vite config **factory** for the Charcuterie fleet. Ships the build/server
defaults every app wants and leaves plugins to the caller, so one preset serves a React
SPA, an Electron renderer, and a library build.

## Usage

```ts
// vite.config.ts
import { createViteConfig } from "@charcuterie/vite-config"
import react from "@vitejs/plugin-react"

export default createViteConfig({
  plugins: [react()],
  build: { outDir: "dist/web" },
})
```

Overrides are **deep-merged** over the base via Vite's own `mergeConfig`. Apps with
multiple targets (e.g. image-viewer's Electron main/preload/renderer) call it once per
target with different overrides.

`vite` is a peer dependency — the app owns the Vite version; Renovate bumps this
package's range fleet-wide when the shared defaults change.

## The `index.html` guard

The base ships **one plugin**, `charcuterie:no-shadowed-injection-anchors`, and it is not
opt-in. It fails the build — and the dev server, at startup — when a structural tag
literal sits inside an HTML comment *before* the real tag it shadows.

Vite finds its script-injection points with plain regexes over the raw HTML
(`/<head[^>]*>/i` and siblings for `</head>`, `<body>`, `</body>`, `</html>`). They are
comment-blind, so the **first** literal `<head>` in the file wins even inside
`<!-- … -->`, and everything Vite meant to inject lands in the comment where the browser
never parses it. In dev that is `@vitejs/plugin-react`'s react-refresh preamble and
`/@vite/client`: the console says *"@vitejs/plugin-react can't detect preamble"*,
`$RefreshReg$` is undefined, HMR is dead, and the page is blank.

**Production builds are unaffected, which is exactly why this needs a mechanism.**
`typecheck`, `lint`, `unit-tests`, `e2e`, `build-budget` and `storybook-build` all stay
green while `yarn dev` serves nothing. It shipped twice, six days apart — image-viewer on
2026-08-05 (whose **Locked** decision record reached nobody else) and mux-magic on
2026-08-11 ([#200](https://github.com/Sawtaytoes/mux-magic/issues/200)) — which is what
moved it into the shared build seam instead of a twelfth copy of the same paragraph.

```
[@charcuterie/vite-config] packages/web/index.html would break the dev server.

  line 10: a literal `<head>` inside an HTML comment comes before the real one
    the `@charcuterie/tokens` `buildFirstPaintScript` snippet in <head> below,
  …
  Fix: drop the angle brackets in the prose (`head`, not `<head>`), or
  move the comment below the real tag. Both are one line.
```

Three things about its scope are deliberate:

- **"Before the real tag", not "never in a comment".** mux-magic's shipped fix keeps the
  word `<head>` in its comment — it moved the comment *inside* `<head>`, so the first
  literal in the file is now the real element. That file is correct and a blanket ban
  would fail it. The condition checked is Vite's actual failure condition, so the rule is
  exactly as strict as the bug.
- **Open `<html>` is not an anchor.** Vite has no head-of-`html` injection point, so
  image-viewer's leading comment naming `` `<html>` `` shadows nothing and passes.
- **It runs in `build` as well as `serve`.** Production is unaffected by the bug, so a
  serve-only check would leave CI exactly as blind as it was both times this shipped.

It fires in two hooks: `configResolved` reads `index.html` (and any HTML rollup input)
off disk so `yarn dev` dies at **startup** with the reason printed, and
`transformIndexHtml` (`order: "pre"`) catches the served document. A check that only ran
on the first request would let the server come up looking healthy — which is the exact
experience being fixed.

The pure half is exported for anything that wants to check HTML without a Vite config:

```ts
import { findShadowedInjectionAnchors } from "@charcuterie/vite-config"

findShadowedInjectionAnchors(html)
// [{ anchor: "<head>", line: 10, snippet: "…snippet in <head> below," }]
```

An app that builds its Vite config by hand can add
`createStructuralTagCommentGuard()` to its own `plugins`.
