/**
 * The two-bucket cache policy every SPA build in the fleet wants.
 *
 * There are only two kinds of file in a Vite `dist/`, and they want
 * opposite headers:
 *
 * - **Content-hashed** (`/assets/index-D7e1J0tu.js`). The hash *is*
 *   the cache key, so the bytes behind a name can never change.
 *   `immutable` tells the browser not to revalidate at all — not
 *   even a 304 round-trip on reload.
 * - **Everything else** (`index.html`, anything dropped in
 *   `public/`). These keep their names across deploys, so they must
 *   be revalidated every time. A stale `index.html` points at hashed
 *   chunks that no longer exist, which renders as a blank page —
 *   the single worst failure mode this module exists to prevent.
 *
 * Keyed on the path **prefix** rather than a hash-shaped regex.
 * Vite's `assetsDir` is a build guarantee; "does this filename look
 * hashed" is a guess, and it guesses wrong in both directions
 * (`vendor-legacy.js` isn't hashed, `logo-v2.png` isn't either).
 */

export const IMMUTABLE_MAX_AGE_SECONDS = 31_536_000

/**
 * A year, and `immutable` on top. The max-age alone would still let
 * a browser revalidate on reload; `immutable` is what suppresses it.
 */
export const IMMUTABLE_CACHE_CONTROL = `public, max-age=${IMMUTABLE_MAX_AGE_SECONDS}, immutable`

/**
 * `no-cache` does **not** mean "do not cache" — it means "cache, but
 * revalidate before reuse". That is exactly right for the entry
 * HTML: paired with an ETag the usual response is a 304 with no
 * body, so the correctness guarantee costs a few hundred bytes
 * rather than a full re-download.
 *
 * `no-store` is the header that means "do not cache", and using it
 * here is the bug this package was written to delete.
 */
export const REVALIDATE_CACHE_CONTROL = "no-cache"

/** Vite's default `build.assetsDir`, as a request-path prefix. */
export const DEFAULT_IMMUTABLE_PATH_PREFIXES = ["/assets/"]

/**
 * Whether a request path falls in the content-hashed bucket.
 *
 * Takes the **request** path, not the resolved file path, so the
 * decision is available before any disk access — and so it survives
 * `serveStatic` rewriting the path to a `.br`/`.gz` sibling.
 */
export const getIsImmutablePath = ({
  immutablePathPrefixes = DEFAULT_IMMUTABLE_PATH_PREFIXES,
  pathname,
}: {
  immutablePathPrefixes?: readonly string[]
  pathname: string
}): boolean =>
  immutablePathPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  )

/** The `Cache-Control` value for a request path. */
export const resolveCacheControl = ({
  immutablePathPrefixes,
  pathname,
}: {
  immutablePathPrefixes?: readonly string[]
  pathname: string
}): string =>
  getIsImmutablePath({
    immutablePathPrefixes,
    pathname,
  })
    ? IMMUTABLE_CACHE_CONTROL
    : REVALIDATE_CACHE_CONTROL
