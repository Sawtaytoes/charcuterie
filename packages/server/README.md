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

## Deploy updates in open tabs

`createStaticHandler` also serves a no-cache build marker at
`/__charcuterie/deployment` and an SSE marker stream at
`/__charcuterie/deployment/events`. The marker is a SHA-256 hash of the deployed
`index.html`. A Vite build changes the shell when it names a new asset set.

An `EventSource` reconnects after the container replacement. Its first event from the new
container contains the new marker. Pair the server with `useDeploymentUpdate` from
`@charcuterie/ui`; it reports `isUpdateAvailable` and gives the app a `reload` action. The
hook does **not** reload a tab by itself because the tab can have unsaved work.

An app that already has an SSE connection can avoid a second stream:

```tsx
const { checkForUpdate, isUpdateAvailable, reload } = useDeploymentUpdate({
  isEventSourceEnabled: false,
})

// In the existing SSE source's successful reconnect callback:
void checkForUpdate()
```

Render an accessible button when `isUpdateAvailable` is true, and call `reload` from that
button. The static shell already sends `Cache-Control: no-cache`, so the reload fetches the
new shell and its new immutable asset URLs. Set both `deploymentPath` and
`deploymentEventsPath` to `false` only for an asset-only origin with no browser client.

## Refuse cross-site writes, and limit request bodies

Most fleet apps have no login, so any web page the owner opens could otherwise write to
them: a `text/plain` `no-cors` POST needs no preflight, and Hono's `c.req.json()` parses it
anyway. DNS rebinding makes a hostile page same-origin with the app. `createWriteGuard`
closes both paths. `createBodyLimit` caps how much of a request body a route can read.

```ts
import {
  createBodyLimit,
  createWriteGuard,
  parseHostList,
} from "@charcuterie/server"

const MB = 1024 * 1024

app.use(
  "/api/*",
  createWriteGuard({
    allowedHosts: parseHostList(process.env.MYAPP_ALLOWED_HOSTS),
    allowedOrigins: parseHostList(process.env.MYAPP_ALLOWED_ORIGINS),
    clientHeader: "x-myapp-client",
    hostSettingName: "MYAPP_ALLOWED_HOSTS",
    isEmptyHostListWritable: process.env.NODE_ENV !== "production",
  }),
)
// One limit per write route, each sized for that route.
app.post(
  "/api/items",
  createBodyLimit({ maxBytes: 64 * 1024 }),
  createItem,
)
app.post(
  "/api/photos",
  createBodyLimit({ maxBytes: 30 * MB }),
  uploadPhoto,
)
```

The guard, in order:

- **`Host`**: loopback on any port, or an entry of `allowedHosts` (`app.example.com` matches
  any port; `192.0.2.10:3013` matches that port only). With a list, any other host gets
  `421`, reads included. With an **empty** list, reads pass and writes from a non-loopback
  host get `421` that names `hostSettingName`, unless `isEmptyHostListWritable` is set.
- **On `POST`, `PUT`, `PATCH`, and `DELETE`**: an `Origin`, when present, must be the
  request's own host or an `allowedOrigins` entry (`null` is refused). A `Sec-Fetch-Site`,
  when present, must be `same-origin` or `none`, unless the `Origin` is listed.
- **The body**: JSON (`application/json`, or `application/<x>+json`), or the
  `clientHeader` for a deliberate non-JSON body such as a multipart upload. Your own
  client sends that header on its upload `fetch`. A bodiless `PUT`, `PATCH`, or `DELETE`
  passes. A bodiless `POST` needs the header, a JSON `Content-Type`, a matching `Origin`,
  or `Sec-Fetch-Site: same-origin`.

Every refusal is `{ error }` JSON. `curl` with a JSON body, scripts, and Home Assistant send
no `Origin` and no `Sec-Fetch-*`, so they pass. `judgeWriteRequest` is the same decision as a
pure function, for an app that is not on Hono. This is **not** authentication: anything that
can open a connection to the port can still write.

`createBodyLimit({ maxBytes, message? })` wraps `hono/body-limit` and answers `413` with
`{ error }`. Mount it on the route, **ahead of** the handler. A size check after
`await c.req.arrayBuffer()` or `c.req.parseBody()` is not a limit: the whole body is
already in memory when it runs. The middleware refuses a request with `Content-Length` from
the header alone, and counts a chunked request as it streams, so a route never reads more
than `maxBytes` of body. Parsing can still allocate a small multiple of that, so size each
route's limit for that route. Do not add an `/api/*` default limit in front of per-route ones: both run, so the smaller
one wins, and a 30 MB upload under a 64 KB default is refused at 64 KB.

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

`<base>/status` is retained, and the connection's last will sets it to `{ online: false }`
when the app drops off the broker. **Every reconnect puts the status back**: the service
republishes the last retained status the app published, or `{ online: true }` if it
published none, including a status the app published while it was disconnected. `mqtt`
resubscribes `cmd/+` on its own. `reconnectPeriodMs` sets the wait between attempts
(default 5000). `createMqttService.broker.test.ts` proves the round trip with the real
client against a broker on a socket.

TLS defaults on when the port is `8883` (`mqtt.octen.dev`). Pass `isTls` to override.
`truenas-mqtt`'s `trigger`/`status` tree is a legacy special case — new apps use
`cmd`/`resp`. This does **not** belong in `@charcuterie/streams` (browser, push-only).

## Outbound HTTP cache and throttle

The opposite direction from everything above: this is about responses the app
**receives** from somebody else's server. Import `@charcuterie/server/http`. Zero
dependencies, no `fetch` of its own.

**The library never owns storage.** Five apps in the fleet cache third-party HTTP and all
five picked a different substrate — two SQLite tables, two directories of JSON files, one
memory `Map` written through to a file — and every one is right where it sits. What
repeats is the *policy*, so that is what moved here: how long an answer is still true,
and how often we are allowed to ask.

```ts
import {
  createHttpCache,
  createThrottle,
  ONE_DAY_MS,
} from "@charcuterie/server/http"

const cache = createHttpCache<string>({
  fetchFromOrigin: async ({ etag, key }) => {
    const response = await fetch(key, {
      headers: etag == null ? {} : { "if-none-match": etag },
    })

    if (response.status === 304) return { outcome: "unchanged" }
    if (response.status === 404) return { outcome: "missing" }
    if (!response.ok) return { outcome: "unavailable" }

    return {
      etag: response.headers.get("etag"),
      outcome: "payload",
      payload: await response.text(),
    }
  },
  lifetime: ONE_DAY_MS,
  store: {
    // Whatever the app already has. Synchronous is fine.
    read: ({ key }) => selectRow(key),
    write: ({ key, record }) => upsertRow(key, record),
  },
  throttle: createThrottle({ minIntervalMs: 1_000 }),
})

const { payload, source } = await cache.get({ key: url })
```

### Lifetime

`"immutable" | "none" | number`. `"immutable"` is a **claim about the URL**, not a hint —
a file at a 40-character commit hash cannot become a different file. `"none"` keeps a
read out of the store entirely. A number is milliseconds, and it is set at the call site,
because only the call site knows how fast its answer moves.

### ⚠️ A 304 saves bandwidth. It does NOT save budget.

Measured against the live GitHub API on 2026-08-24, unauthenticated: every conditional
request came back 304 and `x-ratelimit-remaining` still fell by one. GitHub documents a
304 as free against the **primary** rate limit, and the unauthenticated per-address limit
is not that limit. An `ETag` buys the body back, never the budget. **Only a lifetime that
has not run out saves budget**, because the only free request is the one never sent.

### The four politeness axes are four different things

| Option | Means |
| --- | --- |
| `minIntervalMs` | The minimum gap between two starts. |
| `maxConcurrent` | How many may be in flight at once. |
| `maxPerWindow` + `windowMs` | A budget that refills. |
| `cooldownMs` | Everything stops after a failure. |

A gap is not a budget: one request per second permits 3600 an hour, and a 60-an-hour
budget permits three in the first second. `run` queues for a slot; `tryRun` returns
`null` rather than queueing, for a caller on a poll loop that would rather drop the work
and pick it up next tick.

### Also handled

- **Negative caching.** `missLifetime` remembers "the origin had no such thing", which
  one app already depends on. Defaults to `"none"`.
- **Stale-while-revalidate.** `isStaleWhileRevalidate` returns the stale body at once and
  refreshes behind it. Off by default.
- **Single flight.** Concurrent reads of one key collapse into one request.
- **Failures are values.** An `"unavailable"` origin is never written down, serves the
  stale body, and starts the cooldown. Store errors degrade to a miss and go to
  `onError`; a cache is never the reason a page fails to render.

Naming is settled — `fetchedAt` / `expiresAt` / `etag`, no `Ms` suffix on a `*At` field,
`Ms` kept on every duration
([decision](../../docs/decisions/2026-08-25-an-outbound-http-cache-names-its-fields-fetchedat-and-expiresat.md)).

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
| `serverPathPrefixes` | — | The prefixes the server owns, such as `["/api", "/health"]`. Widens the fallback to every GET or HEAD miss outside these prefixes and `immutablePathPrefixes`, extension or not. |
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

### Client routes that end in an extension

The default fallback serves the shell only for an **extensionless** miss, because that is
how it tells a client route (`/errors`) from a missing file (`/gone.js`). A docs viewer
breaks that rule: Folio's document routes end in `.md`, because the URL is the file's real
path, so the first reload of any deep link would 404.

Name the prefixes the server owns instead, and the fallback serves the shell for every
other GET or HEAD miss:

```ts
// Every path the server answers. A client route must not be here.
const SERVER_PATH_PREFIXES = ["/api", "/health"]

app.route("/api", apiApp)
app.use(
  "*",
  createStaticHandler({
    rootDir: webDistDir,
    serverPathPrefixes: SERVER_PATH_PREFIXES,
  }),
)
```

The width of that list is the whole trick. Too narrow, and a missing API route answers
`200` with HTML where the client expected JSON. Too wide, and a real client route is
swallowed. A miss under a listed prefix falls through to the app's own 404, and so does a
miss under `immutablePathPrefixes`: a missing hashed asset stays a 404, never the shell
that produces `Unexpected token '<'`. Prefixes match on a segment boundary, so `/api` owns
`/api/items` and not `/apiary`. `getIsServerPath` is the same test, exported for an app
that needs it elsewhere.

This replaces the hand-written second handler that Folio, Foyer, and Plinth each carried:
a `createStaticHandler` with `rewriteRequestPath: () => "/index.html"` behind an
`app.get("*")` that skipped the server's own prefixes.

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

Set headers on the Response that `serveStatic` returns, which is what this package does.
Do not set them on the context before the lookup either: a miss then carries them into the
app's next handler, and the app's 404 for a missing hashed asset goes out as `immutable`.

## Peer dependencies

`hono` and `@hono/node-server` are required peers — the app owns the versions. **Vite is
not a dependency of any kind**, not even an optional peer. The `/vite` entry point writes
out the slice of Vite's `Plugin` it fills in, instead of importing it, and the app's
`vite.config.ts` checks it against the real one. An optional peer was not enough: pnpm links
an optional peer to the workspace's own Vite and records it in the lockfile, so a
`pnpm install --prod` of an app's server installed Vite, Rolldown, and their native
binaries, 25 to 30 MB the server never loads. A test fails if `vite` returns to
`package.json` or to a non-test import. `mqtt` is an **optional** peer needed only by the
`/mqtt` entry point, so a static-only app never resolves a broker client. The `/http`
entry point has **no dependencies at all** — not even Hono.
