# @charcuterie/server

## 0.2.0

### Minor Changes

- 6d299c7: Add `rewriteRequestPath` to `createStaticHandler`, for a mount whose URL prefix is not a
  real directory under `rootDir`.

  `board-games` serves `/images/*` out of `$BOARD_GAMES_IMAGES`, which is nowhere near its
  web root, so the prefix has to come off before the lookup:

  ```ts
  app.use(
    "/images/*",
    createStaticHandler({
      immutablePathPrefixes: ["/images/"],
      rewriteRequestPath: (path) => path.replace(/^\/images/, ""),
      rootDir: imagesDirectory(),
    })
  );
  ```

  The cache bucket is still decided on the **request** path rather than the rewritten one,
  so `immutablePathPrefixes` keeps naming URLs as a caller sees them — rewriting is about
  where bytes live on disk, caching is about what the browser was promised. The SPA fallback
  is deliberately not rewritten: `serveStatic` ignores `rewriteRequestPath` whenever `path`
  is set, so the shell always resolves against `rootDir` and a rewrite cannot misdirect it.

  Came out of the consumer rather than the plan — the migration doctrine working as
  intended.

## 0.1.0

### Minor Changes

- fab6756: Add `@charcuterie/server` — the fleet's Hono static-asset handler, plus the Vite plugin
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
