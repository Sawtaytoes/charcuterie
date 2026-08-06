/**
 * Visual-regression capture. Renders every built Storybook story
 * twice — once per colour scheme — and writes a PNG per shot into
 * the reg-suit "actual" directory. reg-suit (`vrt:compare`) then
 * diffs those against the baseline pulled from Garage S3 and
 * publishes the result; this script only produces pixels.
 *
 * Modelled on `m8Screenshots.mjs` (same static-serve + Playwright
 * idiom) but enumerates `storybook-static/index.json` instead of a
 * hand-list, and drives the scheme through Storybook's `scheme`
 * global — the same toolbar key `preview.tsx` reads to stamp
 * `data-scheme` on `<html>`. We wait for that attribute to actually
 * land before the shot, which closes the boot-time scheme flash the
 * smoke test documents.
 *
 * Determinism is the whole game for VRT flake: fixed viewport +
 * scale, reduced motion, animations/transitions/caret killed, and
 * `document.fonts.ready` awaited so DankMono is painted, not
 * falling back mid-shot.
 *
 * Env knobs:
 *   VRT_OUT          actual dir           (default .vrt-actual)
 *   VRT_SCHEMES      comma list           (default "dark,light")
 *   VRT_LIMIT        cap story count      (dry runs; default all)
 *   VRT_CONCURRENCY  parallel pages       (default 4)
 */

import { createReadStream } from "node:fs"
import { mkdir, readFile, rm, stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"

import { chromium } from "playwright"

const STATIC_DIR = new URL(
  "../storybook-static/",
  import.meta.url,
).pathname

const OUT_DIR = new URL(
  `../${process.env.VRT_OUT ?? ".vrt-actual"}/`,
  import.meta.url,
).pathname

const SCHEMES = (process.env.VRT_SCHEMES ?? "dark,light")
  .split(",")
  .map((scheme) => scheme.trim())
  .filter(Boolean)

const LIMIT = Number(process.env.VRT_LIMIT ?? 0)
const CONCURRENCY = Math.max(
  1,
  Number(process.env.VRT_CONCURRENCY ?? 4),
)

const MIME = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost")
  const path = join(
    STATIC_DIR,
    normalize(decodeURIComponent(url.pathname)),
  )

  try {
    if ((await stat(path)).isDirectory()) {
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

await new Promise((resolve) =>
  server.listen(0, "127.0.0.1", resolve),
)
const { port } = server.address()
const origin = `http://127.0.0.1:${port}`

const index = JSON.parse(
  await readFile(join(STATIC_DIR, "index.json"), "utf8"),
)

const stories = Object.values(
  index.entries ?? index.stories ?? {},
)
  .filter((entry) => entry.type === "story")
  .sort((first, second) =>
    first.id.localeCompare(second.id),
  )

const selected =
  LIMIT > 0 ? stories.slice(0, LIMIT) : stories

// The whole job is one shot list — every (story, scheme) pair —
// drained by a fixed pool of pages so wall-clock is count/CONCURRENCY,
// not count. Independent stories, so parallel is safe.
const shots = selected.flatMap((story) =>
  SCHEMES.map((scheme) => ({ id: story.id, scheme })),
)

await rm(OUT_DIR, { force: true, recursive: true })
await mkdir(OUT_DIR, { recursive: true })

console.log(
  `[vrt] ${selected.length} stories x ${SCHEMES.length} schemes = ${shots.length} shots ` +
    `(concurrency ${CONCURRENCY})`,
)

const browser = await chromium.launch()

// Kill motion and the text caret everywhere, so a mid-animation
// frame or a blinking cursor can never be the pixel that differs.
const freezeStyle = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`

const failures = []

const capture = async (page, { id, scheme }) => {
  const target =
    `${origin}/iframe.html?viewMode=story` +
    `&id=${encodeURIComponent(id)}` +
    `&globals=${encodeURIComponent(`scheme:${scheme}`)}`

  await page.goto(target, { waitUntil: "load" })

  // The scheme is applied by preview.tsx's writer in response to the
  // global, not synchronously on load — wait for it to land on <html>
  // so we never shoot the seed scheme under a light global. Best-effort:
  // a few specimen stories (e.g. tokens-specimen--light) PIN their own
  // scheme and never match `want`. That's not a failure — the pinned
  // render is still deterministic — so fall through after a short wait
  // and shoot whatever scheme they fixed themselves to.
  await page
    .waitForFunction(
      (want) =>
        document.documentElement.getAttribute(
          "data-scheme",
        ) === want,
      scheme,
      { timeout: 5_000 },
    )
    .catch(() => {})

  await page.addStyleTag({ content: freezeStyle })

  await page.waitForFunction(
    () => {
      const root = document.querySelector("#storybook-root")

      return root != null && root.childElementCount > 0
    },
    undefined,
    { timeout: 15_000 },
  )

  await page.evaluate(() => document.fonts.ready)

  // Let post-mount effects settle before the shot. `storybook-addon-pseudo-states`
  // applies forced :hover/:focus/:active classes a tick AFTER render, so shooting
  // the instant the root has children catches the un-forced state on some runs and
  // the forced one on others — a real flake seen on `*--all-states` stories. A
  // short settle closes that window (transitions are already snapped to their end
  // state by `animations: "disabled"` below, so this is about class application,
  // not motion).
  await page.waitForTimeout(400)

  const root = page.locator("#storybook-root")
  const box = await root.boundingBox()

  await (box != null && box.width > 0 && box.height > 0
    ? root
    : page
  ).screenshot({
    animations: "disabled",
    path: join(OUT_DIR, `${id}__${scheme}.png`),
  })
}

const contexts = await Promise.all(
  Array.from({ length: CONCURRENCY }, () =>
    browser.newContext({
      colorScheme: "no-preference",
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      viewport: { height: 900, width: 1280 },
    }),
  ),
)

let cursor = 0

const worker = async (context) => {
  const page = await context.newPage()

  while (cursor < shots.length) {
    const shot = shots[cursor++]

    try {
      await capture(page, shot)
    } catch (error) {
      failures.push({
        ...shot,
        message: String(error).split("\n")[0],
      })
      console.warn(
        `[vrt] FAILED ${shot.id} (${shot.scheme}): ${failures.at(-1).message}`,
      )
    }
  }

  await page.close()
}

await Promise.all(
  contexts.map((context) => worker(context)),
)

await browser.close()
server.close()

console.log(
  `[vrt] wrote ${shots.length - failures.length}/${shots.length} shots to ${OUT_DIR}`,
)

if (failures.length > 0) {
  // A story that never rendered is a capture bug, not a visual diff —
  // fail loudly so a broken build can't masquerade as "no changes".
  console.error(
    `[vrt] ${failures.length} shot(s) failed to render`,
  )
  process.exitCode = 1
}
