import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"

import { chromium } from "playwright"

const STATIC_DIR = new URL(
  "../storybook-static/",
  import.meta.url,
).pathname

const OUT_DIR = new URL(
  "../../ui/__screenshots__/",
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

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost")
  const path = join(
    STATIC_DIR,
    normalize(decodeURIComponent(url.pathname)),
  )

  try {
    const info = await stat(path)

    if (info.isDirectory()) {
      throw new Error("dir")
    }

    response.setHeader(
      "content-type",
      MIME[extname(path)] ?? "application/octet-stream",
    )

    createReadStream(path).pipe(response)
  } catch {
    response.statusCode = 404
    response.end("not found")
  }
})

await new Promise((resolve) => server.listen(6100, resolve))

const shots = [
  {
    id: "components-popover--escapes-overflow-clip",
    name: "m8-popover-escapes-overflow-clip",
    open: "Open (escapes the clip)",
  },
  {
    id: "components-dialog--default",
    name: "m8-dialog-default",
    open: "Show the read error",
  },
  {
    id: "components-dialog--stacked",
    name: "m8-dialog-stacked",
    open: "Open the first dialog",
    then: "Open a second over it",
  },
  {
    id: "components-listbox--all-states",
    name: "m8-listbox",
    open: "Spanish",
  },
  {
    id: "components-combobox--interactive",
    name: "m8-combobox-filtering",
    open: "Search languages",
    type: "an",
  },
  {
    id: "components-combobox--virtualized",
    name: "m8-combobox-virtualized",
  },
]

const browser = await chromium.launch()

const page = await browser.newPage({
  viewport: { height: 620, width: 880 },
})

for (const shot of shots) {
  await page.goto(
    `http://localhost:6100/iframe.html?id=${shot.id}&viewMode=story`,
    { waitUntil: "networkidle" },
  )

  await page.waitForTimeout(400)

  if (shot.open) {
    await page
      .getByRole("button", { name: shot.open })
      .first()
      .click()

    await page.waitForTimeout(300)
  }

  if (shot.then) {
    await page
      .getByRole("button", { name: shot.then })
      .first()
      .click()

    await page.waitForTimeout(300)
  }

  if (shot.type) {
    await page.getByRole("combobox").fill(shot.type)

    await page.waitForTimeout(300)
  }

  await page.screenshot({
    path: join(OUT_DIR, `${shot.name}.png`),
  })

  console.log(`shot ${shot.name}`)
}

await browser.close()

server.close()
