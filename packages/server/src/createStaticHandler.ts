import { serveStatic } from "@hono/node-server/serve-static"
import type { MiddlewareHandler } from "hono"
import { etag } from "hono/etag"

import {
  DEFAULT_IMMUTABLE_PATH_PREFIXES,
  getIsImmutablePath,
  resolveCacheControl,
} from "./cachePolicy.ts"
import {
  createDeploymentHandler,
  DEFAULT_DEPLOYMENT_EVENTS_PATH,
  DEFAULT_DEPLOYMENT_PATH,
} from "./deployment.ts"
import { getIsShellPath } from "./paths/shellPath.ts"

/** The methods a static file answers. Everything else falls through. */
const READ_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "HEAD",
])

export type StaticHandlerOptions = {
  /**
   * Absolute path to the built SPA directory (Vite's `outDir`).
   *
   * Relative paths resolve against `process.cwd()` — `serveStatic`'s
   * behaviour, not ours — so pass an absolute path unless you
   * control the working directory at start-up.
   */
  rootDir: string

  /**
   * Request-path prefixes whose contents are content-hashed and may
   * be cached forever. Defaults to `["/assets/"]`, Vite's
   * `build.assetsDir`. A miss under one of these is never the SPA
   * shell, with or without `serverPathPrefixes`: it falls through
   * to the app's 404.
   */
  immutablePathPrefixes?: readonly string[]

  /** The SPA shell, relative to `rootDir`. */
  index?: string

  /**
   * Serve `index` for extensionless paths that match no file, so
   * client-side routes survive a hard refresh. Turn it off for a
   * server that is only an asset origin.
   */
  hasSpaFallback?: boolean

  /**
   * The request-path prefixes the **server** owns, such as
   * `["/api", "/health"]`. Setting it widens the SPA fallback:
   * every GET or HEAD that matches no file gets the shell, **even
   * a path with an extension**, unless it falls under one of these
   * prefixes or under `immutablePathPrefixes`.
   *
   * Use it when a client route can end in an extension. Folio's
   * document routes end in `.md`, because the URL is the file's
   * real path, so the extensionless rule would 404 the first
   * reload of every deep link.
   *
   * The width of the list is the whole trick. Too narrow, and a
   * missing API route answers `200` with HTML where the client
   * expected JSON. Too wide, and a real client route is swallowed.
   * A miss under a listed prefix falls through to the next handler,
   * so the app's own 404 answers it. A miss under
   * `immutablePathPrefixes` falls through too: a missing hashed
   * asset is a 404, never the shell.
   *
   * Matches on a segment boundary (see `getIsServerPath`).
   * Ignored when `hasSpaFallback` is `false`. `getIsShellPath`
   * from `@charcuterie/server/paths` is this same rule, for a
   * server that is not Hono.
   */
  serverPathPrefixes?: readonly string[]

  /**
   * Map the request path to a path under `rootDir` before the lookup.
   *
   * For a mount whose URL prefix is not a real directory —
   * `board-games` serves `/images/*` out of `$BOARD_GAMES_IMAGES`,
   * which is somewhere else entirely:
   *
   * ```ts
   * app.use("/images/*", createStaticHandler({
   *   immutablePathPrefixes: ["/images/"],
   *   rewriteRequestPath: (path) => path.replace(/^\/images/, ""),
   *   rootDir: imagesDirectory(),
   * }))
   * ```
   *
   * **The cache bucket is still decided on the *request* path**, not
   * the rewritten one, so `immutablePathPrefixes` keeps naming URLs as
   * a caller sees them. Rewriting is about where bytes live on disk;
   * caching is about what the browser was promised.
   *
   * Does not apply to the SPA fallback — `index` is resolved against
   * `rootDir` directly, so a rewrite cannot misdirect the shell.
   */
  rewriteRequestPath?: (path: string) => string

  /**
   * Path for the no-cache JSON build marker. Set to `false` only for
   * an asset origin that has no browser client. Defaults to
   * `/__charcuterie/deployment`.
   */
  deploymentPath?: string | false

  /**
   * Path for the build-marker SSE stream. Set to `false` with
   * `deploymentPath` for an asset-only origin. Defaults to
   * `/__charcuterie/deployment/events`.
   */
  deploymentEventsPath?: string | false
}

/**
 * The fleet's static handler: **precompressed bytes, honest cache
 * headers, one 304 where it helps.**
 *
 * Three things every app was getting wrong on its own, and what this
 * does instead:
 *
 * 1. **Compression.** `precompressed: true` makes `serveStatic` look
 *    for `.br`/`.zst`/`.gz` siblings and serve the best one the
 *    client accepts, with `Content-Encoding` and `Vary` set. Pair it
 *    with `precompressAssets()` from `@charcuterie/server/vite`,
 *    which writes those siblings at build time — compressing per
 *    request would burn CPU re-deriving bytes that never change.
 *    With no siblings on disk this silently serves the originals, so
 *    adopting the handler before the plugin is safe.
 * 2. **Caching.** Hashed assets get `immutable`; everything else gets
 *    `no-cache`. See `cachePolicy.ts` for why those two and nothing
 *    in between.
 * 3. **Revalidation.** `hono/etag` turns the `no-cache` bucket's
 *    reload into a 304-with-no-body. It is applied **only** to that
 *    bucket: hashing costs a full buffer of the response, and an
 *    `immutable` asset is never revalidated, so an ETag on it is
 *    pure cost.
 *
 * `serveStatic` also brings streaming (`createReadStream`, so a
 * megabyte never lands in the heap), `Range` support, MIME lookup,
 * and `../` traversal defence — all of which the hand-rolled
 * handlers this replaces had to write, or forgot to.
 *
 * ```ts
 * app.use("*", createStaticHandler({ rootDir: webDistDir }))
 * ```
 *
 * **Do not reach for `serveStatic`'s `onFound` to set headers.** It
 * runs after the body is built and its headers are dropped on the
 * floor — silently, which is how `board-games` shipped an
 * `immutable` that never reached a browser.
 */
export const createStaticHandler = ({
  deploymentEventsPath = DEFAULT_DEPLOYMENT_EVENTS_PATH,
  deploymentPath = DEFAULT_DEPLOYMENT_PATH,
  hasSpaFallback = true,
  immutablePathPrefixes = DEFAULT_IMMUTABLE_PATH_PREFIXES,
  index = "index.html",
  rewriteRequestPath,
  rootDir,
  serverPathPrefixes,
}: StaticHandlerOptions): MiddlewareHandler => {
  const deploymentHandler =
    !hasSpaFallback ||
    deploymentPath === false ||
    deploymentEventsPath === false
      ? undefined
      : createDeploymentHandler({
          deploymentEventsPath,
          deploymentPath,
          index,
          rootDir,
        })
  const serveFile = serveStatic({
    precompressed: true,
    root: rootDir,
    ...(rewriteRequestPath ? { rewriteRequestPath } : {}),
  })

  // No rewrite here, deliberately: `serveStatic` ignores
  // `rewriteRequestPath` whenever `path` is set, and the shell should
  // resolve against `rootDir` regardless of how URLs are mapped.
  const serveIndex = serveStatic({
    path: index,
    precompressed: true,
    root: rootDir,
  })

  const addEtag = etag()

  return async (context, next) => {
    // Reads only. `@hono/node-server` 1.x answers any method with
    // the file, so a POST to `/index.html` got a 200 and the shell
    // and a client was told its write had worked. A write belongs to
    // the app, and the app's own route, 404, or 405 answers it.
    if (!READ_METHODS.has(context.req.method)) {
      return next()
    }

    if (deploymentHandler) {
      let hasFallenThrough = false
      const continueToStatic = async () => {
        hasFallenThrough = true
      }
      const deploymentResponse = await deploymentHandler(
        context,
        continueToStatic,
      )

      // Hono middleware returns the response it wrote. A fallthrough
      // invokes our local next, then returns undefined.
      if (deploymentResponse && !hasFallenThrough) {
        return deploymentResponse
      }
    }

    const { path } = context.req

    const isImmutable = getIsImmutablePath({
      immutablePathPrefixes,
      pathname: path,
    })

    // `serveStatic` signals "no such file" by calling `next()`
    // rather than returning. Handing it our own `next` keeps that
    // signal local instead of letting it fall through the whole
    // outer app.
    let hasMissed = false
    const recordMiss = async () => {
      hasMissed = true
    }

    const response =
      (await serveFile(context, recordMiss)) ??
      (hasMissed &&
      hasSpaFallback &&
      getIsShellPath({
        immutablePathPrefixes,
        pathname: path,
        serverPathPrefixes,
      })
        ? await serveIndex(context, recordMiss)
        : undefined)

    if (!response) {
      return next()
    }

    // Set on the Response this handler is returning, and only once
    // there is one. Setting it on the context before the lookup put
    // it into the prepared headers that every later handler's
    // response is built from, so the app's 404 for a missing
    // `/assets/*.js` went out as `immutable` and a browser kept that
    // 404 for a year. `serveStatic` builds its Response with mutable
    // headers, and `etag` below keeps `Cache-Control` on its 304.
    //
    // Set on the context too, now that there is a hit. A middleware
    // that read `c.res` before `next()` has materialised a Response
    // on the context, and Hono merges that one's headers over the
    // one returned here, so its `Cache-Control` would otherwise win.
    const cacheControl = resolveCacheControl({
      immutablePathPrefixes,
      pathname: path,
    })
    response.headers.set("Cache-Control", cacheControl)
    context.header("Cache-Control", cacheControl)

    if (isImmutable) {
      return response
    }

    // `etag` reads and rewrites `c.res`, but `serveStatic` *returns*
    // its Response without assigning one — so wire them together by
    // hand. Assigning before the first read matters: the `c.res`
    // getter materialises an empty Response on access, and the
    // setter would then merge that empty one's headers over ours.
    context.res = response
    await addEtag(context, async () => undefined)
    return context.res
  }
}
