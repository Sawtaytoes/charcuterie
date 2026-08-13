# @charcuterie/vite-config

## 1.1.0

### Minor Changes

- 6a53f48: Fail loudly when an `index.html` comment shadows one of Vite's script-injection anchors — the blank-dev-page bug that shipped twice in six days.

  Vite finds its injection points with plain, comment-blind regexes (`/<head[^>]*>/i` and siblings for `</head>`, `<body>`, `</body>`, `</html>`), so the **first** literal `<head>` in the file wins even inside `<!-- … -->`. `@vitejs/plugin-react`'s react-refresh preamble and `/@vite/client` then land inside the comment, where the browser never parses them: `yarn dev` serves a blank page, `$RefreshReg$` is undefined, HMR is dead.

  **Production builds are unaffected**, so `typecheck`, `lint`, `unit-tests`, `e2e`, `build-budget` and `storybook-build` all stay green while the dev loop is completely broken. image-viewer hit it on 2026-08-05 and wrote a Locked decision record that reached nobody else; mux-magic hit the identical bug on 2026-08-11 ([#200](https://github.com/Sawtaytoes/mux-magic/issues/200)).

  The base config now ships `charcuterie:no-shadowed-injection-anchors`. It is **not opt-in** and it throws in `serve` _and_ `build`:

  - `configResolved` reads `index.html` (and any HTML rollup input) off disk, so `yarn dev` dies at **startup** with the file, the line, the snippet and the fix printed. A check that only ran on the first request would let the server come up looking healthy.
  - `transformIndexHtml` (`order: "pre"`) catches the served document.

  The condition is Vite's actual failure condition — the first match of an anchor lies inside a comment — not a blanket ban on tag literals. mux-magic's shipped fix keeps the word `<head>` in a comment that now sits _inside_ `<head>`, and that file is correct. Open `<html>` is not an anchor and is never reported.

  **Adopting this may fail your build until one line of prose is reworded.** Swept over every `index.html` on the live default branch of thirteen fleet repositories, one is affected: rip-deck (`<body>` at line 62 — latent, nothing injects at `body-prepend` there today). mux-magic was the other, and its fix has since merged.

  `findShadowedInjectionAnchors(html)`, `assertNoShadowedInjectionAnchors(html, fileLabel)` and `createStructuralTagCommentGuard()` are exported for apps that build their Vite config by hand.

## 1.0.2

### Patch Changes

- b34afdf: Stop forcing `build.target: "esnext"`, which was silently dropping the `-webkit-` prefixes Safari needs.

  Vite derives `build.cssTarget` from `build.target` when `cssTarget` is not given, so that one line made the CSS target `esnext` too — and at that level lightningcss stops emitting `-webkit-user-select` (so `select-none` does nothing), `-webkit-backdrop-filter` (blurred surfaces render flat) and `-webkit-text-decoration`. Every consumer lost them on adoption, with no build error.

  Pinning `cssTarget` on its own is not possible: it takes esbuild-style browser strings and rejects Vite's keyword outright. So the base no longer sets `target` at all, and Vite's own browser-safe default applies to both JS and CSS. An app that genuinely wants `esnext` (an Electron renderer, say) sets it in its own override, where the choice is visible.

  **Consumers should rebuild and confirm the prefixes are back** — `mux-magic` and `gallery-downloader` are the affected browser apps; `image-viewer`'s renderer is Chromium-only so it is unaffected in practice.

## 1.0.1

### Patch Changes

- 4e4ab17: Ship TypeScript declarations for the factory functions so strict-TS apps can import them in `vitest.config.ts` / `vite.config.ts` / `playwright.config.ts` without an implicit-any (TS7016) error.
