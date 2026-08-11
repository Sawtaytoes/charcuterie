---
"@charcuterie/vite-config": minor
---

Fail loudly when an `index.html` comment shadows one of Vite's script-injection anchors — the blank-dev-page bug that shipped twice in six days.

Vite finds its injection points with plain, comment-blind regexes (`/<head[^>]*>/i` and siblings for `</head>`, `<body>`, `</body>`, `</html>`), so the **first** literal `<head>` in the file wins even inside `<!-- … -->`. `@vitejs/plugin-react`'s react-refresh preamble and `/@vite/client` then land inside the comment, where the browser never parses them: `yarn dev` serves a blank page, `$RefreshReg$` is undefined, HMR is dead.

**Production builds are unaffected**, so `typecheck`, `lint`, `unit-tests`, `e2e`, `build-budget` and `storybook-build` all stay green while the dev loop is completely broken. image-viewer hit it on 2026-08-05 and wrote a Locked decision record that reached nobody else; mux-magic hit the identical bug on 2026-08-11 ([#200](https://github.com/Sawtaytoes/mux-magic/issues/200)).

The base config now ships `charcuterie:no-shadowed-injection-anchors`. It is **not opt-in** and it throws in `serve` *and* `build`:

- `configResolved` reads `index.html` (and any HTML rollup input) off disk, so `yarn dev` dies at **startup** with the file, the line, the snippet and the fix printed. A check that only ran on the first request would let the server come up looking healthy.
- `transformIndexHtml` (`order: "pre"`) catches the served document.

The condition is Vite's actual failure condition — the first match of an anchor lies inside a comment — not a blanket ban on tag literals. mux-magic's shipped fix keeps the word `<head>` in a comment that now sits *inside* `<head>`, and that file is correct. Open `<html>` is not an anchor and is never reported.

**Adopting this may fail your build until one line of prose is reworded.** Swept over the fleet's checkouts, two repos are affected: mux-magic (`<head>` at line 10 — the known bug, fix already open) and rip-deck (`<body>` at line 62 — latent, nothing injects at `body-prepend` there today).

`findShadowedInjectionAnchors(html)`, `assertNoShadowedInjectionAnchors(html, fileLabel)` and `createStructuralTagCommentGuard()` are exported for apps that build their Vite config by hand.
