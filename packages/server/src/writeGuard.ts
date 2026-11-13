import type { Context, MiddlewareHandler } from "hono"
import { bodyLimit } from "hono/body-limit"

/**
 * REFUSE THE WRITES A BROWSER CAN BE TRICKED INTO SENDING.
 *
 * Most fleet apps have no login: anything that can reach the port
 * may read and write. That is a choice about the LAN. It is not a
 * choice to let **any web page the owner opens** write too, and two
 * browser paths do exactly that with no foothold at all:
 *
 * 1. **A cross-site "simple" request.** `fetch(url, { mode:
 *    "no-cors", method: "POST", body })` with a `text/plain` body,
 *    or a plain `<form>` post, needs no CORS preflight. The server
 *    acts on it; only the response is hidden. Hono's
 *    `c.req.json()` parses a body whatever its `Content-Type` says,
 *    so a `text/plain` body is a working JSON write.
 * 2. **DNS rebinding.** A hostile page re-points its own name at
 *    the LAN address. The browser now treats the app as
 *    same-origin with the attacker, so `Origin` and
 *    `Sec-Fetch-Site` both look clean. Only the `Host` header
 *    differs, so only a `Host` allowlist stops it.
 *
 * This guard is the shared form of the checks Docket, Crowbar,
 * House Announcements, and dev-proxy each wrote by hand:
 *
 * - **`Host` must be one this server answers to** — loopback, plus
 *   `allowedHosts`. With a list, every request is checked (421),
 *   because rebinding reads as well as writes. With an EMPTY list,
 *   reads pass and writes from a non-loopback host are refused,
 *   unless `isEmptyHostListWritable` says this is a development
 *   server. A missing setting fails closed for writes rather than
 *   silently turning the defense off.
 * - On a write (`POST`, `PUT`, `PATCH`, `DELETE`):
 *   - **`Origin`, when present, must be ours**: the request's own
 *     host, or an entry in `allowedOrigins`. `Origin: null` (a
 *     sandboxed frame, a `file:` page) is refused.
 *   - **`Sec-Fetch-Site`, when present, must be `same-origin` or
 *     `none`**, unless the `Origin` is one listed in
 *     `allowedOrigins`, which is the explicit cross-origin case.
 *   - **A body must be one a browser cannot send cross-site without
 *     a preflight**: `Content-Type: application/json` (or
 *     `application/<x>+json`), or the `clientHeader`, which marks a
 *     deliberate non-JSON body such as a multipart upload. The app
 *     grants no CORS preflight, so a cross-site page can satisfy
 *     neither.
 *   - A bodiless `PUT`/`PATCH`/`DELETE` passes: every browser
 *     preflights those. A bodiless `POST` is a simple request, so
 *     it needs the `clientHeader`, a JSON `Content-Type`, or proof
 *     from the browser that it is same-origin: a matching `Origin`
 *     or `Sec-Fetch-Site: same-origin`.
 *
 * Non-browser clients — `curl` with a JSON body, a script, Home
 * Assistant — send no `Origin` and no `Sec-Fetch-*`, and pass.
 *
 * ⚠️ This is NOT authentication. Anything that can open a TCP
 * connection to the port can still write. It closes the paths that
 * need no access at all.
 */

const WRITE_METHODS = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
])

const ALLOWED_FETCH_SITES = new Set(["same-origin", "none"])

/**
 * Loopback is always allowed, on any port. A rebinding page cannot
 * make a browser send `Host: localhost`: the user would have had to
 * type it. Container health checks use it.
 */
const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
])

export type WriteGuardOptions = {
  /**
   * Host names this server answers to, beyond loopback. An entry
   * with a port (`192.0.2.10:3013`) matches that port only; an
   * entry without one (`app.example.com`) matches any port. Use
   * `parseHostList` to read a comma-separated environment variable.
   */
  readonly allowedHosts: readonly string[]
  /**
   * Origins allowed to WRITE beyond the request's own. The request's
   * own origin (an `Origin` whose host equals `Host`) is always
   * allowed. Extras are for a development server that proxies to
   * this one: Vite rewrites `Host` but forwards `Origin`.
   */
  readonly allowedOrigins?: readonly string[]
  /**
   * A request header that lets a write carry a non-JSON body, such
   * as `x-myapp-client`. A custom header forces a CORS preflight,
   * which a cross-site page cannot pass. Lower case. Omit it when
   * every write is JSON.
   */
  readonly clientHeader?: string
  /**
   * The setting that holds `allowedHosts`, named in the refusal so
   * the person reading it knows what to change. Example:
   * `"MYAPP_ALLOWED_HOSTS"`.
   */
  readonly hostSettingName?: string
  /**
   * With an empty `allowedHosts`, whether writes from any host may
   * proceed. Set it for development only. Defaults to `false`, so a
   * production server that lost its setting refuses writes instead
   * of accepting a rebinding page's.
   */
  readonly isEmptyHostListWritable?: boolean
}

export type WriteGuardVerdict =
  | { readonly isAllowed: true }
  | {
      readonly error: string
      readonly isAllowed: false
      readonly status: 403 | 415 | 421
    }

/**
 * Reads a comma-separated host list, as an environment variable
 * holds it. Blank entries are dropped.
 */
export const parseHostList = (
  value: string | undefined,
): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

/**
 * `host[:port]` → `[host, port | null]`, IPv6-literal aware. The
 * host is lower-cased and loses a trailing dot (`example.test.` is
 * the same name as `example.test`).
 */
const splitHostPort = (
  rawHostPort: string,
): readonly [string, string | null] => {
  const hostPort = rawHostPort.trim().toLowerCase()

  const bracketed = /^(\[[^\]]+\])(?::(\d+))?$/.exec(
    hostPort,
  )

  if (bracketed != null) {
    return [bracketed[1] ?? hostPort, bracketed[2] ?? null]
  }

  const colon = hostPort.lastIndexOf(":")

  const [host, port] =
    colon === -1
      ? [hostPort, null]
      : [
          hostPort.slice(0, colon),
          hostPort.slice(colon + 1),
        ]

  return [host.replace(/\.$/, ""), port]
}

/** Two `host[:port]` values name the same server. */
const getIsSameHost = (
  left: string,
  right: string,
): boolean => {
  const [leftHost, leftPort] = splitHostPort(left)

  const [rightHost, rightPort] = splitHostPort(right)

  return leftHost === rightHost && leftPort === rightPort
}

const getIsLoopbackHost = (hostHeader: string): boolean =>
  LOOPBACK_HOSTS.has(splitHostPort(hostHeader)[0])

/**
 * Whether a `Host` header names this server: loopback on any port,
 * or an entry of `allowedHosts`.
 */
export const getIsAllowedHost = (
  hostHeader: string,
  allowedHosts: readonly string[],
): boolean => {
  const [host, port] = splitHostPort(hostHeader)

  if (host === "") {
    return false
  }

  if (LOOPBACK_HOSTS.has(host)) {
    return true
  }

  return allowedHosts.some((entry) => {
    const [allowedHost, allowedPort] = splitHostPort(entry)

    return (
      allowedHost === host &&
      (allowedPort == null || allowedPort === port)
    )
  })
}

const parseOrigin = (origin: string): URL | null => {
  try {
    return new URL(origin)
  } catch {
    return null
  }
}

const getIsListedOrigin = (
  parsedOrigin: URL,
  allowedOrigins: readonly string[],
): boolean =>
  allowedOrigins.some(
    (entry) =>
      parseOrigin(entry)?.origin === parsedOrigin.origin,
  )

const getHasBody = (headers: Headers): boolean => {
  const length = headers.get("content-length")

  return (
    headers.has("transfer-encoding") ||
    (length != null && length.trim() !== "0")
  )
}

/**
 * `application/json`, or a structured-syntax `+json` type such as
 * `application/merge-patch+json`. A browser cannot send either
 * cross-site without a preflight.
 */
const getIsJsonContentType = (
  contentType: string | null,
): boolean => {
  const essence = contentType
    ?.split(";")[0]
    ?.trim()
    .toLowerCase()

  return (
    essence === "application/json" ||
    (essence?.startsWith("application/") === true &&
      essence.endsWith("+json"))
  )
}

/**
 * The whole decision, as a pure function of the request, so each
 * refusal is testable without a server.
 */
export const judgeWriteRequest = (
  {
    headers,
    method,
    url,
  }: {
    readonly headers: Headers
    readonly method: string
    readonly url: string
  },
  options: WriteGuardOptions,
): WriteGuardVerdict => {
  const {
    allowedHosts,
    allowedOrigins = [],
    clientHeader,
    hostSettingName = "the allowed host list",
    isEmptyHostListWritable = false,
  } = options

  // The header when there is one (the Node adapter builds the URL
  // from it anyway); the URL's own host when a test builds a
  // Request with no Host header.
  const requestHost =
    headers.get("host") ?? new URL(url).host

  const isWrite = WRITE_METHODS.has(method.toUpperCase())

  if (allowedHosts.length > 0) {
    if (!getIsAllowedHost(requestHost, allowedHosts)) {
      return {
        error: `This server does not answer to the host ${requestHost}. Add it to ${hostSettingName} if it is really this server.`,
        isAllowed: false,
        // 421 Misdirected Request: this server is not the one that
        // name is meant to reach.
        status: 421,
      }
    }
  } else if (
    isWrite &&
    !isEmptyHostListWritable &&
    !getIsLoopbackHost(requestHost)
  ) {
    return {
      error: `Changes are refused because ${hostSettingName} is empty. Set it to the host names this server answers to.`,
      isAllowed: false,
      status: 421,
    }
  }

  if (!isWrite) {
    return { isAllowed: true }
  }

  const origin = headers.get("origin")

  const parsedOrigin =
    origin == null ? null : parseOrigin(origin)

  const isListedOrigin =
    parsedOrigin != null &&
    getIsListedOrigin(parsedOrigin, allowedOrigins)

  const isOwnOrigin =
    parsedOrigin != null &&
    getIsSameHost(parsedOrigin.host, requestHost)

  if (
    origin != null &&
    (origin === "null" || !(isOwnOrigin || isListedOrigin))
  ) {
    return {
      error: `This page is not allowed to make changes here (Origin: ${origin}).`,
      isAllowed: false,
      status: 403,
    }
  }

  const fetchSite = headers
    .get("sec-fetch-site")
    ?.trim()
    .toLowerCase()

  if (
    fetchSite != null &&
    !ALLOWED_FETCH_SITES.has(fetchSite) &&
    !isListedOrigin
  ) {
    return {
      error: `This page is not allowed to make changes here (Sec-Fetch-Site: ${fetchSite}).`,
      isAllowed: false,
      status: 403,
    }
  }

  if (clientHeader != null && headers.has(clientHeader)) {
    return { isAllowed: true }
  }

  const contentType = headers.get("content-type")

  if (getIsJsonContentType(contentType)) {
    return { isAllowed: true }
  }

  if (contentType == null && !getHasBody(headers)) {
    const isBrowserSameOrigin =
      isOwnOrigin ||
      isListedOrigin ||
      fetchSite === "same-origin"

    if (
      method.toUpperCase() !== "POST" ||
      isBrowserSameOrigin
    ) {
      return { isAllowed: true }
    }
  }

  return {
    error: `A change must send Content-Type: application/json${
      clientHeader == null
        ? ""
        : ` (or the ${clientHeader} header for an upload)`
    }. This request sent ${contentType ?? "no Content-Type"}.`,
    isAllowed: false,
    status: 415,
  }
}

/**
 * Hono middleware for `judgeWriteRequest`. Mount it ahead of the
 * routes it protects, usually `app.use("/api/*", …)`, and before any
 * body limit so a refused write is never read. A refusal is
 * `{ error }` JSON.
 */
export const createWriteGuard =
  (options: WriteGuardOptions): MiddlewareHandler =>
  async (context, next) => {
    const verdict = judgeWriteRequest(
      {
        headers: context.req.raw.headers,
        method: context.req.method,
        url: context.req.url,
      },
      options,
    )

    if (!verdict.isAllowed) {
      return context.json(
        { error: verdict.error },
        verdict.status,
      )
    }

    await next()
  }

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`
  }

  if (bytes >= 1024) {
    return `${Number((bytes / 1024).toFixed(1))} KB`
  }

  return `${String(bytes)} bytes`
}

export type BodyLimitOptions = {
  /** The largest body the route accepts, in bytes. */
  readonly maxBytes: number
  /** The refusal text. Defaults to one that names the limit. */
  readonly message?: string
}

/**
 * A per-route request body limit that answers `413` with `{ error }`
 * JSON. A thin wrapper over `hono/body-limit`.
 *
 * Mount it on the route, ahead of the handler:
 * `app.post("/api/photos", createBodyLimit({ maxBytes: 30 * MB }),
 * handler)`. Then `c.req.json()`, `c.req.parseBody()`, and
 * `c.req.arrayBuffer()` can never hold more than `maxBytes` in
 * memory. A size check AFTER `await c.req.arrayBuffer()` is not a
 * limit: the whole body is already in memory when it runs.
 *
 * How it bounds memory: a request with `Content-Length` is refused
 * from the header alone, before a byte is read, and the Node server
 * never delivers more bytes than that header names. A chunked
 * request is counted as it streams and refused at the first chunk
 * past the limit.
 */
export const createBodyLimit = ({
  maxBytes,
  message,
}: BodyLimitOptions): MiddlewareHandler =>
  bodyLimit({
    maxSize: maxBytes,
    onError: (context: Context) =>
      context.json(
        {
          error:
            message ??
            `The request is too large. The limit is ${formatBytes(maxBytes)}.`,
        },
        413,
      ),
  })
