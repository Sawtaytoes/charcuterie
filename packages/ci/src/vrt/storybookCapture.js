#!/usr/bin/env node
/**
 * Shared visual-regression capture for built Storybooks.
 *
 * Serves each `storybook-static` directory, enumerates its `index.json`
 * (docs entries skipped), and screenshots every story — once per colour
 * scheme when the repo has a scheme global — into `$VRT_ACTUAL_DIR`.
 * reg-suit compares that directory against the baseline afterwards; this
 * script only produces pixels.
 *
 *   node storybookCapture.js packages/docs/storybook-static \
 *     --scheme-global scheme --schemes dark,light --scheme-attribute data-scheme
 *
 *   node storybookCapture.js web=packages/web/storybook-static \
 *     server=packages/server/storybook-static --clean
 *
 * Generalized from `packages/docs/scripts/vrtCapture.mjs`, and it keeps
 * that script's naming: a Storybook given without a prefix writes
 * `<story id>__<scheme>.png` at the top level, exactly as before.
 *
 * Determinism is the whole game for VRT flake: fixed viewport and scale,
 * reduced motion, animations, transitions and the caret frozen, the network
 * idle and `document.fonts.ready` awaited so the real face is painted.
 *
 * That last one bounds the PAINT, not its consequences. A face loaded with
 * `font-display: swap` lets a component lay out in the fallback, measure
 * itself, and lay out again in the real face — and anything it derived from
 * the first measurement is a race this script cannot wait out. Charcuterie's
 * `LogViewer` flaked on exactly that for a week. Waiting longer was measured
 * not to be the fix: the component has to survive the second layout.
 *
 * Options (flag, else environment variable):
 *   <prefix=path> ...     Storybooks            VRT_STORYBOOK_STATIC_DIRS (one per line)
 *   --out <dir>           actual directory      VRT_ACTUAL_DIR (default .vrt-actual)
 *   --scheme-global <g>   Storybook global      VRT_SCHEME_GLOBAL (default none)
 *   --schemes <a,b>       values of that global VRT_SCHEMES
 *   --scheme-attribute    <html> attribute the  VRT_SCHEME_ATTRIBUTE (default none)
 *                         preview stamps once the scheme lands; waited for
 *   --viewport <WxH>      page size             VRT_VIEWPORT (default 1280x800)
 *   --concurrency <n>     parallel pages        VRT_CONCURRENCY (default 4)
 *   --include <ids>       id substrings/globs   VRT_INCLUDE
 *   --exclude <ids>       id substrings/globs   VRT_EXCLUDE
 *   --limit <n>           stories per Storybook VRT_LIMIT (dry runs)
 *   --clean               empty the actual directory first
 */

import { createReadStream } from "node:fs"
import { mkdir, readFile, rm, stat } from "node:fs/promises"
import { createServer } from "node:http"
import {
  dirname,
  extname,
  join,
  resolve,
  sep,
} from "node:path"
import { fileURLToPath } from "node:url"

import {
  parseCaptureArguments,
  planShots,
  selectStoryIds,
  storyUrl,
} from "./captureOptions.js"
import { FREEZE_MOTION_CSS } from "./freezeMotion.js"

/** @type {Record<string, string>} */
const MIME = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".mjs": "text/javascript",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

/**
 * A static server for one `storybook-static` directory, bound to a free
 * loopback port. Refuses any path that resolves outside the directory.
 *
 * @param {string} staticDir
 * @returns {Promise<{ origin: string, close: () => void }>}
 */
const serveStatic = async (staticDir) => {
  const root = resolve(staticDir)

  const server = createServer(async (request, response) => {
    const url = new URL(
      request.url ?? "/",
      "http://localhost",
    )
    const path = resolve(
      root,
      `.${decodeURIComponent(url.pathname)}`,
    )

    try {
      if (
        path !== root &&
        !path.startsWith(`${root}${sep}`)
      ) {
        throw new Error("outside the static directory")
      }

      const target = (await stat(path)).isDirectory()
        ? join(path, "index.html")
        : path

      await stat(target)

      response.setHeader(
        "content-type",
        MIME[extname(target)] ?? "application/octet-stream",
      )

      createReadStream(target).pipe(response)
    } catch {
      response.statusCode = 404
      response.end("not found")
    }
  })

  await new Promise((onListening) => {
    server.listen(0, "127.0.0.1", () =>
      onListening(undefined),
    )
  })

  const address = server.address()

  if (address == null || typeof address === "string") {
    throw new Error("The static server has no port.")
  }

  return {
    close: () => server.close(),
    origin: `http://127.0.0.1:${address.port}`,
  }
}

/**
 * @param {string} staticDir
 */
const readStorybookIndex = async (staticDir) => {
  const indexPath = join(staticDir, "index.json")

  try {
    return JSON.parse(await readFile(indexPath, "utf8"))
  } catch (error) {
    throw new Error(
      `Cannot read ${indexPath}. Build the Storybook first (\`storybook build\`). ${String(error)}`,
    )
  }
}

/**
 * @param {string[]} argv
 * @param {Record<string, string | undefined>} env
 */
export const captureStorybooks = async (argv, env) => {
  const isClean = argv.includes("--clean")
  const options = parseCaptureArguments(
    argv.filter((arg) => arg !== "--clean"),
    env,
  )

  const catalogs = await Promise.all(
    options.sources.map(async (source) => {
      const storyIds = selectStoryIds(
        await readStorybookIndex(source.staticDir),
        {
          exclude: options.exclude,
          include: options.include,
        },
      )

      return {
        source,
        storyIds:
          options.limit > 0
            ? storyIds.slice(0, options.limit)
            : storyIds,
      }
    }),
  )

  const shots = planShots(catalogs, options.schemes)
  const actualDir = resolve(options.actualDir)

  if (isClean) {
    await rm(actualDir, { force: true, recursive: true })
  }

  await mkdir(actualDir, { recursive: true })

  for (const { source, storyIds } of catalogs) {
    console.log(
      `[vrt] ${source.prefix || "(no prefix)"}: ${storyIds.length} stories from ${source.staticDir}`,
    )
  }

  console.log(
    `[vrt] ${shots.length} shots, ${options.schemes.length} scheme pass(es), ` +
      `viewport ${options.viewport.width}x${options.viewport.height}, concurrency ${options.concurrency}`,
  )

  if (shots.length === 0) {
    // An empty capture is not "no changes". A stories glob that stopped
    // matching produces exactly this, and reg-suit would report every
    // baseline as deleted and stay green.
    throw new Error(
      "No stories matched. Check the Storybook build and the include/exclude filters.",
    )
  }

  const servers = new Map(
    await Promise.all(
      options.sources.map(
        async (source) =>
          /** @type {const} */ ([
            source.staticDir,
            await serveStatic(source.staticDir),
          ]),
      ),
    ),
  )

  // Imported here rather than at the top so the pure modules and their
  // tests never need a browser installed.
  const { chromium } = await import("playwright")

  // Playwright launches Chromium with its sandbox OFF unless asked
  // otherwise, and that default is kept on purpose: the job runs inside an
  // unprivileged container, where the sandbox's user namespaces are not
  // available, so turning it on fails to launch as a normal user just as
  // it always fails as root. It is stated here so nobody "hardens" it into
  // a broken capture.
  const browser = await chromium.launch({
    chromiumSandbox: false,
  })

  /** @type {{ fileName: string, message: string }[]} */
  const failures = []

  /**
   * @param {import("playwright").Page} page
   * @param {import("./captureOptions.js").Shot} shot
   */
  const capture = async (page, shot) => {
    const server = servers.get(shot.staticDir)

    if (server == null) {
      throw new Error(`No server for ${shot.staticDir}.`)
    }

    await page.goto(
      storyUrl({
        origin: server.origin,
        scheme: shot.scheme,
        schemeGlobal: options.schemeGlobal,
        storyId: shot.storyId,
      }),
      { waitUntil: "load" },
    )

    // A preview applies the scheme in response to the global, not
    // synchronously on load. When it stamps an attribute on <html>, wait
    // for it so the seed scheme is never shot under the other global.
    // Best-effort: a specimen story that PINS its own scheme never matches,
    // and its render is still deterministic.
    if (
      options.schemeAttribute != null &&
      shot.scheme != null
    ) {
      await page
        .waitForFunction(
          ({ attribute, want }) =>
            document.documentElement.getAttribute(
              attribute,
            ) === want,
          {
            attribute: options.schemeAttribute,
            want: shot.scheme,
          },
          { timeout: 5_000 },
        )
        .catch(() => {})
    }

    await page.addStyleTag({ content: FREEZE_MOTION_CSS })

    await page.waitForFunction(
      () => {
        const root =
          document.querySelector("#storybook-root") ??
          document.querySelector("#root")

        return root != null && root.childElementCount > 0
      },
      undefined,
      { timeout: 15_000 },
    )

    await page.evaluate(() => document.fonts.ready)

    // Let post-mount effects settle. `storybook-addon-pseudo-states`
    // applies its forced :hover/:focus classes a tick AFTER render, so a
    // shot taken the instant the root has children catches the forced
    // state on some runs and not on others. The network wait runs beside
    // it: a lazily loaded image or font must have arrived before the shot.
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.waitForTimeout(400),
    ])

    await page.evaluate(() => document.fonts.ready)

    const path = join(actualDir, shot.fileName)

    await mkdir(dirname(path), { recursive: true })

    const root = page
      .locator("#storybook-root, #root")
      .filter({ has: page.locator(":scope > *") })
      .first()
    const box = await root.boundingBox().catch(() => null)

    await (box != null && box.width > 0 && box.height > 0
      ? root
      : page
    ).screenshot({ animations: "disabled", path })
  }

  const contexts = await Promise.all(
    Array.from({ length: options.concurrency }, () =>
      browser.newContext({
        colorScheme: "no-preference",
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        viewport: options.viewport,
      }),
    ),
  )

  let cursor = 0

  /**
   * @param {import("playwright").BrowserContext} context
   */
  const worker = async (context) => {
    const page = await context.newPage()

    while (cursor < shots.length) {
      const shot = shots[cursor]

      cursor += 1

      try {
        await capture(page, shot)
      } catch (error) {
        const message = String(error).split("\n")[0]

        failures.push({ fileName: shot.fileName, message })
        console.warn(
          `[vrt] FAILED ${shot.fileName}: ${message}`,
        )
      }
    }

    await page.close()
  }

  try {
    await Promise.all(
      contexts.map((context) => worker(context)),
    )
  } finally {
    await browser.close()

    for (const server of servers.values()) {
      server.close()
    }
  }

  console.log(
    `[vrt] wrote ${shots.length - failures.length}/${shots.length} shots to ${actualDir}`,
  )

  return { failures, shots }
}

const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)

if (isMain) {
  captureStorybooks(process.argv.slice(2), process.env)
    .then(({ failures }) => {
      if (failures.length > 0) {
        // A story that never rendered is a capture fault, not a visual
        // diff. Fail loudly so a broken build cannot pass as "no changes".
        console.error(
          `[vrt] ${failures.length} shot(s) failed to render`,
        )
        process.exitCode = 1
      }
    })
    .catch((error) => {
      console.error(
        `[vrt] ${error instanceof Error ? error.message : error}`,
      )
      process.exitCode = 1
    })
}
