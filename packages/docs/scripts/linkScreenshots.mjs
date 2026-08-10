/**
 * Before/after boards for the `TextLink` / `ButtonLink` PR, in both
 * schemes.
 *
 * The **after** shots come out of the built Storybook, driven through
 * the `scheme` global rather than a `prefers-color-scheme` emulation —
 * the global is what writes `data-scheme` on `<html>`, and that
 * attribute is the only thing `variables.css` keys a colour off.
 *
 * The **before** board is a standalone page rendering the fleet's
 * *actual current* markup, copied verbatim from the repos it lives in,
 * against the same token stylesheet. That is the honest comparison: not
 * "no component existed", but "here is what an app ships today and what
 * it looks like beside the component that replaces it".
 *
 *     yarn build:storybook && node scripts/linkScreenshots.mjs
 *
 * They land in the gitignored `__screenshots__/` scratch. The ones
 * worth keeping are copied into `docs/previews/` under a dated name,
 * which is where this repo archives its before/after boards — the same
 * convention as `2026-07-29-m1-mux-magic-before-dark.png`.
 */

import { createReadStream } from "node:fs"
import { mkdir, stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"

import { chromium } from "playwright"

const STATIC_DIR = new URL(
  "../storybook-static/",
  import.meta.url,
).pathname

const OUT_DIR = new URL(
  "../../../__screenshots__/",
  import.meta.url,
).pathname

const MIME = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
}

const serveFrom = (roots) =>
  createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost")

    for (const root of roots) {
      const path = join(
        root,
        normalize(decodeURIComponent(url.pathname)),
      )

      try {
        const info = await stat(path)

        if (info.isDirectory()) {
          continue
        }

        response.setHeader(
          "content-type",
          MIME[extname(path)] ?? "application/octet-stream",
        )

        createReadStream(path).pipe(response)

        return
      } catch {
        // Next root.
      }
    }

    response.statusCode = 404
    response.end("not found")
  })

await mkdir(OUT_DIR, { recursive: true })

const TOKENS_DIR = new URL(
  "../../tokens/dist/",
  import.meta.url,
).pathname

// The before board is a sibling of this script, so it is versioned
// with it rather than living in the gitignored screenshot scratch.
const BEFORE_DIR = new URL("./", import.meta.url).pathname

const server = serveFrom([
  STATIC_DIR,
  BEFORE_DIR,
  TOKENS_DIR,
])

await new Promise((resolve) => {
  server.listen(6101, resolve)
})

const SCHEMES = ["light", "dark"]

const shots = [
  {
    height: 170,
    id: "components-buttonlink--beside-a-button",
    name: "after-buttonlink-beside-a-button",
    width: 900,
  },
  {
    height: 760,
    id: "components-buttonlink--all-variants",
    name: "after-buttonlink-all-variants",
    width: 900,
  },
  {
    height: 210,
    id: "components-buttonlink--all-states",
    name: "after-buttonlink-all-states",
    width: 900,
  },
  {
    height: 165,
    id: "components-textlink--all-appearances",
    name: "after-textlink-all-appearances",
    width: 900,
  },
  {
    height: 165,
    id: "components-textlink--all-states",
    name: "after-textlink-all-states",
    width: 900,
  },
  {
    height: 130,
    id: "components-buttonlink--routed",
    name: "after-buttonlink-routed",
    width: 900,
  },
]

const browser = await chromium.launch()

for (const scheme of SCHEMES) {
  for (const shot of shots) {
    const page = await browser.newPage({
      viewport: { height: shot.height, width: shot.width },
    })

    await page.goto(
      `http://localhost:6101/iframe.html?id=${shot.id}&viewMode=story&globals=scheme:${scheme}`,
      { waitUntil: "networkidle" },
    )

    await page.waitForTimeout(500)

    await page.screenshot({
      path: join(OUT_DIR, `${shot.name}-${scheme}.png`),
    })

    await page.close()

    console.log(`shot ${shot.name}-${scheme}`)
  }

  const beforePage = await browser.newPage({
    viewport: { height: 640, width: 900 },
  })

  await beforePage.goto(
    `http://localhost:6101/linkBefore.html`,
    { waitUntil: "networkidle" },
  )

  await beforePage.evaluate((current) => {
    document.documentElement.dataset.scheme = current
  }, scheme)

  await beforePage.waitForTimeout(400)

  await beforePage.screenshot({
    path: join(OUT_DIR, `before-fleet-today-${scheme}.png`),
    fullPage: true,
  })

  await beforePage.close()

  console.log(`shot before-fleet-today-${scheme}`)
}

await browser.close()

server.close()
