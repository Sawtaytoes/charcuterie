import {
  DEFAULT_IMMUTABLE_PATH_PREFIXES,
  getIsImmutablePath,
} from "../cachePolicy.ts"

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

/**
 * Whether a request path belongs to the server rather than to the
 * SPA. Matches on a segment boundary, so `/api` owns `/api` and
 * `/api/items` but not `/apiary`. A trailing slash on a prefix is
 * ignored, so `"/api"` and `"/api/"` mean the same thing.
 */
export const getIsServerPath = ({
  pathname,
  serverPathPrefixes,
}: {
  pathname: string
  serverPathPrefixes: readonly string[]
}): boolean =>
  serverPathPrefixes.some((serverPathPrefix) => {
    const prefix = serverPathPrefix.replace(/\/+$/, "")

    return (
      prefix === "" ||
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
    )
  })

/**
 * Whether a GET or HEAD that matched no file should get the SPA
 * shell. This is the rule `createStaticHandler` applies to a miss,
 * exported on its own so a server that is not Hono can apply the
 * same rule to its own lookup.
 *
 * - **A path under `immutablePathPrefixes` never gets the shell**,
 *   in either mode. A miss there is a 404. The cache bucket follows
 *   the request path, so a shell served at `/assets/gone` would go
 *   out `immutable`, and a browser would keep that HTML for a year.
 * - **Without `serverPathPrefixes`**, only an extensionless path
 *   gets the shell: `/errors` is a route, `/gone.js` is a missing
 *   file.
 * - **With `serverPathPrefixes`**, every path gets the shell unless
 *   the server owns it (see `getIsServerPath`). A path with an
 *   extension is a client route here, which is what a route like
 *   `/docs/readme.md` or an ID with a dot in it needs.
 *
 * The caller still decides the method. Only a read gets the shell;
 * a write to a client path belongs to the app's own 404 or 405.
 */
export const getIsShellPath = ({
  immutablePathPrefixes = DEFAULT_IMMUTABLE_PATH_PREFIXES,
  pathname,
  serverPathPrefixes,
}: {
  immutablePathPrefixes?: readonly string[]
  pathname: string
  serverPathPrefixes?: readonly string[]
}): boolean =>
  !getIsImmutablePath({
    immutablePathPrefixes,
    pathname,
  }) &&
  (serverPathPrefixes === undefined
    ? !HAS_EXTENSION_REGEX.test(pathname)
    : !getIsServerPath({ pathname, serverPathPrefixes }))
