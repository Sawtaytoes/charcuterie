# @charcuterie/server

The fleet's Node server kit: **precompressed bytes, honest cache headers, and
one 304 where it helps**, plus MQTT `cmd/*` / `resp/*` for talking to Home Assistant.
The Vite plugin that produces the compressed bytes lives beside the static handler
because the two halves are one contract and shipping them apart is how they drift.
MQTT is a separate subpath so a static-only app never resolves `mqtt`.

## Why this exists

Six apps in the fleet serve a Vite SPA from a Hono server. All six hand-rolled it, and an
audit in August 2026 found that **none of them compressed anything**. Mux-Magic was the
worst case and the one that prompted this package: it served a 1.02 MB bundle uncompressed
(290 kB gzipped) under `Cache-Control: no-cache, no-store, must-revalidate` — on a
*content-hashed* filename. Every visit, every reload, every client-side navigation
re-downloaded 1.2 MB that could have been 318 kB and could have been cached forever.

The failure is not that anyone was careless. It is that "serve a directory" looks like
twenty lines, and the twenty lines leave out compression, cache policy, streaming, `Range`,
MIME types, traversal defence, and the difference between a missing route and a missing
asset.

## Usage

Two halves. Wire both.

```ts
// vite.config.ts — the build half
import { precompressAssets } from "@charcuterie/server/vite"
import { createViteConfig } from "@charcuterie/vite-config"

export default createViteConfig({
  plugins: [react(), precompressAssets()],
})
```

```ts
// server — the serve half
import { createStaticHandler } from "@charcuterie/server"

app.route("/api", apiApp)
app.use("*", createStaticHandler({ rootDir: webDistDir }))
```

Adopting them in either order is safe: with no `.br`/`.gz` siblings on disk the handler
serves the originals, and the siblings are inert until something looks for them.

## MQTT cmd/resp

Node-only. Import `@charcuterie/server/mqtt`, not the main barrel, and add `mqtt` as a
dependency of the app. Command and response topics are **never retained** — a broker
replay must not re-run a nightly. Overlapping commands for the same action are rejected
with `{ ok: false, reason: "already-running" }`.

```ts
import { createMqttService } from "@charcuterie/server/mqtt"

const mqtt = await createMqttService({
  base: "board-game-picker",
  host: process.env.MQTT_HOST,
  password: process.env.MQTT_PASS,
  username: process.env.MQTT_USER,
})

mqtt.handleCommand("sync", async (payload) => {
  // run the work
  return { ok: true, payload }
})
// board-game-picker/cmd/sync  →  board-game-picker/resp/sync
```

TLS defaults on when the port is `8883` (`mqtt.octen.dev`). Pass `isTls` to override.
`truenas-mqtt`'s `trigger`/`status` tree is a legacy special case — new apps use
`cmd`/`resp`. This does **not** belong in `@charcuterie/streams` (browser, push-only).

## What you get

| | |
| --- | --- |
| **Compression** | `.br` / `.zst` / `.gz` siblings, negotiated against `Accept-Encoding`, with `Vary` set. Written at build time at Brotli quality 11 — the bytes never change, so deriving them per request burns CPU while the user waits. |
| **Caching** | `/assets/*` → `public, max-age=31536000, immutable`. Everything else → `no-cache`. |
| **Revalidation** | `ETag` + `If-None-Match` → 304 with no body, applied **only** to the `no-cache` bucket. |
| **Streaming** | `createReadStream`, so a megabyte never lands in the heap. |
| **Correctness** | `Range` requests, MIME lookup, `../` traversal defence, and a missing `.js` that 404s instead of returning HTML. |

### The two cache buckets

There are only two kinds of file in a Vite `dist/`, and they want opposite headers.

**Content-hashed** files (`/assets/index-D7e1J0tu.js`) can never change behind their name,
so they are `immutable` — not merely `max-age`, which still permits a revalidation
round-trip on reload.

**Everything else** — `index.html`, anything in `public/` — keeps its name across deploys
and must be revalidated every time. `no-cache` does not mean "do not cache"; it means
"cache, then revalidate before reuse". Paired with an ETag the usual answer is a 304 with
no body.

`no-store` is the header that means "do not cache", and putting it on a hashed asset is
the bug this package exists to delete.

Bucketing is by **path prefix**, not by a hash-shaped regex. Vite's `assetsDir` is a build
guarantee; "does this filename look hashed" is a guess that is wrong in both directions
(`vendor-legacy.js` isn't hashed, `logo-v2.png` isn't either). Override with
`immutablePathPrefixes` if your `assetsDir` isn't `assets`, or to add your own
content-addressed directory:

```ts
createStaticHandler({
  immutablePathPrefixes: ["/assets/", "/images/"],
  rootDir: webDistDir,
})
```

The list **replaces** the default rather than extending it, so an app that renames
`assetsDir` and forgets to say so gets the safe answer — revalidated — instead of a year
of stale caching.

## Options

| Option | Default | |
| --- | --- | --- |
| `rootDir` | *required* | Absolute path to the build output. Relative paths resolve against `process.cwd()` — that is `serveStatic`'s behaviour, not ours. |
| `immutablePathPrefixes` | `["/assets/"]` | Request-path prefixes that may be cached forever. |
| `index` | `"index.html"` | The SPA shell, relative to `rootDir`. |
| `hasSpaFallback` | `true` | Serve `index` for extensionless paths that match no file. Turn off for a pure asset origin. |
| `rewriteRequestPath` | — | Map the request path onto `rootDir` before the lookup, for a mount whose URL prefix is not a real directory. |

### Mounting a directory that lives somewhere else

`board-games` serves `/images/*` out of `$BOARD_GAMES_IMAGES`, which is nowhere near the
web root:

```ts
app.use("/images/*", createStaticHandler({
  immutablePathPrefixes: ["/images/"],
  rewriteRequestPath: (path) => path.replace(/^\/images/, ""),
  rootDir: imagesDirectory(),
}))
```

The cache bucket is still decided on the **request** path, not the rewritten one — so
`immutablePathPrefixes` keeps naming URLs as a caller sees them. Rewriting is about where
bytes live on disk; caching is about what the browser was promised. The SPA fallback is
unaffected: `index` resolves against `rootDir` directly, so a rewrite cannot misdirect the
shell.

`precompressAssets()` takes `algorithms` (default `["br", "gz"]`) and `thresholdBytes`
(default `1024`). `zst` is supported but near-pointless as a third: the handler prefers
Brotli, every browser that speaks zstd also speaks Brotli, and gzip is already the floor
for the ones that speak neither.

## Migrating a hand-rolled handler

Every version in the fleet is one of three shapes.

**The `readFileSync` loop** (points-market, mail-sifter, gallery-downloader, Mux-Magic) —
a content-type map, a `Cache-Control` ternary, an SPA fallback, and a traversal guard.
Delete all of it, including the `CONTENT_TYPES` constant and the `isWithinRoot` helper.

```diff
-app.use("*", async (context) => {
-  const filePath = /* …twenty lines… */
-  context.header("Content-Type", CONTENT_TYPES[ext] ?? "application/octet-stream")
-  context.header("Cache-Control", "no-cache, no-store, must-revalidate")
-  return context.body(readFileSync(filePath))
-})
+app.use("*", createStaticHandler({ rootDir: webDistDir }))
```

**The bare `serveStatic`** (board-games) — already streaming, but with no compression and
no cache policy. Swap the call.

**`serveStatic` + `onFound`** (board-games' `/images/*`) — ⚠️ **this one is silently
broken today.** `onFound` runs *after* `serveStatic` has built the Response, so the
headers it sets are dropped on the floor; board-games' `immutable` on box art has never
reached a browser. Verified against `@hono/node-server` 2.1.0:

```ts
serveStatic({ root, onFound: (_p, c) => c.header("Cache-Control", "immutable") })
// → response has no cache-control header at all
```

Set headers in a middleware *before* `serveStatic`, which is what this package does.

## Peer dependencies

`hono` and `@hono/node-server` are required peers — the app owns the versions. `vite` is
an **optional** peer needed only by the `/vite` entry point, so a server never resolves
Vite and a build never resolves Hono. `mqtt` is an **optional** peer needed only by the
`/mqtt` entry point, so a static-only app never resolves a broker client.
