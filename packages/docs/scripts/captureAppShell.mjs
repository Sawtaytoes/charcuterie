/**
 * The app-shell screenshots for the PR body.
 *
 * Three templates x {desktop, 390px} x {light, dark}, plus the
 * before/after pair for the horizontal-scroll bug — "before" being
 * the same page with the two fixes disabled at runtime, which is
 * the only honest way to photograph a bug in a component that
 * never shipped with it.
 *
 * Run against the built Storybook: `yarn build:storybook` first.
 */

import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"

import { chromium } from "playwright"

const staticDirectory = join(
  import.meta.dirname,
  "..",
  "storybook-static",
)

const outputDirectory = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "__screenshots__",
  "app-shell",
)

const DESKTOP = { height: 900, width: 1440 }

const PHONE = { height: 844, width: 390 }

const TEMPLATES = [
  ["01-header-and-main", "components-shell--default"],
  ["02-start-rail", "components-shell--with-start-rail"],
  ["03-both-rails", "components-shell--with-both-rails"],
]

const startServer = async () => {
  const { createServer } = await import("node:http")

  const { readFile } = await import("node:fs/promises")

  const TYPES = {
    css: "text/css",
    html: "text/html",
    js: "text/javascript",
    json: "application/json",
    png: "image/png",
    svg: "image/svg+xml",
    woff2: "font/woff2",
  }

  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(
        (request.url ?? "/").split("?")[0],
      )

      const file = join(
        staticDirectory,
        path === "/" ? "index.html" : path,
      )

      const body = await readFile(file)

      response.writeHead(200, {
        "content-type":
          TYPES[file.split(".").pop()] ??
          "application/octet-stream",
      })

      response.end(body)
    } catch {
      response.writeHead(404)

      response.end("not found")
    }
  })

  await new Promise((resolve) => {
    server.listen(0, resolve)
  })

  return {
    close: () =>
      new Promise((resolve) => {
        server.close(resolve)
      }),
    port: server.address().port,
  }
}

const server = await startServer()

const browser = await chromium.launch()

await rm(outputDirectory, {
  force: true,
  recursive: true,
})

await mkdir(outputDirectory, { recursive: true })

const capture = async ({
  disableFixes = false,
  isFullPage = false,
  name,
  scheme,
  storyId,
  viewport,
}) => {
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport,
  })

  await page.goto(
    `http://localhost:${server.port}/iframe.html?id=${storyId}&globals=scheme:${scheme}&viewMode=story`,
    { waitUntil: "networkidle" },
  )

  await page.waitForSelector("main", { timeout: 15000 })

  if (disableFixes) {
    // The pre-fix state, reproduced rather than photographed from
    // a build nobody has: drop the frame's clip and the column's
    // `overflow-wrap`, which are two of the three mechanisms.
    await page.evaluate(() => {
      const shell =
        document.querySelector("main")?.parentElement

      if (shell) {
        shell.style.overflowX = "visible"

        shell.style.position = "static"
      }

      const column =
        document.querySelector("main")?.firstElementChild

      if (column instanceof HTMLElement) {
        column.style.overflowWrap = "normal"
      }
    })

    await page.waitForTimeout(300)
  }

  const scroll = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    width: document.documentElement.scrollWidth,
  }))

  // The overflow pair is captured **full-page**, because a
  // viewport-clipped shot of a page that scrolls sideways looks
  // exactly like one that does not — the parked drawer is off the
  // right edge either way. Full-page makes the image itself 742px
  // wide against the fixed 390px of the after shot, which is the
  // bug, visible.
  await page.screenshot({
    fullPage: isFullPage,
    path: join(outputDirectory, `${name}.png`),
  })

  await page.close()

  const flag =
    scroll.width > scroll.client
      ? `SCROLLS (${scroll.width} > ${scroll.client})`
      : "no horizontal scroll"

  console.log(`${name}.png — ${flag}`)
}

for (const [slug, storyId] of TEMPLATES) {
  for (const scheme of ["light", "dark"]) {
    await capture({
      name: `${slug}-desktop-${scheme}`,
      scheme,
      storyId,
      viewport: DESKTOP,
    })

    await capture({
      name: `${slug}-390-${scheme}`,
      scheme,
      storyId,
      viewport: PHONE,
    })
  }
}

// The bug this component exists to remove, both ways round.
for (const scheme of ["light", "dark"]) {
  await capture({
    disableFixes: true,
    isFullPage: true,
    name: `04-overflow-before-390-${scheme}`,
    scheme,
    storyId: "components-shell--responsive",
    viewport: PHONE,
  })

  await capture({
    isFullPage: true,
    name: `04-overflow-after-390-${scheme}`,
    scheme,
    storyId: "components-shell--responsive",
    viewport: PHONE,
  })
}

await browser.close()

await server.close()

console.log(`\nWrote to ${outputDirectory}`)
