#!/usr/bin/env node
/**
 * Post the reg-suit verdict back as a commit status and one PR comment, on
 * GitHub or on Forgejo, and exit non-zero on a real regression.
 *
 * Generalized from `packages/docs/scripts/vrtReportStatus.mjs`. Like that
 * script it does NOT use `reg-notify-github-plugin`: the plugin routes
 * through reg-suit's hosted third-party GitHub App, which would hand a
 * service outside the fleet write access to the repo. The job already holds
 * a repo-scoped token, and a dozen lines of REST keep the trust boundary
 * inside the fleet.
 *
 * Both hosts are served by the same code. Forgejo's API is Gitea-compatible
 * under `/api/v1`, and the four calls used here — create a status, list,
 * create and edit an issue comment — have the same paths and bodies there.
 * The host is read from `GITHUB_API_URL`, which both set.
 *
 * Environment (all provided by `shared-vrt.yml`):
 *   GITHUB_API_URL        API root; GitHub's or Forgejo's `/api/v1`
 *   GITHUB_SERVER_URL     web root, used only for the log line
 *   GITHUB_REPOSITORY     owner/repo
 *   VRT_STATUS_TOKEN      optional token that overrides GITHUB_TOKEN
 *   GITHUB_TOKEN          the job's automatic token
 *   VRT_STATUS_SHA        the commit the status attaches to (PR head)
 *   VRT_PR_NUMBER         PR number; empty on a push build
 *   VRT_STATUS_CONTEXT    status context (default `vrt`)
 *   VRT_REG_OUTPUT        file holding reg-suit's console output, read for
 *                         the report URL and the snapshot key
 *   VRT_REPORT_URL        report URL, when already known
 *   VRT_REPORT_KEY        snapshot key, the fallback for building the URL
 *   VRT_REPORT_BASE_URL   report host the key is joined onto
 *   VRT_WORKING_DIR       reg-suit's working directory (default .reg)
 *
 * The exit code, and why a push build never fails: reg-keygen resolves a
 * pull request and the commit it merges as to the SAME baseline, so the push
 * build re-reports a diff that was already reviewed on the pull request, and
 * merging it was the approval. Failing there would turn the default branch
 * red for every intended visual change with nothing left to act on.
 */

import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { DEFAULT_WORKING_DIR } from "./writeRegConfig.js"

export const DEFAULT_STATUS_CONTEXT = "vrt"

/**
 * @typedef {{
 *   kind: "github" | "forgejo",
 *   apiUrl: string,
 *   authorization: string,
 * }} Host
 */

/**
 * Which host the job runs on, and how to talk to it.
 *
 * GitHub sets `GITHUB_API_URL` to `https://api.github.com` (or
 * `<server>/api/v3` on Enterprise). Forgejo sets it to `<server>/api/v1`,
 * and also sets `FORGEJO_SERVER_URL` — both verified inside a Forgejo 16
 * Actions job on 2026-09-25.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ kind: "github" | "forgejo", apiUrl: string }}
 */
export const detectHost = (env) => {
  const apiUrl = (env.GITHUB_API_URL ?? "").replace(
    /\/+$/,
    "",
  )
  const isForgejo =
    /\/api\/v1$/.test(apiUrl) ||
    Boolean(env.FORGEJO_SERVER_URL) ||
    env.GITEA_ACTIONS === "true" ||
    env.FORGEJO_ACTIONS === "true"

  if (isForgejo) {
    const serverUrl = (
      env.GITHUB_SERVER_URL ??
      env.FORGEJO_SERVER_URL ??
      ""
    ).replace(/\/+$/, "")

    return {
      apiUrl: apiUrl || `${serverUrl}/api/v1`,
      kind: "forgejo",
    }
  }

  return {
    apiUrl: apiUrl || "https://api.github.com",
    kind: "github",
  }
}

/**
 * @param {"github" | "forgejo"} kind
 * @param {string} token
 * @returns {Record<string, string>}
 */
export const requestHeaders = (kind, token) =>
  kind === "github"
    ? {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      }
    : {
        accept: "application/json",
        // Forgejo also accepts `Bearer`, but `token` is its documented
        // scheme for an access token and the one every Forgejo client uses.
        authorization: `token ${token}`,
        "content-type": "application/json",
      }

/**
 * Pull the snapshot key and report URL out of reg-suit's console output.
 * reg-suit prints both and writes neither to a file.
 *
 * @param {string} text
 * @returns {{ key: string | null, url: string | null }}
 */
export const parseRegSuitOutput = (text) => {
  // ANSI color codes, in case the logger colored its output. Built from a
  // string so the escape character is not a literal in a regex.
  const plain = text.replace(
    new RegExp(
      `${String.fromCharCode(27)}\\[[0-9;]*m`,
      "g",
    ),
    "",
  )
  const keys = [
    ...plain.matchAll(
      /current snapshot key: '([0-9A-Za-z._-]+)'/g,
    ),
  ]
  const urls = [...plain.matchAll(/Report URL: (\S+)/g)]

  return {
    key: keys.at(-1)?.[1] ?? null,
    url: urls.at(-1)?.[1] ?? null,
  }
}

/**
 * The report's address. reg-suit's own URL wins; otherwise the snapshot key
 * is joined onto the report host, which is how the bucket lays reports out.
 *
 * @param {{ reportUrl?: string | null, baseUrl?: string | null, key?: string | null }} parts
 * @returns {string | null}
 */
export const buildReportUrl = ({
  reportUrl,
  baseUrl,
  key,
}) => {
  if (reportUrl) {
    return reportUrl
  }

  if (baseUrl && key) {
    return `${baseUrl.replace(/\/+$/, "")}/${key}/index.html`
  }

  return null
}

/**
 * @param {Record<string, unknown>} result reg-cli's `out.json`
 */
export const countResult = (result) => {
  /** @param {string} key */
  const count = (key) => {
    const items = result[key]

    return Array.isArray(items) ? items.length : 0
  }

  return {
    added: count("newItems"),
    changed: count("failedItems"),
    deleted: count("deletedItems"),
    passed: count("passedItems"),
  }
}

/**
 * `failedItems` — a shot whose pixels moved against its baseline — is the
 * regression signal, and only on a pull request. New and deleted shots are
 * a story added or removed: expected churn, not a failure.
 *
 * @param {{ changed: number }} counts
 * @param {boolean} isPullRequest
 */
export const decideVerdict = (counts, isPullRequest) => {
  const isRegression = counts.changed > 0 && isPullRequest

  return {
    isRegression,
    state: /** @type {"failure" | "success"} */ (
      isRegression ? "failure" : "success"
    ),
  }
}

/**
 * @param {{ added: number, changed: number, deleted: number, passed: number }} counts
 */
export const summarize = ({
  added,
  changed,
  deleted,
  passed,
}) =>
  `${changed} changed · ${added} new · ${deleted} deleted · ${passed} unchanged`

/**
 * One marker per status context, so a repo with two VRT jobs keeps two
 * comments instead of the second editing the first.
 *
 * @param {string} context
 */
export const commentMarker = (context) =>
  `<!-- shared-vrt-report:${context} -->`

/**
 * @param {{
 *   context: string,
 *   counts: { added: number, changed: number, deleted: number, passed: number },
 *   reportUrl: string | null,
 *   repository: string,
 * }} options
 */
export const buildComment = ({
  context,
  counts,
  reportUrl,
  repository,
}) => {
  const { added, changed, deleted, passed } = counts
  const verdict =
    changed > 0
      ? `⚠️ **${changed}** shot${changed === 1 ? "" : "s"} changed visually. Open the report and compare each one before this merges.`
      : added > 0 || deleted > 0
        ? "✅ No regressions — baseline churn only."
        : "✅ No visual changes."

  const link =
    reportUrl == null
      ? "The report URL could not be determined; see the job log."
      : `[Open the full diff report](${reportUrl})`

  return (
    `${commentMarker(context)}\n` +
    `### Visual regression — ${repository.split("/").at(-1)} (\`${context}\`)\n\n` +
    `${verdict}\n\n` +
    "| changed | new | deleted | unchanged |\n|--:|--:|--:|--:|\n" +
    `| ${changed} | ${added} | ${deleted} | ${passed} |\n\n` +
    `${link}\n`
  )
}

/**
 * @param {string} path
 */
const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch {
    return null
  }
}

/**
 * @param {string} path
 */
const readText = async (path) => {
  try {
    return await readFile(path, "utf8")
  } catch {
    return ""
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<number>} the exit code
 */
export const reportStatus = async (env) => {
  const context =
    env.VRT_STATUS_CONTEXT || DEFAULT_STATUS_CONTEXT
  const repository = env.GITHUB_REPOSITORY ?? ""
  const token =
    env.VRT_STATUS_TOKEN || env.GITHUB_TOKEN || ""
  const { apiUrl, kind } = detectHost(env)
  const headers = requestHeaders(kind, token)

  const workingDir =
    env.VRT_WORKING_DIR || DEFAULT_WORKING_DIR
  const result = await readJson(
    join(workingDir, "out.json"),
  )
  const parsed = parseRegSuitOutput(
    env.VRT_REG_OUTPUT
      ? await readText(env.VRT_REG_OUTPUT)
      : "",
  )

  const reportUrl = buildReportUrl({
    baseUrl: env.VRT_REPORT_BASE_URL,
    key: env.VRT_REPORT_KEY || parsed.key,
    reportUrl: env.VRT_REPORT_URL || parsed.url,
  })

  const isPullRequest = Boolean(env.VRT_PR_NUMBER)

  if (result == null) {
    // No out.json means reg-suit never compared anything. That is a broken
    // run, not a clean one, and it must not post a green status.
    console.error(
      `[vrt] ${join(workingDir, "out.json")} is missing — reg-suit did not complete a comparison.`,
    )

    return 1
  }

  const counts = countResult(result)
  const { isRegression, state } = decideVerdict(
    counts,
    isPullRequest,
  )
  const summary = summarize(counts)

  let hasApiFailure = false

  /**
   * @param {string} path
   * @param {string} method
   * @param {unknown} [body]
   */
  const api = async (path, method, body) => {
    const response = await fetch(`${apiUrl}${path}`, {
      body: body == null ? undefined : JSON.stringify(body),
      headers,
      method,
    })

    if (!response.ok) {
      hasApiFailure = true
      console.error(
        `[vrt] ${kind} ${method} ${path} -> ${response.status}: ${await response.text()}`,
      )
    }

    return response
  }

  if (token === "" || repository === "") {
    console.error(
      "[vrt] No token or repository in the environment; the verdict is printed but not posted.",
    )
    hasApiFailure = true
  } else {
    if (env.VRT_STATUS_SHA) {
      await api(
        `/repos/${repository}/statuses/${env.VRT_STATUS_SHA}`,
        "POST",
        {
          context,
          description: summary.slice(0, 140),
          state,
          ...(reportUrl == null
            ? {}
            : { target_url: reportUrl }),
        },
      )
    }

    if (isPullRequest) {
      const body = buildComment({
        context,
        counts,
        reportUrl,
        repository,
      })
      const marker = commentMarker(context)
      const listing = await api(
        `/repos/${repository}/issues/${env.VRT_PR_NUMBER}/comments?per_page=100&limit=50`,
        "GET",
      )
      const existing = listing.ok
        ? await listing.json()
        : []
      const mine = Array.isArray(existing)
        ? existing.find(
            (/** @type {{ body?: string }} */ comment) =>
              comment.body?.includes(marker),
          )
        : undefined

      await (mine
        ? api(
            `/repos/${repository}/issues/comments/${mine.id}`,
            "PATCH",
            {
              body,
            },
          )
        : api(
            `/repos/${repository}/issues/${env.VRT_PR_NUMBER}/comments`,
            "POST",
            {
              body,
            },
          ))
    }
  }

  console.log(
    `[vrt] ${context} ${state}: ${summary}` +
      (counts.changed > 0 && !isPullRequest
        ? " — push build, recorded and not gated"
        : "") +
      (reportUrl == null ? "" : ` — ${reportUrl}`),
  )

  if (hasApiFailure) {
    // A status that was never posted is a check that silently never
    // appears. Say so with the exit code rather than only in the log.
    console.error(
      "[vrt] Posting the verdict failed; see the errors above.",
    )

    return 1
  }

  return isRegression ? 1 : 0
}

const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)

if (isMain) {
  reportStatus(process.env)
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      console.error(
        `[vrt] ${error instanceof Error ? error.message : error}`,
      )
      process.exitCode = 1
    })
}
