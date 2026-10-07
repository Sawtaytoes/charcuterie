#!/usr/bin/env node
/**
 * Select a complete published baseline only from reviewed branch history.
 *
 * The reviewed branch is the branch the change lands on: a pull request's
 * BASE branch, the branch a push updated, and otherwise the repository's
 * default branch. A caller whose pull requests target a long-lived branch
 * other than the default (an engine fork whose default branch is a stale
 * ancestor of its integration branches) keeps its baselines on that branch.
 */
import { execFileSync } from "node:child_process"
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { buildRegConfig } from "./writeRegConfig.js"

const require = createRequire(import.meta.url)
export const MISSING_REPORT = Symbol(
  "missing published report",
)
// `rev-list --first-parent` prints 41 bytes per commit, so Node's default
// 1 MiB buffer ends at about 25,000 commits and the call dies with ENOBUFS.
// A long-lived engine fork with 31,000+ first-parent commits passes that.
export const GIT_MAX_BUFFER = 1024 * 1024 * 1024
const git = (cwd, ...args) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: GIT_MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()

/** The branch whose first-parent history holds reviewed baselines. */
export const resolveReviewedBranch = (
  event = {},
  defaultBranch,
) => {
  const baseRef = event?.pull_request?.base?.ref
  if (typeof baseRef === "string" && baseRef) return baseRef
  if (
    typeof event?.ref === "string" &&
    event.ref.startsWith("refs/heads/") &&
    event.ref.length > "refs/heads/".length
  )
    return event.ref.slice("refs/heads/".length)
  return defaultBranch
}

/** List the entire authenticated prefix; a listing failure never means missing. */
export const listPublishedObjects = async (
  publisher,
  prefix,
) => {
  const keys = new Set()
  const markers = new Set()
  let marker
  do {
    const page = await publisher.listItems(marker, prefix)
    if (
      !Array.isArray(page.contents) ||
      typeof page.isTruncated !== "boolean"
    )
      throw new Error("Invalid S3 listing metadata")
    for (const item of page.contents) {
      if (
        typeof item.key !== "string" ||
        !item.key.startsWith(prefix)
      ) {
        throw new Error("Invalid S3 object metadata")
      }
      keys.add(item.key)
    }
    if (!page.isTruncated) break
    marker = page.nextMarker
    if (
      typeof marker !== "string" ||
      !marker ||
      markers.has(marker)
    )
      throw new Error("Invalid S3 pagination metadata")
    markers.add(marker)
  } while (marker !== undefined)
  return keys
}

/** Validate reg-cli's raw paths, including its encoded report-item representation. */
export const actualPathsFromReport = (report) => {
  const paths = new Set()
  for (const group of [
    "newItems",
    "passedItems",
    "failedItems",
    "deletedItems",
  ]) {
    if (!Array.isArray(report?.[group]))
      throw new Error(`Invalid published report ${group}`)
    for (const item of report[group]) {
      const path =
        typeof item === "string" ? item : item?.raw
      if (
        typeof path !== "string" ||
        !path.endsWith(".png") ||
        path.includes("\\") ||
        path.startsWith("/") ||
        path
          .split("/")
          .some(
            (part) =>
              !part || part === "." || part === "..",
          )
      ) {
        throw new Error(
          "Invalid published report image path",
        )
      }
      if (group !== "deletedItems") {
        if (paths.has(path))
          throw new Error(
            "Duplicate published report image path",
          )
        paths.add(path)
      }
    }
  }
  if (!paths.size)
    throw new Error(
      "Published report contains no actual PNGs",
    )
  return paths
}

/** Reports are uploaded in parallel chunks; HTML alone is not a completion marker. */
export const isCompleteSnapshot = async (
  publisher,
  key,
  readReport,
) => {
  const prefix = `${publisher.resolveInBucket(key)}/`
  const objects = await listPublishedObjects(
    publisher,
    prefix,
  )
  if (
    !objects.has(`${prefix}index.html`) ||
    !objects.has(`${prefix}out.json`)
  )
    return false
  const report = await readReport(`${prefix}out.json`)
  if (report === MISSING_REPORT) return false
  const paths = actualPathsFromReport(report)
  const actualObjects = [...objects].filter(
    (path) =>
      path.startsWith(`${prefix}actual/`) &&
      path.endsWith(".png"),
  )
  return (
    actualObjects.length === paths.size &&
    [...paths].every((path) =>
      objects.has(`${prefix}actual/${path}`),
    )
  )
}

/** A reviewed-branch-only clone has no branch intersection; use its reviewed predecessor. */
export const deriveReviewedBase = (
  cwd,
  reviewedBranch,
  actualKey,
  event = {},
) => {
  if (
    event.pull_request?.base?.ref === reviewedBranch &&
    event.pull_request.base.sha
  ) {
    return event.pull_request.base.sha
  }
  if (
    event.ref === `refs/heads/${reviewedBranch}` &&
    event.before &&
    !/^0+$/.test(event.before)
  ) {
    return event.before
  }
  const reviewedRef = `refs/remotes/origin/${reviewedBranch}`
  const reviewedHistory = new Set(
    git(
      cwd,
      "rev-list",
      "--first-parent",
      reviewedRef,
    ).split("\n"),
  )
  if (reviewedHistory.has(actualKey)) {
    return (
      git(
        cwd,
        "rev-list",
        "--parents",
        "-n",
        "1",
        actualKey,
      ).split(" ")[1] ?? null
    )
  }
  return git(cwd, "merge-base", actualKey, reviewedRef)
}

/** Walk only first parents after validating the plugin base and reviewed predecessor. */
export const selectPublishedBaseline = async ({
  cwd,
  defaultBranch,
  baseKey,
  actualKey,
  publisher,
  readReport,
  event,
}) => {
  const reviewedBranch = resolveReviewedBranch(
    event,
    defaultBranch,
  )
  const reviewedRef = `refs/remotes/origin/${reviewedBranch}`
  if (!reviewedBranch || !/^[0-9a-f]{40}$/.test(actualKey))
    throw new Error(
      "Missing valid reviewed branch or actual snapshot key",
    )
  git(
    cwd,
    "rev-parse",
    "--verify",
    `${reviewedRef}^{commit}`,
  )
  const reviewedHistory = new Set(
    git(
      cwd,
      "rev-list",
      "--first-parent",
      reviewedRef,
    ).split("\n"),
  )
  const validateBase = (key) => {
    if (key === actualKey)
      throw new Error(
        "Selected baseline cannot equal actual snapshot key",
      )
    if (!/^[0-9a-f]{40}$/.test(key))
      throw new Error("Invalid selected Git baseline key")
    git(
      cwd,
      "merge-base",
      "--is-ancestor",
      key,
      reviewedRef,
    )
    git(cwd, "merge-base", "--is-ancestor", key, actualKey)
  }
  // Preserve a reviewed first-parent plugin base, including older release bases.
  // A normal merge may instead intersect its feature second parent. Validate that
  // original candidate before deriving a default predecessor; never inspect its store.
  if (baseKey != null) validateBase(baseKey)
  if (baseKey == null || !reviewedHistory.has(baseKey))
    baseKey = deriveReviewedBase(
      cwd,
      reviewedBranch,
      actualKey,
      event,
    )
  if (baseKey != null) {
    validateBase(baseKey)
    if (!reviewedHistory.has(baseKey))
      throw new Error(
        `Selected baseline is outside ${reviewedBranch}'s first-parent history`,
      )
    for (const key of git(
      cwd,
      "rev-list",
      "--first-parent",
      baseKey,
    ).split("\n")) {
      if (
        await isCompleteSnapshot(publisher, key, readReport)
      ) {
        return {
          actualKey,
          expectedKey: key,
          baseKey,
          isInitialBaseline: false,
        }
      }
    }
  }
  // An old release intersection can predate every stored snapshot. Preserve
  // it when published, but otherwise search the reviewed current predecessor.
  const reviewedBase = deriveReviewedBase(
    cwd,
    reviewedBranch,
    actualKey,
    event,
  )
  if (reviewedBase != null && reviewedBase !== baseKey) {
    validateBase(reviewedBase)
    if (!reviewedHistory.has(reviewedBase))
      throw new Error(
        `Reviewed predecessor is outside ${reviewedBranch}'s first-parent history`,
      )
    for (const key of git(
      cwd,
      "rev-list",
      "--first-parent",
      reviewedBase,
    ).split("\n")) {
      if (
        await isCompleteSnapshot(publisher, key, readReport)
      ) {
        return {
          actualKey,
          expectedKey: key,
          baseKey: reviewedBase,
          isInitialBaseline: false,
        }
      }
    }
  }
  const bucketObjects = await listPublishedObjects(
    publisher,
    "",
  )
  if (bucketObjects.size === 0) {
    return {
      actualKey,
      expectedKey: null,
      baseKey,
      isInitialBaseline: true,
    }
  }
  throw new Error(
    `No complete published ancestor on ${reviewedBranch}. The bucket is not empty; a feature snapshot cannot bootstrap a reviewed baseline. Publish the initial baseline from the reviewed branch in an empty per-repository bucket before opening visual PRs.`,
  )
}

/** Reuse the pinned publisher's authenticated listing and gzip-aware download API. */
export const createPublishedStore = (
  config,
  directory,
  dependencyRoot,
) => {
  const scopedRequire = dependencyRoot
    ? createRequire(resolve(dependencyRoot, "package.json"))
    : require
  const publisher = scopedRequire("reg-publish-s3-plugin")()
    .publisher
  const logger = {
    verbose() {},
    getProgressBar: () => ({
      start() {},
      increment() {},
      stop() {},
    }),
  }
  publisher.init({
    options: config.plugins["reg-publish-s3-plugin"],
    workingDirs: { base: directory },
    logger,
    noEmit: false,
  })
  const readReport = async (remotePath) => {
    const absPath = join(directory, "published-report.json")
    try {
      await publisher.downloadItem(
        { remotePath },
        { absPath, path: "published-report.json" },
      )
    } catch (error) {
      if (
        error?.name === "NoSuchKey" &&
        error?.$metadata?.httpStatusCode === 404
      )
        return MISSING_REPORT
      throw error
    }
    return JSON.parse(await readFile(absPath, "utf8"))
  }
  return { publisher, readReport }
}

const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
if (isMain) {
  let directory
  try {
    const event = JSON.parse(
      await readFile(process.env.GITHUB_EVENT_PATH, "utf8"),
    )
    const defaultBranch = event.repository?.default_branch
    const dependencyRoot = process.env.VRT_DEPENDENCY_ROOT
    const scopedRequire = dependencyRoot
      ? createRequire(
          resolve(dependencyRoot, "package.json"),
        )
      : require
    const { CommitExplorer } = scopedRequire(
      "reg-keygen-git-hash-plugin/lib/commit-explorer.js",
    )
    const explorer = new CommitExplorer()
    // These are the same two methods the pinned plugin calls, in the same order.
    // Call directly: reg-suit would otherwise turn key-generation errors into null.
    const baseKey = explorer.getBaseCommitHash()
    const actualKey = explorer.getCurrentCommitHash()
    directory = await mkdtemp(
      join(tmpdir(), "vrt-published-baseline-"),
    )
    const config = buildRegConfig(process.env)
    const store = createPublishedStore(
      config,
      directory,
      dependencyRoot,
    )
    const selection = await selectPublishedBaseline({
      cwd: process.cwd(),
      defaultBranch,
      baseKey,
      actualKey,
      ...store,
      event,
    })
    if (!process.env.VRT_BASELINE_FILE)
      throw new Error("VRT_BASELINE_FILE is required")
    await writeFile(
      process.env.VRT_BASELINE_FILE,
      `${JSON.stringify(selection, null, 2)}\n`,
    )
    console.log(
      selection.isInitialBaseline
        ? "[vrt] Explicit initial-baseline mode: authenticated per-repository bucket is empty."
        : `[vrt] Published baseline ${selection.expectedKey} (selected Git base ${selection.baseKey}).`,
    )
  } catch (error) {
    console.error(
      `[vrt] baseline preflight failed: ${error instanceof Error ? error.message : error}`,
    )
    process.exitCode = 1
  } finally {
    if (directory)
      await rm(directory, { recursive: true, force: true })
  }
}
