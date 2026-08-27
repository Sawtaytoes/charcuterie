/**
 * The `NavBar` screenshots for the PR body and for review.
 *
 * The states a resting shot cannot carry: the bar with room for all
 * nine destinations, the same nine folded into one button, that
 * button **driven open** (a screenshot of a shut menu is a
 * screenshot of nothing), and the app shell at desktop and at 390px,
 * which is the width the whole change is for.
 *
 * Same static-serve + Playwright idiom as `captureToolbar.mjs`.
 * Run against the built Storybook: `yarn build:storybook` first.
 */

import { mkdir, readFile } from "node:fs/promises"
import { createServer } from "node:http"
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
  "navbar",
)

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
await new Promise((resolve) => server.listen(0, resolve))
const port = server.address().port

await mkdir(outputDirectory, { recursive: true })
const browser = await chromium.launch()

const SHOTS = [
  {
    name: "01-wide-every-destination",
    storyId: "components-layout-navbar--default",
    viewport: { width: 1000, height: 160 },
  },
  {
    name: "02-narrow-folded-shut",
    storyId: "components-layout-navbar--interactive",
    viewport: { width: 480, height: 160 },
  },
  {
    name: "03-narrow-folded-open",
    storyId: "components-layout-navbar--interactive",
    viewport: { width: 480, height: 620 },
    click: "Main menu",
  },
  {
    name: "04-all-or-nothing",
    storyId: "components-layout-navbar--all-variants",
    viewport: { width: 950, height: 460 },
  },
  {
    name: "05-app-shell-desktop",
    storyId: "components-layout-navbar--in-app-shell",
    viewport: { width: 1280, height: 420 },
  },
  {
    name: "06-app-shell-390",
    storyId: "components-layout-navbar--in-app-shell",
    viewport: { width: 390, height: 560 },
  },
]

for (const { click, name, storyId, viewport } of SHOTS) {
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport,
    })
    await page.goto(
      `http://localhost:${port}/iframe.html?id=${storyId}&globals=scheme:${scheme}&viewMode=story`,
      { waitUntil: "networkidle" },
    )
    await page
      .waitForFunction(
        (want) =>
          document.documentElement.getAttribute(
            "data-scheme",
          ) === want,
        scheme,
        { timeout: 10000 },
      )
      .catch(() => {})
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)
    if (click) {
      await page
        .getByRole("button", { name: click })
        .click()
      await page.waitForTimeout(400)
    }
    const file = join(
      outputDirectory,
      `${name}-${scheme}.png`,
    )
    await page.screenshot({ path: file })
    await page.close()
    console.log("wrote", file)
  }
}
await browser.close()
await new Promise((resolve) => server.close(resolve))
