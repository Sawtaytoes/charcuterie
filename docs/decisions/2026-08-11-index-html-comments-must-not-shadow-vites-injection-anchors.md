# Comments in `index.html` must not shadow Vite's injection anchors, and `@charcuterie/vite-config` enforces it

**Status:** Accepted
**Date:** 2026-08-11
**Type:** Convention + tooling
**Supersedes:** —
**Superseded by:** —

## Decision

An `index.html` must not contain a literal `<head>`, `</head>`, `<body>`, `</body>` or
`</html>` **inside an HTML comment that comes before the real tag**. Refer to them
without the angle brackets — `head`, not `` `<head>` `` — or put the comment below the
tag it describes.

`@charcuterie/vite-config` enforces it. The shared base now ships one plugin,
`charcuterie:no-shadowed-injection-anchors`, which is **not opt-in** and throws in both
`serve` and `build`.

This is **not** an ESLint rule. ESLint does not read HTML, and a standalone script nobody
wires up is not a mechanism. `@charcuterie/vite-config` is the seam every affected app
already consumes, and it is the only place that can fail the thing that actually breaks:
the dev server.

## Context

`packages/web/index.html` in mux-magic opened with a long explanatory comment between
`<!DOCTYPE html>` and `<html>`, and line 10 of that comment contained the literal string
`<head>` — nine lines before the real element.
[mux-magic#200](https://github.com/Sawtaytoes/mux-magic/issues/200):

> Vite finds its `head-prepend` injection point with a plain, comment-blind regex, so the
> FIRST literal `<head>` in the file won — the one inside the comment on line 10, not the
> real element on line 19.

`@vitejs/plugin-react`'s react-refresh preamble and `/@vite/client` were therefore
written into the comment. `yarn dev` served a blank body,
`@vitejs/plugin-react can't detect preamble` in the console, `$RefreshReg$` undefined,
HMR dead.

**Production builds take a different path and need no preamble, so every required CI job
stayed green** — `typecheck`, `lint`, `unit-tests`, `e2e`, `build-budget`,
`storybook-build`. Nothing in the fleet starts a dev server in CI.

**And it had already been solved, in another repo, six days earlier.**
`image-viewer/docs/decisions/2026-08-05-no-structural-tag-literals-in-index-html-comments.md`
is a **Locked** record of the identical failure: same blank window, same "can't detect
preamble", same one-line fix. Its rule — *"Comments in `index.html` must not contain a
literal `<head>` or `<body>` tag"* — never left that repo's decisions folder, and
mux-magic hit the bug on 2026-08-11. That is the unification program's second-order
effect verbatim: *the same bug gets fixed once per app, or more often not at all.*

## Why

**Why it fails at dev-server start and not on first request.** The failure being replaced
is a silent blank page. A check that only ran when a browser asked for the document would
let the server come up looking perfectly healthy, which is the experience being fixed. So
`configResolved` reads `index.html` (and any HTML rollup input — a multi-page app's
second page fails identically) straight off disk and throws before anything listens.
`transformIndexHtml` (`order: "pre"`) is the second net, for HTML an earlier plugin
generated.

**Why it also runs in `build`.** Production is unaffected by the bug. A serve-only check
would leave CI exactly as blind as it was both times this shipped — which is the whole
reason the bug reached `master` twice.

**Why "before the real tag" rather than image-viewer's blanket ban.** mux-magic's shipped
fix (`1da8b296`) keeps the word `<head>` in its comment; it moved the comment *inside*
`<head>`, so the first literal in the file is now the real element. That file is correct
and a blanket ban would fail it. The condition checked here is Vite's actual failure
condition — *the first match of an injection anchor lies inside a comment* — so the rule
is exactly as strict as the bug and no stricter. This is a **generalisation** of the
image-viewer record, not a contradiction of it: every file that record forbids, this one
forbids too.

**Why open `<html>` is not an anchor.** Vite has no head-of-`html` injection point.
image-viewer's leading comment opens *"The three Charcuterie axes on `` `<html>` ``"* and
that shadows nothing, so flagging it would be a false positive on a working file.

**Why not opt-in.** The component-choice and flex-overflow blocks are opt-in because
adopting them turns a repo red over judgement calls. This one has no judgement in it:
every hit is a dev server that does not work, and the fix is one line of prose. Its blast
radius is bounded and known — see below.

## Evidence

`packages/vite-config/src/structuralTagComments.test.ts` runs against four fixtures
copied verbatim from the repositories: mux-magic's `packages/web/index.html` either side
of `1da8b296`, and image-viewer's `index.html` either side of its 2026-08-05 fix (the
diff is one line). Both *before* files are caught on the right line; both *after* files
are clean **while still containing a tag literal in a comment**, which is what makes the
"shadow" framing load-bearing rather than decorative.

Driven end to end against a real Vite dev server (`createServer` + `listen`, each
fixture as `root/index.html`):

```
mux-magic BEFORE: dev server REFUSED TO START
  line 10: a literal `<head>` inside an HTML comment comes before the real one
    the `@charcuterie/tokens` `buildFirstPaintScript` snippet in <head> below,
mux-magic AFTER : dev server STARTED (no error)
image-viewer BEFORE: dev server REFUSED TO START
  line 5: a literal `<head>` inside an HTML comment comes before the real one
    the inline first-paint script in `<head>` below, from the saved choice
image-viewer AFTER : dev server STARTED (no error)
```

Swept over all 19 `index.html` files in the fleet's checkouts, **two** repos fail today:

- **mux-magic** `packages/web/index.html` — `<head>` at line 10. The known bug; its fix
  is already open as [#201](https://github.com/Sawtaytoes/mux-magic/pull/201).
- **rip-deck** `packages/web/index.html` — `<body>` at line 62, in a comment *inside*
  `<head>` explaining the first-paint script. **A new finding.** It is latent rather than
  live: nothing in that app injects at `body-prepend` today, so nothing is visibly broken
  — but any plugin that ever does would write into the comment. One reworded line.

Everything else — gallery-downloader (three entries), points-market, mail-sifter,
castkit, plex-channels, portly-controllers, ai-usage, image-viewer — is clean.

## Related

- `image-viewer/docs/decisions/2026-08-05-no-structural-tag-literals-in-index-html-comments.md`
  — **Locked**, and the origin of this rule. Generalised, not superseded: this record
  moves it into the shared build seam and narrows "any comment" to "a comment that
  shadows the real tag", so mux-magic's shipped fix passes.
- [A flex row's text child must declare how it shrinks](2026-08-11-a-flex-rows-text-child-must-declare-how-it-shrinks.md)
  — the same day's other mechanised bug.
