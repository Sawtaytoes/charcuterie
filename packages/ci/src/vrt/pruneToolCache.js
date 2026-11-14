/**
 * Bound the shared workflow's tool cache: the pnpm store and the Playwright
 * browsers in `$RUNNER_TOOL_CACHE` (`_work/_tool` on the self-hosted GitHub
 * runners). Both persist between jobs and would otherwise only grow.
 *
 * It runs as the job's last step, while this job's `node_modules` (the repo's
 * and the tools') still exist.
 *
 * - **Browsers, every job:** Playwright records each installing package in
 *   `.links/`. A browser directory that no live link's `browsers.json` names
 *   is removed. Playwright does the same on every `playwright install`, but
 *   at the start of a job, after `git clean` has removed the repo's
 *   `node_modules`, so it deleted the repo's own browser and the capture
 *   downloaded it again on every run. The workflow therefore sets
 *   `PLAYWRIGHT_SKIP_BROWSER_GC=1` and leaves the collection to this step.
 * - **pnpm, by age or size:** the whole store is removed once it is
 *   `VRT_PNPM_STORE_MAX_DAYS` old (default 7) or larger than
 *   `VRT_PNPM_STORE_MAX_GIB` (default 4); the next job downloads what it
 *   needs into a new one. `pnpm store prune` is not used: pnpm 12.9.1 removed
 *   every package of a freshly installed rip-deck workspace (428 of 428,
 *   reproduced on 2026-11-14), so it would empty the store on each run. The
 *   age counts from the first job that saw the store
 *   (`.vrt-pnpm-store-since` in the cache root).
 *
 * `node_modules` is unaffected by either: its files are clones or copies of
 * the store's. A failure prints a warning and never fails the job.
 */

import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"

export const STORE_STAMP_NAME = ".vrt-pnpm-store-since"
export const DEFAULT_STORE_MAX_DAYS = 7
export const DEFAULT_STORE_MAX_GIB = 4

const GIB = 1024 * 1024 * 1024

/** Playwright's `allDownloadableDirectoriesThatEverExisted`. */
const BROWSER_NAMES = [
  "android",
  "chromium",
  "firefox",
  "webkit",
  "ffmpeg",
  "firefox-beta",
  "chromium-tip-of-tree",
  "chromium-headless-shell",
  "chromium-tip-of-tree-headless-shell",
  "winldd",
]

/** Playwright names a browser directory `<name with _ for ->-<revision>`. */
const directoryName = (prefix, revision) =>
  `${prefix.replace(/-/g, "_")}-${revision}`

export const isBrowserDirectoryName = (name) =>
  BROWSER_NAMES.some((browser) =>
    name.startsWith(`${browser.replace(/-/g, "_")}-`),
  )

/**
 * Every browser directory one `browsers.json` can use, on any platform.
 * Revision overrides are kept too, so a host platform this cannot predict
 * never loses its browser.
 *
 * @param {{ browsers: { name: string, revision: string, revisionOverrides?: Record<string, string> }[] }} browsersJson
 * @returns {string[]}
 */
export const browserDirectoriesFor = (browsersJson) =>
  browsersJson.browsers.flatMap((browser) => [
    directoryName(browser.name, browser.revision),
    ...Object.entries(browser.revisionOverrides ?? {}).map(
      ([platform, revision]) =>
        directoryName(
          `${browser.name}_${platform}_special`,
          revision,
        ),
    ),
  ])

/**
 * @param {string[]} entries directory names in the browsers path
 * @param {Set<string>} used directory names a live link needs
 * @returns {string[]} the browser directories to remove
 */
export const planBrowserRemoval = (entries, used) =>
  entries
    .filter((name) => isBrowserDirectoryName(name))
    .filter((name) => !used.has(name))
    .sort()

/**
 * @param {{ sinceTime: number | null, now: number, storeBytes: number, maxDays: number, maxBytes: number }} state
 * @returns {{ isDue: boolean, reason: string }}
 */
export const isStoreRenewalDue = ({
  sinceTime,
  now,
  storeBytes,
  maxDays,
  maxBytes,
}) => {
  if (storeBytes > maxBytes) {
    return {
      isDue: true,
      reason: `it holds ${formatGib(storeBytes)} GiB, over ${formatGib(maxBytes)} GiB`,
    }
  }
  const days =
    sinceTime == null ? 0 : (now - sinceTime) / 86_400_000
  if (days >= maxDays) {
    return {
      isDue: true,
      reason: `it is ${Math.floor(days)} days old`,
    }
  }
  return {
    isDue: false,
    reason: `${formatGib(storeBytes)} GiB, ${Math.floor(days)} of ${maxDays} days`,
  }
}

const formatGib = (bytes) => (bytes / GIB).toFixed(2)

/** Apparent size of a tree, without following symbolic links. */
export const treeBytes = (path) => {
  let stats
  try {
    stats = lstatSync(path)
  } catch {
    return 0
  }
  if (!stats.isDirectory()) {
    return stats.isFile() ? stats.size : 0
  }
  let total = 0
  for (const entry of readdirSync(path)) {
    total += treeBytes(join(path, entry))
  }
  return total
}

/**
 * The directories live links need. A link whose package is gone is broken;
 * Playwright removes those itself, and so does this.
 *
 * @param {string} browsersPath
 * @returns {{ hasLinks: boolean, used: Set<string>, brokenLinks: string[] }}
 */
export const readLinks = (browsersPath) => {
  const linksPath = join(browsersPath, ".links")
  const used = new Set()
  const brokenLinks = []
  let links = []
  try {
    links = readdirSync(linksPath)
  } catch {
    return { brokenLinks, hasLinks: false, used }
  }
  for (const link of links) {
    const linkPath = join(linksPath, link)
    try {
      const target = readFileSync(linkPath, "utf8").trim()
      const browsersJson = JSON.parse(
        readFileSync(join(target, "browsers.json"), "utf8"),
      )
      for (const name of browserDirectoriesFor(
        browsersJson,
      )) {
        used.add(name)
      }
    } catch {
      brokenLinks.push(linkPath)
    }
  }
  return { brokenLinks, hasLinks: true, used }
}

const readStampTime = (stampPath) => {
  try {
    return statSync(stampPath).mtimeMs
  } catch {
    return null
  }
}

const numberFromEnv = (value, fallback) => {
  const number = Number(value)
  return value && Number.isFinite(number) && number > 0
    ? number
    : fallback
}

export const pruneBrowsers = (browsersPath) => {
  if (!existsSync(browsersPath)) {
    return []
  }
  const { brokenLinks, hasLinks, used } =
    readLinks(browsersPath)
  // Without a `.links` directory nothing records what is in use, so this is
  // not a Playwright registry this understands; keep everything. With one,
  // a browser no live link names is unused, as Playwright itself decides.
  if (!hasLinks) {
    return []
  }
  const doomed = planBrowserRemoval(
    readdirSync(browsersPath).filter((name) =>
      lstatSync(join(browsersPath, name)).isDirectory(),
    ),
    used,
  )
  for (const name of doomed) {
    rmSync(join(browsersPath, name), {
      force: true,
      recursive: true,
    })
  }
  for (const linkPath of brokenLinks) {
    unlinkSync(linkPath)
  }
  return doomed
}

export const main = (
  env = process.env,
  now = Date.now(),
) => {
  const root = env.VRT_TOOL_CACHE_ROOT
  const storePath = env.VRT_PNPM_STORE_DIR
  const browsersPath = env.VRT_CACHE_BROWSERS_PATH
  if (!root || !storePath || !browsersPath) {
    console.log(
      "[vrt] Tool cache prune skipped: the cache paths are not set.",
    )
    return
  }

  const browsersBefore = treeBytes(browsersPath)
  const removed = pruneBrowsers(browsersPath)
  console.log(
    `[vrt] Browsers: ${formatGib(browsersBefore)} -> ${formatGib(treeBytes(browsersPath))} GiB` +
      (removed.length
        ? `, removed ${removed.join(", ")}.`
        : ", none unused."),
  )

  const stampPath = join(root, STORE_STAMP_NAME)
  if (!existsSync(storePath)) {
    rmSync(stampPath, { force: true })
    return
  }
  let sinceTime = readStampTime(stampPath)
  if (sinceTime == null) {
    writeFileSync(
      stampPath,
      `${new Date(now).toISOString()}\n`,
    )
    sinceTime = now
  }
  const storeBytes = treeBytes(storePath)
  const due = isStoreRenewalDue({
    maxBytes:
      numberFromEnv(
        env.VRT_PNPM_STORE_MAX_GIB,
        DEFAULT_STORE_MAX_GIB,
      ) * GIB,
    maxDays: numberFromEnv(
      env.VRT_PNPM_STORE_MAX_DAYS,
      DEFAULT_STORE_MAX_DAYS,
    ),
    now,
    sinceTime,
    storeBytes,
  })
  if (!due.isDue) {
    console.log(`[vrt] pnpm store kept: ${due.reason}.`)
    return
  }
  rmSync(storePath, { force: true, recursive: true })
  rmSync(stampPath, { force: true })
  console.log(
    `[vrt] pnpm store removed, because ${due.reason}. The next job downloads what it needs.`,
  )
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    main()
  } catch (error) {
    console.log(
      `::warning::The tool cache prune failed and the job continues: ${error instanceof Error ? error.message : error}`,
    )
  }
}
