import { serveStatic } from "@hono/node-server/serve-static"
import type { MiddlewareHandler } from "hono"
import { etag } from "hono/etag"

import {
  DEFAULT_IMMUTABLE_PATH_PREFIXES,
  getIsImmutablePath,
  resolveCacheControl,
} from "./cachePolicy.ts"

/**
 * A path ending in `.something`. Used to tell a missing **asset**
 * from a missing **route**: `/errors` is a client route and gets the
 * SPA shell, `/assets/gone.js` is a real 404.
 *
 * Serving `index.html` for a missing `.js` is how an app produces
 * `Uncaught SyntaxError: Unexpected token '<'` — the browser is
 * handed HTML where it asked for a script, and the error names
 * neither the file nor the server.
 */
const HAS_EXTENSION_REGEX = /\.[^/]+$/

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
   * `build.assetsDir`.
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
  hasSpaFallback = true,
  immutablePathPrefixes = DEFAULT_IMMUTABLE_PATH_PREFIXES,
  index = "index.html",
  rewriteRequestPath,
  rootDir,
}: StaticHandlerOptions): MiddlewareHandler => {
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
    const { path } = context.req

    const isImmutable = getIsImmutablePath({
      immutablePathPrefixes,
      pathname: path,
    })

    // Set before delegating: `c.header()` writes into the prepared
    // headers that `serveStatic`'s `c.body()` builds the response
    // from. After the fact is too late — the Response has already
    // copied them.
    context.header(
      "Cache-Control",
      resolveCacheControl({
        immutablePathPrefixes,
        pathname: path,
      }),
    )

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
      !HAS_EXTENSION_REGEX.test(path)
        ? await serveIndex(context, recordMiss)
        : undefined)

    if (!response) {
      return next()
    }

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
