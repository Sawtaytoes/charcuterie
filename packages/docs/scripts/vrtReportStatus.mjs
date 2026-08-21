/**
 * Post the reg-suit result back to GitHub as a commit status + a PR
 * comment, reading `.reg/out.json` (reg-cli's machine output).
 *
 * We deliberately do NOT use `reg-notify-github-plugin`: that plugin
 * routes through reg-suit's hosted third-party GitHub App, which
 * would hand a non-fleet service write access to the repo. Since the
 * VRT job runs on our own LAN runner with the workflow `GITHUB_TOKEN`
 * already in scope, a dozen lines of REST is both simpler and keeps
 * the trust boundary inside the fleet.
 *
 * Env (all provided by the workflow):
 *   GITHUB_TOKEN          repo-scoped token
 *   GITHUB_REPOSITORY     owner/repo
 *   VRT_STATUS_SHA        commit the status attaches to (PR head sha)
 *   VRT_PR_NUMBER         PR number (empty on push builds)
 *   VRT_REPORT_URL        report URL reg-suit emitted (preferred)
 *   VRT_REPORT_KEY        S3 key the report was published under (fallback)
 *   VRT_REPORT_BASE_URL   default https://garage.octen.dev (fallback)
 *   VRT_STATUS_CONTEXT    default vrt/charcuterie
 *
 * Exits non-zero when a story changed against its baseline **on a pull
 * request**, so the job goes red on a regression while there is still
 * something to decide (reg-suit's own `run` exits 0 on diffs). A push
 * build reports the same numbers and stays green: reg-keygen resolves
 * both the PR and the merged commit to the same baseline — the last
 * release commit, since `changeset-release/master` is the only
 * long-lived branch off master — so the push re-reports a diff that
 * was already reviewed, and merging it *was* the approval. Failing
 * there reds master for every intentional visual change with nothing
 * left to act on.
 */

import { readFile } from "node:fs/promises"

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  VRT_STATUS_SHA,
  VRT_PR_NUMBER,
  VRT_REPORT_URL,
  VRT_REPORT_KEY,
  VRT_REPORT_BASE_URL = "https://garage.octen.dev",
  VRT_STATUS_CONTEXT = "vrt/charcuterie",
} = process.env

const COMMENT_MARKER = "<!-- vrt-charcuterie-report -->"

const readResult = async () => {
  try {
    return JSON.parse(
      await readFile(".reg/out.json", "utf8"),
    )
  } catch {
    return {}
  }
}

const api = async (path, method, body) => {
  const response = await fetch(
    `https://api.github.com${path}`,
    {
      body: body == null ? undefined : JSON.stringify(body),
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${GITHUB_TOKEN}`,
        "x-github-api-version": "2022-11-28",
      },
      method,
    },
  )

  if (!response.ok) {
    console.error(
      `[vrt] GitHub ${method} ${path} -> ${response.status}: ${await response.text()}`,
    )
  }

  return response
}

const result = await readResult()
const count = (key) =>
  Array.isArray(result[key]) ? result[key].length : 0

const changed = count("failedItems")
const added = count("newItems")
const deleted = count("deletedItems")
const passed = count("passedItems")

// `failedItems` = a story whose pixels moved against its baseline —
// that's the regression signal, so it drives a red check on a PR.
// New/deleted baselines (a story added or removed) are expected churn
// → green. A push build never gates: see the header.
const isPullRequest = Boolean(VRT_PR_NUMBER)
const isRegression = changed > 0 && isPullRequest
const state = isRegression ? "failure" : "success"
const summary = `${changed} changed · ${added} new · ${deleted} deleted · ${passed} unchanged`

const reportUrl =
  VRT_REPORT_URL ||
  `${VRT_REPORT_BASE_URL.replace(/\/$/, "")}/${VRT_REPORT_KEY}/index.html`

if (GITHUB_REPOSITORY && VRT_STATUS_SHA) {
  await api(
    `/repos/${GITHUB_REPOSITORY}/statuses/${VRT_STATUS_SHA}`,
    "POST",
    {
      context: VRT_STATUS_CONTEXT,
      description: summary.slice(0, 140),
      state,
      target_url: reportUrl,
    },
  )
  console.log(
    changed > 0 && !isPullRequest
      ? `[vrt] status ${state}: ${summary} — push build, recorded not gated (${reportUrl})`
      : `[vrt] status ${state}: ${summary}`,
  )
}

if (GITHUB_REPOSITORY && VRT_PR_NUMBER) {
  const verdict =
    changed > 0
      ? `⚠️ **${changed}** stor${changed === 1 ? "y" : "ies"} changed visually.`
      : added > 0 || deleted > 0
        ? `✅ No regressions — baseline churn only.`
        : `✅ No visual changes.`

  const body =
    `${COMMENT_MARKER}\n### Visual regression — charcuterie\n\n${verdict}\n\n` +
    `| changed | new | deleted | unchanged |\n|--:|--:|--:|--:|\n` +
    `| ${changed} | ${added} | ${deleted} | ${passed} |\n\n` +
    `[📊 Open the full diff report](${reportUrl})\n`

  // Upsert: one comment per PR, edited in place, so re-runs don't spam.
  const existing = await (
    await api(
      `/repos/${GITHUB_REPOSITORY}/issues/${VRT_PR_NUMBER}/comments?per_page=100`,
      "GET",
    )
  ).json()

  const mine = Array.isArray(existing)
    ? existing.find((comment) =>
        comment.body?.includes(COMMENT_MARKER),
      )
    : undefined

  if (mine) {
    await api(
      `/repos/${GITHUB_REPOSITORY}/issues/comments/${mine.id}`,
      "PATCH",
      { body },
    )
  } else {
    await api(
      `/repos/${GITHUB_REPOSITORY}/issues/${VRT_PR_NUMBER}/comments`,
      "POST",
      { body },
    )
  }

  console.log(`[vrt] PR #${VRT_PR_NUMBER} comment posted`)
}

// Red job on a real regression; green on clean/baseline-churn, and on
// every push build — master has no reviewer left to show a diff to.
process.exitCode = isRegression ? 1 : 0
