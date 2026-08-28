# @charcuterie/server

## 0.5.1

### Patch Changes

- 6b52de5: Let static handlers initialise before their Vite output exists. Deployment marker routes now fall through until `index.html` is available.

## 0.5.0

### Minor Changes

- 5c044d2: Detect replaced static-SPA deployments with no-cache build markers and an SSE reconnect signal. `useDeploymentUpdate` exposes a safe user-controlled reload action.

## 0.4.0

### Minor Changes

- 1ebe28f: Add `@charcuterie/server/http` — outbound HTTP cache policy and a politeness throttle,
  over a read/write pair the caller supplies.

  Five owned apps fetch third-party HTTP and cache the responses, and no two of them share a
  substrate. So the library takes the **policy** and never the store: `createHttpCache` reads
  and writes through two functions the app provides, which may be synchronous.

  - `resolveCacheDecision` — a pure function. `"use"` (no request, the only outcome that
    saves a rate-limit budget), `"revalidate"`, or `"fetch"`.
  - Lifetime is `"immutable" | "none" | number`, set per call site.
  - `createThrottle` — `minIntervalMs`, `maxConcurrent`, `maxPerWindow` + `windowMs`, and a
    provider-wide `cooldownMs`. `run` queues for a slot; `tryRun` returns `null` instead, for
    a caller on a poll loop. A slot is claimed before the task starts, so concurrent callers
    are spaced like sequential ones.
  - Conditional revalidation, negative caching (`missLifetime`), stale-while-revalidate,
    single flight, and store errors that degrade to a miss rather than throwing.

  ⚠️ A 304 saves the transfer and **not** the budget. Measured against the live GitHub API:
  `x-ratelimit-remaining` falls on every conditional request. GitHub's documented exemption
  is for the _primary_ limit, and the unauthenticated per-address limit is not that limit.

## 0.3.0

### Minor Changes

- 439b0f8: Add `@charcuterie/server/mqtt` — Node cmd/resp over the house broker.

  `createMqttService({ base, host })` subscribes `<base>/cmd/+` and replies on
  `<base>/resp/<action>`. Command and response publishes are never retained; a
  second command for an action that is already running is rejected with
  `{ ok: false, reason: "already-running" }`. `mqtt` is an optional peer, so a
  static-only app never resolves it.

  Not a new package (those need a manual first publish) and not
  `@charcuterie/streams` (browser, push-only).

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
