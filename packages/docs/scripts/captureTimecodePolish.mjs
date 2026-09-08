/**
 * The `TimecodeInput` before/after screenshots for the PR body.
 *
 * Three changes, and every one of them is invisible in a resting
 * screenshot of the default story: the stray echo needs a SEEDED
 * field nobody has touched, the Narrow View needs a container
 * narrower than `--cq-sm` rather than a narrow window, and the
 * milliseconds need a value typed and committed. So each shot is
 * driven to the state that actually changed.
 *
 * Run it twice — once against a Storybook built from `master` and
 * once against this branch's — and the two directories are the two
 * columns of the table:
 *
 * ```bash
 * node packages/docs/scripts/captureTimecodePolish.mjs \
 *   --static ../before-worktree/packages/docs/storybook-static \
 *   --out __screenshots__/timecode/before
 * ```
 *
 * Same static-serve + Playwright idiom as `captureToolbar.mjs`.
 */

import { mkdir, readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "playwright"

const readFlag = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)

  return index === -1
    ? fallback
    : (process.argv[index + 1] ?? fallback)
}

const staticDirectory = resolve(
  readFlag(
    "static",
    join(import.meta.dirname, "..", "storybook-static"),
  ),
)

const outputDirectory = resolve(
  readFlag(
    "out",
    join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "__screenshots__",
      "timecode",
      "after",
    ),
  ),
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

await new Promise((resolve) => {
  server.listen(0, resolve)
})

const port = server.address().port

await mkdir(outputDirectory, { recursive: true })

const browser = await chromium.launch()

const INTERACTIVE =
  "components-controls-timecodeinput--interactive"

const RESPONSIVE =
  "components-controls-timecodeinput--responsive"

const SHOTS = [
  {
    // The defect as reported: a seeded section nobody has touched,
    // printing its start mark under two idle fields.
    drive: async () => {},
    name: "01-echo-idle",
    storyId: INTERACTIVE,
    viewport: { height: 420, width: 560 },
  },
  {
    // Must persist. The control is still `aria-invalid`, so the
    // sentence saying why has to stay with it.
    drive: async (page) => {
      const field = page.getByRole("textbox", {
        name: "Start at",
      })

      await field.click()
      await field.fill("1:90")
      await page.keyboard.press("Tab")
    },
    name: "02-unparsed-after-blur",
    storyId: INTERACTIVE,
    viewport: { height: 420, width: 560 },
  },
  {
    // Must persist. This refusal is written AT the blur, so hiding
    // it on blur would mean it was never readable.
    drive: async (page) => {
      const field = page.getByRole("textbox", {
        name: "Play section end",
      })

      await field.click()
      await field.fill("5:00")
      await page.keyboard.press("Tab")
    },
    name: "03-zero-length-after-blur",
    storyId: INTERACTIVE,
    viewport: { height: 420, width: 560 },
  },
  {
    // Three fixed container widths, so the query is exercised while
    // the window never moves.
    drive: async () => {},
    name: "04-container-widths",
    storyId: RESPONSIVE,
    viewport: { height: 320, width: 1280 },
  },
  {
    // The reported case: a section in a 390px dialog.
    drive: async () => {},
    name: "05-narrow-390",
    storyId: INTERACTIVE,
    viewport: { height: 460, width: 390 },
  },
  {
    // Enter rather than Tab, so the focus stays and this shot shows
    // the committed TEXT rather than the echo rule.
    drive: async (page) => {
      const field = page.getByRole("textbox", {
        name: "Start at",
      })

      await field.click()
      await field.fill("10:00")
      await page.keyboard.press("Enter")
    },
    name: "06-whole-second-committed",
    storyId: INTERACTIVE,
    viewport: { height: 420, width: 560 },
  },
]

for (const shot of SHOTS) {
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: shot.viewport,
    })

    await page.goto(
      `http://localhost:${port}/iframe.html?id=${shot.storyId}&globals=scheme:${scheme}&viewMode=story`,
      { waitUntil: "networkidle" },
    )

    await page.waitForFunction(
      (current) =>
        document.documentElement.dataset.scheme === current,
      scheme,
    )

    await shot.drive(page)

    await page.waitForTimeout(200)

    await page.screenshot({
      path: join(
        outputDirectory,
        `${shot.name}-${scheme}.png`,
      ),
    })

    console.log(`shot ${shot.name}-${scheme}`)

    await page.close()
  }
}

await browser.close()

server.close()
