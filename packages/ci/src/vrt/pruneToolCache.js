/**
 * Bound the shared workflow's tool cache: the pnpm store and the Playwright
 * browsers in `$RUNNER_TOOL_CACHE` (`_work/_tool` on the self-hosted GitHub
 * runners). Both persist between jobs and would otherwise only grow.
 *
 * It runs as the job's last step, while this job's `node_modules` (the repo's
 * and the tools') still exist, so "in use" means "used by this job":
 *
 * - **pnpm:** `pnpm store prune` marks every package a registered project's
 *   `node_modules` still uses and removes the rest. The packages a later job
 *   needs again are downloaded again.
 * - **Browsers:** Playwright records each installing package in
 *   `.links/`. A browser directory that no live link's `browsers.json` names
 *   is removed. Playwright does the same on every `playwright install`, but
 *   at the start of a job, after `git clean` has removed the repo's
 *   `node_modules`, so it deleted the repo's own browser and the capture
 *   downloaded it again on every run. The workflow therefore sets
 *   `PLAYWRIGHT_SKIP_BROWSER_GC=1` and leaves the collection to this step.
 *
 * A prune runs at most once per `VRT_TOOL_CACHE_PRUNE_HOURS` (default 24),
 * or at once when the two caches together exceed `VRT_TOOL_CACHE_MAX_GIB`
 * (default 5). A stamp file in the cache root records the last prune. A
 * failure prints a warning and never fails the job.
 */

import { spawnSync } from "node:child_process"
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

export const STAMP_NAME = ".vrt-tool-cache-pruned"
export const DEFAULT_PRUNE_HOURS = 24
export const DEFAULT_MAX_GIB = 5

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
 * @param {{ stampTime: number | null, now: number, totalBytes: number, pruneHours: number, maxBytes: number }} state
 * @returns {{ isDue: boolean, reason: string }}
 */
export const isPruneDue = ({
  stampTime,
  now,
  totalBytes,
  pruneHours,
  maxBytes,
}) => {
  if (totalBytes > maxBytes) {
    return {
      isDue: true,
      reason: `the caches hold ${formatGib(totalBytes)} GiB, over ${formatGib(maxBytes)} GiB`,
    }
  }
  if (stampTime == null) {
    return {
      isDue: true,
      reason: "no earlier prune is recorded",
    }
  }
  const hours = (now - stampTime) / 3_600_000
  if (hours >= pruneHours) {
    return {
      isDue: true,
      reason: `the last prune was ${Math.floor(hours)} hours ago`,
    }
  }
  return {
    isDue: false,
    reason: `the last prune was ${Math.floor(hours)} hours ago, under ${pruneHours}`,
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

export const prunePnpmStore = (storePath, toolsPath) => {
  if (!existsSync(storePath)) {
    return
  }
  // From the tools' directory: pnpm 12 refuses to run in a project whose
  // `packageManager` names another manager.
  const result = spawnSync(
    "pnpm",
    ["store", "prune", "--store-dir", storePath],
    { cwd: toolsPath, stdio: "inherit" },
  )
  if (result.status !== 0) {
    throw new Error(
      `pnpm store prune exited with ${result.status ?? result.signal ?? result.error}`,
    )
  }
}

export const main = (
  env = process.env,
  now = Date.now(),
) => {
  const root = env.VRT_TOOL_CACHE_ROOT
  const storePath = env.VRT_PNPM_STORE_DIR
  const browsersPath = env.VRT_CACHE_BROWSERS_PATH
  const toolsPath = env.VRT_TOOLS
  if (!root || !storePath || !browsersPath || !toolsPath) {
    console.log(
      "[vrt] Tool cache prune skipped: the cache paths are not set.",
    )
    return
  }
  const stampPath = join(root, STAMP_NAME)
  const before = {
    browsers: treeBytes(browsersPath),
    store: treeBytes(storePath),
  }
  const due = isPruneDue({
    maxBytes:
      numberFromEnv(
        env.VRT_TOOL_CACHE_MAX_GIB,
        DEFAULT_MAX_GIB,
      ) * GIB,
    now,
    pruneHours: numberFromEnv(
      env.VRT_TOOL_CACHE_PRUNE_HOURS,
      DEFAULT_PRUNE_HOURS,
    ),
    stampTime: readStampTime(stampPath),
    totalBytes: before.browsers + before.store,
  })
  if (!due.isDue) {
    console.log(
      `[vrt] Tool cache prune skipped: ${due.reason}. pnpm store ${formatGib(before.store)} GiB, browsers ${formatGib(before.browsers)} GiB.`,
    )
    return
  }
  console.log(
    `[vrt] Pruning the tool cache: ${due.reason}.`,
  )
  prunePnpmStore(storePath, toolsPath)
  const removed = pruneBrowsers(browsersPath)
  writeFileSync(
    stampPath,
    `${new Date(now).toISOString()}\n`,
  )
  const after = {
    browsers: treeBytes(browsersPath),
    store: treeBytes(storePath),
  }
  console.log(
    `[vrt] Tool cache pruned: pnpm store ${formatGib(before.store)} -> ${formatGib(after.store)} GiB, browsers ${formatGib(before.browsers)} -> ${formatGib(after.browsers)} GiB` +
      (removed.length
        ? ` (removed ${removed.join(", ")}).`
        : "."),
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
