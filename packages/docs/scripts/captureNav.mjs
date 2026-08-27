/**
 * The `Nav` screenshots for the PR body and for review.
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
  "nav",
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
    name: "01-bar-with-room",
    storyId: "components-layout-nav--default",
    viewport: { width: 1000, height: 150 },
  },
  {
    name: "02-every-layout",
    storyId: "components-layout-nav--all-variants",
    viewport: { width: 1100, height: 720 },
  },
  {
    name: "03-bar-folded-open",
    storyId: "components-layout-nav--all-variants",
    viewport: { width: 1100, height: 720 },
    click: "Main menu",
  },
  {
    name: "04-current-states",
    storyId: "components-layout-nav--all-states",
    viewport: { width: 980, height: 700 },
  },
  {
    name: "05-three-rail-widths",
    storyId: "components-layout-nav--responsive",
    viewport: { width: 900, height: 480 },
  },
  {
    name: "06-narrow-menu-open",
    storyId: "components-layout-nav--interactive",
    viewport: { width: 420, height: 560 },
    click: "Menu",
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
