/**
 * Click through every entry in the built Storybook, in one page
 * load, and fail on the first thing that throws.
 *
 * **Why this exists and `test:storybook` does not cover it.** The
 * vitest browser run mounts each story in isolation, which is the
 * right shape for a component assertion and the wrong shape for the
 * bug it missed: `@storybook/addon-docs`'s blocks chunk loads
 * lazily, so it lands *after* Storybook's `enhanceContext` loader
 * has swapped `HTMLElement.prototype.focus` for an accessor, and
 * React Aria's module-scope `window.HTMLElement.prototype.focus`
 * read then throws `Illegal invocation`. Every docs page reached by
 * clicking rendered Storybook's "component failed to render" panel;
 * every docs page loaded cold rendered fine. An isolated mount can
 * never see that, because the whole defect is *ordering*.
 *
 * So the navigation here is deliberately SPA — one manager load,
 * then `setCurrentStory` over the addons channel for each entry,
 * exactly what the sidebar does. Reloading between entries would
 * reset the module graph and pass with the bug in place.
 *
 * Run it against a build:
 *
 *     yarn build:storybook && yarn smoke:storybook
 *
 * or against a dev server with `--base http://localhost:6006`.
 */

import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import {
  extname,
  join,
  normalize,
  resolve,
} from "node:path"

import { chromium } from "playwright"

const staticDirectory = resolve(
  import.meta.dirname,
  "..",
  "storybook-static",
)

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
}

/**
 * Warnings Storybook itself emits on a clean run. Anything not on
 * this list is a failure — an allowlist rather than a severity
 * filter, because "downgrade the noisy one" is how a smoke gate
 * stops smoking.
 */
const IGNORED_MESSAGES = [
  // Storybook 10.5.5's own docs blocks, deprecating a prop on a
  // component we do not render ourselves.
  "will become mandatory in Storybook 11",
]

/**
 * The one 404 that is the point. `MediaTile`'s error story points at
 * a poster that genuinely is not there, because a mocked `onError`
 * proves nothing about what the browser does with a broken `<img>`.
 * Scoped to the URL rather than to the words "404", so a real
 * missing chunk still fails the run.
 */
const EXPECTED_MISSING_RESOURCES = [
  "/charcuterie-missing-poster.png",
]

const serveStaticBuild = async (): Promise<{
  close: () => Promise<void>
  origin: string
}> => {
  const server = createServer((request, response) => {
    const requestedPath = decodeURIComponent(
      (request.url ?? "/").split("?")[0],
    )

    const filePath = join(
      staticDirectory,
      normalize(requestedPath).replace(/^(\.\.[/\\])+/, ""),
      requestedPath.endsWith("/") ? "index.html" : "",
    )

    readFile(filePath)
      .then((contents) => {
        response.writeHead(200, {
          "content-type":
            CONTENT_TYPES[extname(filePath)] ??
            "application/octet-stream",
        })

        response.end(contents)
      })
      .catch(() => {
        response.writeHead(404)
        response.end("not found")
      })
  })

  await new Promise<void>((onListening) => {
    server.listen(0, "127.0.0.1", onListening)
  })

  const address = server.address()

  if (address === null || typeof address === "string") {
    throw new Error("The smoke server did not get a port.")
  }

  return {
    close: () =>
      new Promise<void>((onClosed, onFailed) => {
        server.close((error) => {
          if (error) {
            onFailed(error)
          } else {
            onClosed()
          }
        })
      }),
    origin: `http://127.0.0.1:${address.port}`,
  }
}

type IndexEntry = {
  id: string
  name: string
  title: string
  type: "docs" | "story"
}

const baseArgument = process.argv
  .find((one) => one.startsWith("--base="))
  ?.slice("--base=".length)

const server = baseArgument
  ? null
  : await serveStaticBuild()

const origin = baseArgument ?? server?.origin

if (!origin) {
  throw new Error("No Storybook origin to smoke.")
}

const index = JSON.parse(
  await (baseArgument
    ? fetch(`${origin}/index.json`).then((one) =>
        one.text(),
      )
    : readFile(
        join(staticDirectory, "index.json"),
        "utf8",
      )),
) as { entries: Record<string, IndexEntry> }

const entries = Object.values(index.entries)

const browser = await chromium.launch()

const page = await browser.newPage({
  viewport: { height: 900, width: 1400 },
})

const failures: { entry: IndexEntry; message: string }[] =
  []

let currentMessages: string[] = []

const recordMessage = (message: string) => {
  if (
    IGNORED_MESSAGES.some((one) => message.includes(one))
  ) {
    return
  }

  currentMessages.push(message)
}

page.on("console", (message) => {
  if (message.type() !== "error") {
    return
  }

  const sourceUrl = message.location().url

  if (
    EXPECTED_MISSING_RESOURCES.some((one) =>
      sourceUrl.includes(one),
    )
  ) {
    return
  }

  recordMessage(`console.error: ${message.text()}`)
})

page.on("pageerror", (error) => {
  recordMessage(`pageerror: ${error.message}`)
})

// One load. Everything after this is the SPA transition a human
// makes, which is the only place the ordering defect exists.
await page.goto(
  `${origin}/?path=/story/${entries[0]?.id ?? ""}`,
  { waitUntil: "networkidle" },
)

const preview = page.frameLocator(
  "#storybook-preview-iframe",
)

for (const entry of entries) {
  currentMessages = []

  await page.evaluate(
    ([storyId, viewMode]) => {
      const channel = (
        globalThis as unknown as {
          __STORYBOOK_ADDONS_CHANNEL__?: {
            emit: (event: string, payload: unknown) => void
          }
        }
      ).__STORYBOOK_ADDONS_CHANNEL__

      if (!channel) {
        throw new Error(
          "The Storybook manager never exposed its channel.",
        )
      }

      channel.emit("setCurrentStory", { storyId, viewMode })
    },
    [entry.id, entry.type] as const,
  )

  // A flat wait, and deliberately so. There is no "settled" signal
  // for an SPA transition — `networkidle` is per-navigation, and the
  // failure being watched for is a lazy chunk that *throws while
  // evaluating*, so waiting on the preview root having content would
  // wait forever on exactly the case that matters. 600ms clears a
  // chunk fetch off localhost with room to spare.
  await page.waitForTimeout(600)

  await preview
    .locator("body")
    .waitFor({ state: "attached" })

  const errorPanel = await preview
    .locator("#error-message")
    .textContent()
    .catch(() => null)

  const isErrorDisplayShown = await preview
    .locator("body.sb-show-errordisplay")
    .count()

  if (isErrorDisplayShown > 0 && errorPanel) {
    currentMessages.push(`error display: ${errorPanel}`)
  }

  // A GFM table is not CommonMark, so without `remark-gfm` in
  // `main.ts` MDX renders the delimiter row as literal text instead
  // of a `<table>`. Nothing errors and the source stays correct,
  // which is how `Tokens/Overview` shipped with its axes table as a
  // paragraph of pipes. Checking the *rendered* text rather than the
  // config means a future MDX pipeline change cannot quietly undo it.
  if (entry.type === "docs") {
    const renderedText =
      (await preview
        .locator("body")
        .innerText()
        .catch(() => "")) ?? ""

    if (/\|\s*-{3,}\s*\|/.test(renderedText)) {
      currentMessages.push(
        "markdown table rendered as literal pipes — is `remark-gfm` still wired into `@storybook/addon-docs`?",
      )
    }
  }

  for (const message of currentMessages) {
    failures.push({ entry, message })
  }
}

await browser.close()
await server?.close()

if (failures.length > 0) {
  for (const { entry, message } of failures) {
    console.error(
      `✗ ${entry.title} › ${entry.name} (${entry.id})\n  ${message}`,
    )
  }

  console.error(
    `\n${failures.length} problem(s) across ${entries.length} entries.`,
  )

  process.exitCode = 1
} else {
  console.log(
    `✓ ${entries.length} Storybook entries rendered clean under SPA navigation.`,
  )
}
