/**
 * The `Toolbar` screenshots for the PR body and for review.
 *
 * Six shots x {light, dark}: the bar with room to spare, the two
 * overflow kinds **driven open** (a resting screenshot of an
 * overflow is a screenshot of nothing), the progressive-collapse
 * board, and the app shell at desktop and 390px — where the whole
 * bar relocates out of the header.
 *
 * Same static-serve + Playwright idiom as `captureAppShell.mjs`.
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
  "toolbar",
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
    name: "01-wide-nothing-collapsed",
    storyId: "components-toolbar--default",
    viewport: { width: 900, height: 200 },
  },
  {
    name: "02-narrow-menu-open",
    storyId: "components-toolbar--interactive",
    viewport: { width: 520, height: 400 },
    click: "More actions",
  },
  {
    name: "03-narrow-panel-open",
    storyId: "components-toolbar--all-variants",
    viewport: { width: 620, height: 560 },
    click: "More controls",
  },
  {
    name: "04-progressive-collapse",
    storyId: "components-toolbar--responsive",
    viewport: { width: 1100, height: 240 },
  },
  {
    name: "05-app-shell-desktop",
    storyId: "components-toolbar--in-app-shell",
    viewport: { width: 1280, height: 420 },
  },
  {
    name: "06-app-shell-390",
    storyId: "components-toolbar--in-app-shell",
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
