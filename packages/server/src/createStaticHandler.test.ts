import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brotliCompressSync, gzipSync } from "node:zlib"
import { Hono } from "hono"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import {
  IMMUTABLE_CACHE_CONTROL,
  REVALIDATE_CACHE_CONTROL,
} from "./cachePolicy.ts"
import { createStaticHandler } from "./createStaticHandler.ts"

// Long enough that the compressed siblings come out smaller, so
// the negotiation under test is the real one.
const BUNDLE_SOURCE = `console.log("${"payload ".repeat(64)}")`
const INDEX_SOURCE =
  "<!doctype html><title>app</title><div id=root></div>"

let rootDir = ""
let app: Hono

const request = (
  path: string,
  headers: Record<string, string> = {},
) => app.request(path, { headers })

beforeAll(async () => {
  rootDir = await mkdtemp(join(tmpdir(), "charc-server-"))
  await mkdir(join(rootDir, "assets"), { recursive: true })

  const bundlePath = join(
    rootDir,
    "assets",
    "index-D7e1J0tu.js",
  )
  await writeFile(bundlePath, BUNDLE_SOURCE)
  await writeFile(
    `${bundlePath}.br`,
    brotliCompressSync(Buffer.from(BUNDLE_SOURCE)),
  )
  await writeFile(
    `${bundlePath}.gz`,
    gzipSync(Buffer.from(BUNDLE_SOURCE)),
  )

  // Deliberately left with no precompressed sibling, to prove the
  // handler falls back to the original rather than 404ing.
  await writeFile(
    join(rootDir, "assets", "bare-AbCdEf12.css"),
    "body{color:red}",
  )

  await writeFile(join(rootDir, "index.html"), INDEX_SOURCE)
  await writeFile(
    join(rootDir, "command-descriptions.js"),
    "window.commandDescriptions = {}",
  )

  app = new Hono()
  app.use("*", createStaticHandler({ rootDir }))
  app.notFound((context) =>
    context.json({ error: "not found" }, 404),
  )
})

afterAll(async () => {
  await rm(rootDir, { force: true, recursive: true })
})

describe("compression", () => {
  test("serves the brotli sibling when accepted", async () => {
    const response = await request(
      "/assets/index-D7e1J0tu.js",
      { "Accept-Encoding": "br, gzip" },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-encoding")).toBe(
      "br",
    )
    expect(response.headers.get("vary")).toContain(
      "Accept-Encoding",
    )
  })

  test("falls back to gzip when brotli is not accepted", async () => {
    const response = await request(
      "/assets/index-D7e1J0tu.js",
      { "Accept-Encoding": "gzip" },
    )

    expect(response.headers.get("content-encoding")).toBe(
      "gzip",
    )
  })

  test("serves the original when nothing is accepted", async () => {
    const response = await request(
      "/assets/index-D7e1J0tu.js",
    )

    expect(response.headers.get("content-encoding")).toBe(
      null,
    )
    expect(await response.text()).toBe(BUNDLE_SOURCE)
  })

  // Adopting the handler before wiring up the Vite plugin has to be
  // safe, or nobody can land the two changes separately.
  test("serves a file that has no sibling at all", async () => {
    const response = await request(
      "/assets/bare-AbCdEf12.css",
      { "Accept-Encoding": "br" },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-encoding")).toBe(
      null,
    )
  })
})

describe("cache headers", () => {
  test("hashed assets are immutable", async () => {
    const response = await request(
      "/assets/index-D7e1J0tu.js",
      { "Accept-Encoding": "br" },
    )

    expect(response.headers.get("cache-control")).toBe(
      IMMUTABLE_CACHE_CONTROL,
    )
  })

  test("the entry HTML revalidates", async () => {
    const response = await request("/index.html")

    expect(response.headers.get("cache-control")).toBe(
      REVALIDATE_CACHE_CONTROL,
    )
  })

  test("an unhashed public file revalidates", async () => {
    const response = await request(
      "/command-descriptions.js",
    )

    expect(response.headers.get("cache-control")).toBe(
      REVALIDATE_CACHE_CONTROL,
    )
  })
})

// A miss falls through to the app's own handler, and the app's 404
// must not carry a promise the handler made for a file it never
// found. A cached `immutable` 404 for a hashed URL keeps a browser
// from ever fetching the asset once it exists.
describe("cache headers on a miss", () => {
  test("a missing hashed asset's 404 is not immutable", async () => {
    const response = await request(
      "/assets/gone-12345678.js",
    )

    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toBe(null)
  })

  test("a missing asset outside the hashed prefix carries no policy either", async () => {
    const response = await request("/gone-12345678.js")

    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toBe(null)
  })

  test("a miss keeps a Cache-Control the app set before the handler", async () => {
    const withPolicy = new Hono()
    withPolicy.use("*", async (context, next) => {
      context.header("Cache-Control", "private, no-store")
      await next()
    })
    withPolicy.use("*", createStaticHandler({ rootDir }))
    withPolicy.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )

    const missing = await withPolicy.request(
      "/assets/gone-12345678.js",
    )
    const found = await withPolicy.request(
      "/assets/index-D7e1J0tu.js",
    )

    expect(missing.status).toBe(404)
    expect(missing.headers.get("cache-control")).toBe(
      "private, no-store",
    )
    expect(found.headers.get("cache-control")).toBe(
      IMMUTABLE_CACHE_CONTROL,
    )
  })

  // Reading `c.res` makes Hono build a Response on the context, and
  // Hono merges that Response's headers over the handler's.
  test("a hit wins over a policy on a Response an earlier middleware built", async () => {
    const withResponse = new Hono()
    withResponse.use("*", async (context, next) => {
      context.header("Cache-Control", "private, no-store")
      void context.res
      await next()
    })
    withResponse.use("*", createStaticHandler({ rootDir }))
    withResponse.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )

    const asset = await withResponse.request(
      "/assets/index-D7e1J0tu.js",
    )
    const shell = await withResponse.request("/index.html")
    const route = await withResponse.request("/errors")
    const missing = await withResponse.request(
      "/assets/gone-12345678.js",
    )

    expect(asset.headers.get("cache-control")).toBe(
      IMMUTABLE_CACHE_CONTROL,
    )
    expect(shell.headers.get("cache-control")).toBe(
      REVALIDATE_CACHE_CONTROL,
    )
    expect(route.headers.get("cache-control")).toBe(
      REVALIDATE_CACHE_CONTROL,
    )
    expect(await route.text()).toBe(INDEX_SOURCE)
    expect(missing.status).toBe(404)
    expect(missing.headers.get("cache-control")).toBe(
      "private, no-store",
    )
  })

  test("a server route behind the handler keeps its own headers", async () => {
    const routed = new Hono()
    routed.use("*", createStaticHandler({ rootDir }))
    routed.get("/assets/generated.json", (context) =>
      context.json({ isGenerated: true }),
    )

    const response = await routed.request(
      "/assets/generated.json",
    )

    expect(await response.json()).toEqual({
      isGenerated: true,
    })
    expect(response.headers.get("cache-control")).toBe(null)
  })
})

// The handler is for reads. A write that reaches it belongs to the
// app: serving a file or the shell in answer to a POST tells the
// client its write succeeded.
describe("methods", () => {
  const buildMethodApp = () => {
    const methodApp = new Hono()
    methodApp.use("*", createStaticHandler({ rootDir }))
    methodApp.post("/assets/index-D7e1J0tu.js", (context) =>
      context.text("app write", 201),
    )
    methodApp.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )
    return methodApp
  }

  test.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "%s to a real file falls through to the app",
    async (method) => {
      const response = await buildMethodApp().request(
        "/assets/index-D7e1J0tu.js",
        { method },
      )

      expect(await response.text()).not.toBe(BUNDLE_SOURCE)
      expect(response.headers.get("cache-control")).toBe(
        null,
      )
    },
  )

  test("POST to a real file reaches the app's own route", async () => {
    const response = await buildMethodApp().request(
      "/assets/index-D7e1J0tu.js",
      { method: "POST" },
    )

    expect(response.status).toBe(201)
    expect(await response.text()).toBe("app write")
  })

  test.each(["POST", "PUT", "DELETE"])(
    "%s to a client route is not answered with the shell",
    async (method) => {
      const response = await buildMethodApp().request(
        "/errors",
        { method },
      )

      expect(response.status).toBe(404)
      expect(await response.text()).not.toBe(INDEX_SOURCE)
    },
  )

  test("POST to the build marker falls through", async () => {
    const response = await buildMethodApp().request(
      "/__charcuterie/deployment",
      { method: "POST" },
    )

    expect(response.status).toBe(404)
  })

  test("HEAD to a real file still answers", async () => {
    const response = await buildMethodApp().request(
      "/assets/index-D7e1J0tu.js",
      { method: "HEAD" },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      IMMUTABLE_CACHE_CONTROL,
    )
  })
})

describe("deployment marker", () => {
  test("falls through when the build output does not exist yet", async () => {
    const missingOutput = new Hono()
    missingOutput.use(
      "*",
      createStaticHandler({
        rootDir: join(rootDir, "not-built-yet"),
      }),
    )
    missingOutput.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )

    const deploymentResponse = await missingOutput.request(
      "/__charcuterie/deployment",
    )
    const routeResponse =
      await missingOutput.request("/settings")

    expect(deploymentResponse.status).toBe(404)
    expect(routeResponse.status).toBe(404)
  })

  test("serves a no-cache build marker outside the SPA fallback", async () => {
    const response = await request(
      "/__charcuterie/deployment",
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      "no-cache",
    )
    await expect(response.json()).resolves.toEqual({
      buildId: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })

  test("publishes the current build when an SSE client connects", async () => {
    const response = await request(
      "/__charcuterie/deployment/events",
    )
    const reader = response.body?.getReader()
    const first = await reader?.read()
    await reader?.cancel()

    expect(response.headers.get("content-type")).toContain(
      "text/event-stream",
    )
    expect(new TextDecoder().decode(first?.value)).toMatch(
      /^event: deployment\ndata: {"buildId":"[a-f0-9]{64}"}\n\n$/,
    )
  })

  test("a HEAD request gets the SSE headers and starts no heartbeat", async () => {
    // Hono answers HEAD by running the GET handler and discarding
    // its body unread, so a stream started here is never cancelled.
    const setIntervalSpy = vi.spyOn(
      globalThis,
      "setInterval",
    )
    try {
      const response = await app.request(
        "/__charcuterie/deployment/events",
        { method: "HEAD" },
      )

      expect(response.status).toBe(200)
      expect(
        response.headers.get("content-type"),
      ).toContain("text/event-stream")
      expect(response.body).toBeNull()
      expect(setIntervalSpy).not.toHaveBeenCalled()
    } finally {
      setIntervalSpy.mockRestore()
    }
  })

  test("closing an SSE stream clears its heartbeat", async () => {
    const setIntervalSpy = vi.spyOn(
      globalThis,
      "setInterval",
    )
    const clearIntervalSpy = vi.spyOn(
      globalThis,
      "clearInterval",
    )
    try {
      const response = await request(
        "/__charcuterie/deployment/events",
      )
      const reader = response.body?.getReader()
      await reader?.read()
      await reader?.cancel()

      expect(setIntervalSpy).toHaveBeenCalledTimes(1)
      expect(clearIntervalSpy).toHaveBeenCalledWith(
        setIntervalSpy.mock.results[0]?.value,
      )
    } finally {
      setIntervalSpy.mockRestore()
      clearIntervalSpy.mockRestore()
    }
  })

  test("can turn deployment endpoints off for an asset-only origin", async () => {
    const assetOnly = new Hono()
    assetOnly.use(
      "*",
      createStaticHandler({
        deploymentEventsPath: false,
        deploymentPath: false,
        hasSpaFallback: false,
        rootDir,
      }),
    )
    assetOnly.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )

    const response = await assetOnly.request(
      "/__charcuterie/deployment",
    )
    expect(response.status).toBe(404)
  })
})

describe("revalidation", () => {
  test("the revalidating bucket gets an ETag", async () => {
    const response = await request("/index.html")

    expect(response.headers.get("etag")).toBeTruthy()
  })

  test("a matching If-None-Match is a 304 with no body", async () => {
    const first = await request("/index.html")
    const etag = first.headers.get("etag") ?? ""

    const second = await request("/index.html", {
      "If-None-Match": etag,
    })

    expect(second.status).toBe(304)
    expect(await second.text()).toBe("")
    expect(second.headers.get("cache-control")).toBe(
      REVALIDATE_CACHE_CONTROL,
    )
  })

  // Hashing costs a full buffer of the response body. An
  // `immutable` asset is never revalidated, so paying it there buys
  // nothing — and on a 1 MB bundle it is the whole megabyte.
  test("immutable assets are not hashed", async () => {
    const response = await request(
      "/assets/index-D7e1J0tu.js",
      { "Accept-Encoding": "br" },
    )

    expect(response.headers.get("etag")).toBe(null)
  })
})

describe("SPA fallback", () => {
  test("an extensionless route gets the shell", async () => {
    const response = await request("/errors")

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(INDEX_SOURCE)
    expect(response.headers.get("cache-control")).toBe(
      REVALIDATE_CACHE_CONTROL,
    )
  })

  // Returning HTML for a missing script is how an app produces
  // `Unexpected token '<'` instead of a 404 naming the file.
  test("a missing asset is a 404, not the shell", async () => {
    const response = await request(
      "/assets/gone-12345678.js",
    )

    expect(response.status).toBe(404)
  })

  // Hono normalises `/../../etc/passwd` to `/etc/passwd` before any
  // handler sees it, so the only traversal that reaches us is a
  // percent-encoded one. `serveStatic` decodes, then refuses it.
  test("an encoded traversal is refused and leaks nothing", async () => {
    const response = await request(
      "/assets/..%2f..%2f..%2fetc%2fpasswd",
    )

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain("root:")
  })

  test("can be turned off", async () => {
    const assetOnly = new Hono()
    assetOnly.use(
      "*",
      createStaticHandler({
        hasSpaFallback: false,
        rootDir,
      }),
    )
    assetOnly.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )

    const response = await assetOnly.request("/errors")

    expect(response.status).toBe(404)
  })
})

// Folio's document routes end in `.md`, because the URL is the
// file's real path, so the extensionless rule cannot tell them from
// a missing file. The app names what the server owns instead.
describe("SPA fallback with serverPathPrefixes", () => {
  let routedApp: Hono

  beforeAll(() => {
    routedApp = new Hono()
    routedApp.get("/api/items", (context) =>
      context.json({ items: [] }),
    )
    routedApp.use(
      "*",
      createStaticHandler({
        rootDir,
        serverPathPrefixes: ["/api", "/health/"],
      }),
    )
    routedApp.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )
  })

  test("a client route with an extension gets the shell", async () => {
    const response = await routedApp.request(
      "/workspace~agentic/AGENTS.md",
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(INDEX_SOURCE)
    expect(response.headers.get("cache-control")).toBe(
      REVALIDATE_CACHE_CONTROL,
    )
    expect(response.headers.get("etag")).toBeTruthy()
  })

  test("an extensionless client route still gets the shell", async () => {
    const response = await routedApp.request("/errors")

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(INDEX_SOURCE)
  })

  test("a HEAD request for a client route gets the shell's headers", async () => {
    const response = await routedApp.request(
      "/workspace~agentic/AGENTS.md",
      { method: "HEAD" },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain(
      "text/html",
    )
  })

  test("a POST to a client route is not answered with the shell", async () => {
    const response = await routedApp.request("/errors", {
      method: "POST",
    })

    expect(response.status).toBe(404)
  })

  // An API 404 that answers 200 with HTML hands the client markup
  // where it expected JSON, and the error names neither the route
  // nor the cause.
  test("a miss under a server prefix falls through to the app's 404", async () => {
    const response = await routedApp.request("/api/nope")

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: "not found",
    })
  })

  test("the server prefix itself falls through", async () => {
    const response = await routedApp.request("/api")

    expect(response.status).toBe(404)
  })

  test("a trailing slash on a prefix still matches the bare path", async () => {
    const response = await routedApp.request("/health")

    expect(response.status).toBe(404)
  })

  test("a prefix matches on a segment boundary", async () => {
    const response = await routedApp.request("/apiary")

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(INDEX_SOURCE)
  })

  test("a server route still answers", async () => {
    const response = await routedApp.request("/api/items")

    expect(await response.json()).toEqual({ items: [] })
  })

  test("a missing hashed asset is a 404, never the shell", async () => {
    const withExtension = await routedApp.request(
      "/assets/gone-12345678.js",
    )
    const withoutExtension =
      await routedApp.request("/assets/gone")

    expect(withExtension.status).toBe(404)
    expect(withoutExtension.status).toBe(404)
  })

  test("a real file is still served as itself", async () => {
    const response = await routedApp.request(
      "/command-descriptions.js",
    )

    expect(await response.text()).toBe(
      "window.commandDescriptions = {}",
    )
  })

  test("an encoded traversal is refused and leaks nothing", async () => {
    const response = await routedApp.request(
      "/assets/..%2f..%2f..%2fetc%2fpasswd",
    )

    expect(await response.text()).not.toContain("root:")
  })

  test("the build marker is still served", async () => {
    const response = await routedApp.request(
      "/__charcuterie/deployment",
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain(
      "application/json",
    )
  })

  test("is ignored when the fallback is off", async () => {
    const assetOnly = new Hono()
    assetOnly.use(
      "*",
      createStaticHandler({
        hasSpaFallback: false,
        rootDir,
        serverPathPrefixes: ["/api"],
      }),
    )

    const response = await assetOnly.request("/errors")

    expect(response.status).toBe(404)
  })
})

// A mount whose URL prefix is not a real directory: board-games
// serves `/images/*` out of `$BOARD_GAMES_IMAGES`.
describe("rewriteRequestPath", () => {
  const buildImageOrigin = () => {
    const app = new Hono()
    app.use(
      "/images/*",
      createStaticHandler({
        hasSpaFallback: false,
        immutablePathPrefixes: ["/images/"],
        rewriteRequestPath: (path) =>
          path.replace(/^\/images/, ""),
        rootDir: join(rootDir, "assets"),
      }),
    )
    app.notFound((context) =>
      context.json({ error: "not found" }, 404),
    )
    return app
  }

  test("maps the URL prefix onto the root directory", async () => {
    const response = await buildImageOrigin().request(
      "/images/index-D7e1J0tu.js",
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(BUNDLE_SOURCE)
  })

  test("still negotiates the precompressed sibling", async () => {
    const response = await buildImageOrigin().request(
      "/images/index-D7e1J0tu.js",
      { headers: { "Accept-Encoding": "br" } },
    )

    expect(response.headers.get("content-encoding")).toBe(
      "br",
    )
  })

  // The bucket is decided on the path the *caller* used, not the
  // rewritten one — `immutablePathPrefixes` names URLs, not disk.
  test("buckets on the request path, not the rewritten one", async () => {
    const response = await buildImageOrigin().request(
      "/images/index-D7e1J0tu.js",
    )

    expect(response.headers.get("cache-control")).toBe(
      IMMUTABLE_CACHE_CONTROL,
    )
  })

  test("a miss under the prefix is still a 404", async () => {
    const response = await buildImageOrigin().request(
      "/images/absent-12345678.js",
    )

    expect(response.status).toBe(404)
  })
})
