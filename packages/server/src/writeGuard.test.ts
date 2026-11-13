import { Hono } from "hono"
import { describe, expect, test } from "vitest"

import {
  createBodyLimit,
  createWriteGuard,
  getIsAllowedHost,
  judgeWriteRequest,
  parseHostList,
  type WriteGuardOptions,
} from "./writeGuard.ts"

/**
 * Hosts are reserved documentation names (RFC 2606 / RFC 5737):
 * this package is public, so nothing here is a real address.
 */
const PUBLIC_HOST = "app.example.test"
const LAN_HOST = "192.0.2.10:3013"
const DEV_ORIGIN = "http://localhost:5187"
const CLIENT_HEADER = "x-example-client"

const OPTIONS: WriteGuardOptions = {
  allowedHosts: [PUBLIC_HOST, LAN_HOST],
  allowedOrigins: [DEV_ORIGIN],
  clientHeader: CLIENT_HEADER,
  hostSettingName: "EXAMPLE_ALLOWED_HOSTS",
}

const createTestApp = (
  options: WriteGuardOptions = OPTIONS,
) => {
  const app = new Hono()

  const writes: unknown[] = []

  app.use("/api/*", createWriteGuard(options))

  app.get("/api/items", (context) =>
    context.json({ writes }),
  )

  app.post("/api/items", async (context) => {
    writes.push(await context.req.json())

    return context.json({ isSaved: true }, 201)
  })

  app.post("/api/items/reset", (context) => {
    writes.push("reset")

    return context.json({ isReset: true })
  })

  app.delete("/api/items/:id", (context) => {
    writes.push(`delete ${context.req.param("id")}`)

    return context.json({ isDeleted: true })
  })

  app.post("/api/uploads", async (context) => {
    const form = await context.req.parseBody()

    writes.push(Object.keys(form))

    return context.json({ isSaved: true })
  })

  return { app, writes }
}

const JSON_BODY = JSON.stringify({ name: "Invented item" })

describe("writes a browser could send cross-site", () => {
  test("refuses a text/plain body, the no-cors fetch shape", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "text/plain;charset=UTF-8",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(415)
    expect(writes).toEqual([])
  })

  test("refuses a JSON body with no Content-Type at all", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items`,
      { body: JSON_BODY, method: "POST" },
    )

    // `Request` defaults a string body to text/plain, which is
    // exactly what a hostile page's fetch sends.
    expect(response.status).toBe(415)
    expect(writes).toEqual([])
  })

  test("refuses a form post", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/uploads`,
      {
        body: "name=Invented",
        headers: {
          "content-type":
            "application/x-www-form-urlencoded",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(415)
    expect(writes).toEqual([])
  })

  test("refuses a foreign Origin even with a JSON body", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json",
          origin: "https://hostile.example.test",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: expect.stringContaining(
        "hostile.example.test",
      ),
    })
    expect(writes).toEqual([])
  })

  test("refuses Origin: null", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json",
          origin: "null",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(403)
  })

  test("refuses Sec-Fetch-Site: cross-site with no Origin", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "cross-site",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(403)
  })

  test("refuses Sec-Fetch-Site: same-site, a sibling subdomain", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-site",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(403)
  })

  test("refuses a bodiless POST with no same-origin proof", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items/reset`,
      { method: "POST" },
    )

    expect(response.status).toBe(415)
    expect(writes).toEqual([])
  })

  test("refuses a multipart upload without the client header", async () => {
    const { app, writes } = createTestApp()

    const form = new FormData()

    form.set("name", "Invented")

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/uploads`,
      { body: form, method: "POST" },
    )

    expect(response.status).toBe(415)
    expect(writes).toEqual([])
  })
})

describe("DNS rebinding", () => {
  test("refuses a read on a host the server does not answer to", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      "http://rebound.example.test/api/items",
    )

    expect(response.status).toBe(421)
    expect(await response.json()).toEqual({
      error: expect.stringContaining(
        "EXAMPLE_ALLOWED_HOSTS",
      ),
    })
  })

  test("refuses a write whose Origin matches its rebound Host", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      "http://rebound.example.test/api/items",
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json",
          origin: "http://rebound.example.test",
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(421)
    expect(writes).toEqual([])
  })

  test("a listed LAN host matches its port only", async () => {
    const { app } = createTestApp()

    const right = await app.request(
      "http://192.0.2.10:3013/api/items",
    )

    const wrong = await app.request(
      "http://192.0.2.10:3014/api/items",
    )

    expect(right.status).toBe(200)
    expect(wrong.status).toBe(421)
  })

  describe("with an empty host list", () => {
    const EMPTY: WriteGuardOptions = {
      allowedHosts: [],
      hostSettingName: "EXAMPLE_ALLOWED_HOSTS",
    }

    test("reads still pass, so a missing setting does not hide the app", async () => {
      const { app } = createTestApp(EMPTY)

      const response = await app.request(
        "http://rebound.example.test/api/items",
      )

      expect(response.status).toBe(200)
    })

    test("writes fail closed and name the setting", async () => {
      const { app, writes } = createTestApp(EMPTY)

      const response = await app.request(
        "http://rebound.example.test/api/items",
        {
          body: JSON_BODY,
          headers: {
            "content-type": "application/json",
            origin: "http://rebound.example.test",
          },
          method: "POST",
        },
      )

      expect(response.status).toBe(421)
      expect(await response.json()).toEqual({
        error: expect.stringContaining(
          "EXAMPLE_ALLOWED_HOSTS",
        ),
      })
      expect(writes).toEqual([])
    })

    test("writes from loopback still pass", async () => {
      const { app, writes } = createTestApp(EMPTY)

      const response = await app.request(
        "http://localhost:3013/api/items",
        {
          body: JSON_BODY,
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      )

      expect(response.status).toBe(201)
      expect(writes).toHaveLength(1)
    })

    test("a development server can opt in to any host", async () => {
      const { app } = createTestApp({
        ...EMPTY,
        isEmptyHostListWritable: true,
      })

      const response = await app.request(
        "http://dev-box.example.test:3013/api/items",
        {
          body: JSON_BODY,
          headers: {
            "content-type": "application/json",
            origin: "http://dev-box.example.test:3013",
          },
          method: "POST",
        },
      )

      expect(response.status).toBe(201)
    })
  })
})

describe("writes the app's own page and its tools send", () => {
  test("a same-origin JSON write from the page", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      `https://${PUBLIC_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json",
          origin: `https://${PUBLIC_HOST}`,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(201)
    expect(writes).toEqual([{ name: "Invented item" }])
  })

  test("a write through the development server's proxy", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      "http://localhost:3013/api/items",
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json",
          origin: DEV_ORIGIN,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(201)
  })

  test("curl with a JSON body and no browser headers", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      `http://${LAN_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(201)
  })

  test("a +json structured type", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items`,
      {
        body: JSON_BODY,
        headers: {
          "content-type": "application/merge-patch+json",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(201)
  })

  test("a bodiless POST from the page itself", async () => {
    const { app, writes } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items/reset`,
      {
        headers: {
          origin: `http://${PUBLIC_HOST}`,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(200)
    expect(writes).toEqual(["reset"])
  })

  test("a bodiless POST from a tool that sends the client header", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items/reset`,
      { headers: { [CLIENT_HEADER]: "1" }, method: "POST" },
    )

    expect(response.status).toBe(200)
  })

  test("a bodiless DELETE with no headers, which every browser preflights", async () => {
    const { app } = createTestApp()

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/items/7`,
      { method: "DELETE" },
    )

    expect(response.status).toBe(200)
  })

  test("a multipart upload that carries the client header", async () => {
    const { app, writes } = createTestApp()

    const form = new FormData()

    form.set("name", "Invented")

    const response = await app.request(
      `http://${PUBLIC_HOST}/api/uploads`,
      {
        body: form,
        headers: {
          [CLIENT_HEADER]: "1",
          origin: `http://${PUBLIC_HOST}`,
        },
        method: "POST",
      },
    )

    expect(response.status).toBe(200)
    expect(writes).toEqual([["name"]])
  })
})

describe("getIsAllowedHost", () => {
  test("loopback on any port", () => {
    expect(getIsAllowedHost("localhost:9", [])).toBe(true)
    expect(getIsAllowedHost("127.0.0.1", [])).toBe(true)
    expect(getIsAllowedHost("[::1]:3013", [])).toBe(true)
  })

  test("case, a trailing dot, and an unlisted port", () => {
    expect(
      getIsAllowedHost("APP.Example.Test.:443", [
        PUBLIC_HOST,
      ]),
    ).toBe(true)
    expect(getIsAllowedHost("192.0.2.10", [LAN_HOST])).toBe(
      false,
    )
  })

  test("an empty Host is never allowed", () => {
    expect(getIsAllowedHost("", [PUBLIC_HOST])).toBe(false)
  })

  test("a lookalike suffix is not the host", () => {
    expect(
      getIsAllowedHost("evil-app.example.test", [
        PUBLIC_HOST,
      ]),
    ).toBe(false)
  })
})

describe("judgeWriteRequest", () => {
  test("a GET is never judged on its body or Origin", () => {
    expect(
      judgeWriteRequest(
        {
          headers: new Headers({
            host: PUBLIC_HOST,
            origin: "https://hostile.example.test",
          }),
          method: "GET",
          url: `http://${PUBLIC_HOST}/api/items`,
        },
        OPTIONS,
      ),
    ).toEqual({ isAllowed: true })
  })

  test("an explicitly listed cross-origin page may write", () => {
    expect(
      judgeWriteRequest(
        {
          headers: new Headers({
            "content-type": "application/json",
            host: PUBLIC_HOST,
            origin: DEV_ORIGIN,
            "sec-fetch-site": "cross-site",
          }),
          method: "PATCH",
          url: `http://${PUBLIC_HOST}/api/items`,
        },
        OPTIONS,
      ),
    ).toEqual({ isAllowed: true })
  })
})

describe("parseHostList", () => {
  test("splits, trims, and drops blanks", () => {
    expect(
      parseHostList(" a.example.test, ,192.0.2.1:80 "),
    ).toEqual(["a.example.test", "192.0.2.1:80"])
    expect(parseHostList(undefined)).toEqual([])
  })
})

describe("createBodyLimit", () => {
  const createLimitedApp = () => {
    const app = new Hono()

    let bytesRead = 0

    app.post(
      "/upload",
      createBodyLimit({ maxBytes: 1024 }),
      async (context) => {
        bytesRead = (await context.req.arrayBuffer())
          .byteLength

        return context.json({ bytesRead })
      },
    )

    return { app, getBytesRead: () => bytesRead }
  }

  test("refuses a body over the limit with JSON before the handler reads it", async () => {
    const { app, getBytesRead } = createLimitedApp()

    const response = await app.request("/upload", {
      body: "x".repeat(2048),
      headers: { "content-length": "2048" },
      method: "POST",
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: "The request is too large. The limit is 1 KB.",
    })
    expect(getBytesRead()).toBe(0)
  })

  test("refuses a streamed body with no Content-Length once it passes the limit", async () => {
    const { app, getBytesRead } = createLimitedApp()

    const chunk = new TextEncoder().encode("x".repeat(512))

    let sentChunks = 0

    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        // An endless stream: the limit, not the sender, has to end it.
        sentChunks += 1

        controller.enqueue(chunk)
      },
    })

    const response = await app.request("/upload", {
      body,
      // Node requires `duplex` for a stream body.
      duplex: "half",
      headers: { "transfer-encoding": "chunked" },
      method: "POST",
    })

    expect(response.status).toBe(413)
    expect(getBytesRead()).toBe(0)
    expect(sentChunks).toBeLessThan(10)
  })

  test("passes a body under the limit through to the handler", async () => {
    const { app } = createLimitedApp()

    const response = await app.request("/upload", {
      body: "x".repeat(100),
      method: "POST",
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      bytesRead: 100,
    })
  })

  test("takes a custom message", async () => {
    const app = new Hono()

    app.post(
      "/upload",
      createBodyLimit({
        maxBytes: 10,
        message: "A photo can be at most 10 bytes.",
      }),
      (context) => context.text("ok"),
    )

    const response = await app.request("/upload", {
      body: "x".repeat(20),
      method: "POST",
    })

    expect(await response.json()).toEqual({
      error: "A photo can be at most 10 bytes.",
    })
  })
})
