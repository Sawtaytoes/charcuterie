/**
 * The `Board` move-handle screenshots for the PR body and for
 * review.
 *
 * One story, two board widths, and the whole change is which
 * affordance is painted: the app's grip while the lanes are side by
 * side, the word "Move" once the board has collapsed to one lane and
 * a drag has nowhere to land. A resting shot of one width says
 * nothing — the claim is about the pair.
 *
 * The `--open` shot presses the narrow handle, because the argument
 * for the word is that pressing it does something: a screenshot of a
 * shut menu is a screenshot of nothing.
 *
 * Same static-serve + Playwright idiom as `captureNavBar.mjs`. Run
 * against the built Storybook: `yarn build:storybook` first.
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
  "board-move-handle",
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
    name: "01-wide-three-lanes",
    region: "Today, wide enough to drag",
    storyId:
      "components-layout-board--move-handle-by-width",
    viewport: { width: 1240, height: 900 },
  },
  {
    name: "02-narrow-one-lane",
    region: "Today, one lane at a time",
    storyId:
      "components-layout-board--move-handle-by-width",
    viewport: { width: 1240, height: 900 },
  },
  {
    name: "03-both-widths-menu-open",
    click:
      "Move Retire the second scheduler and fold its jobs into the broker, currently in Todo",
    clickLast: true,
    fullPage: true,
    storyId:
      "components-layout-board--move-handle-by-width",
    viewport: { width: 520, height: 900 },
  },
]

for (const {
  click,
  clickLast,
  fullPage,
  name,
  region,
  storyId,
  viewport,
} of SHOTS) {
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
      const handles = page.getByRole("button", {
        name: click,
      })
      await (clickLast
        ? handles.last()
        : handles.first()
      ).click()
      await page.waitForTimeout(400)
    }
    const file = join(
      outputDirectory,
      `${name}-${scheme}.png`,
    )
    await (region
      ? page.getByRole("region", { name: region })
      : page
    ).screenshot({
      path: file,
      ...(fullPage ? { fullPage } : {}),
    })
    await page.close()
    console.log("wrote", file)
  }
}
await browser.close()
await new Promise((resolve) => server.close(resolve))
