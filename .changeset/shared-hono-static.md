---
"@charcuterie/server": minor
---

Add `@charcuterie/server` — the fleet's Hono static-asset handler, plus the Vite plugin
that feeds it.

An audit of the six apps serving a Vite SPA from Hono found that **none of them compressed
anything**, and that four hand-rolled the same twenty lines with four different sets of
omissions. Mux-Magic was the worst case: a 1.02 MB bundle (290 kB gzipped) served
uncompressed under `Cache-Control: no-cache, no-store, must-revalidate` — on a
content-hashed filename, so every reload re-downloaded 1.2 MB that could have been 318 kB
and could have been cached for a year.

- `createStaticHandler({ rootDir })` — negotiated `.br`/`.zst`/`.gz`, `immutable` for
  `/assets/*` and `no-cache` for everything else, `ETag`/304 on the revalidating bucket
  only, streaming, `Range`, MIME, traversal defence, and a missing `.js` that 404s instead
  of returning the SPA shell.
- `precompressAssets()` from `@charcuterie/server/vite` — writes the compressed siblings at
  build time at Brotli quality 11, since the bytes are identical for every visitor and
  change only when the build does.

Adopting the two halves in either order is safe: with no siblings on disk the handler
serves the originals.

Found while writing this, and worth knowing wherever `serveStatic` is used directly:
**`serveStatic`'s `onFound` cannot set response headers.** It runs after the Response is
built, so its headers are silently dropped — which is why `board-games`' `immutable` on
`/images/*` has never reached a browser. Verified against `@hono/node-server` 2.1.0. Set
headers in a middleware before `serveStatic` instead, which is what `createStaticHandler`
does.
