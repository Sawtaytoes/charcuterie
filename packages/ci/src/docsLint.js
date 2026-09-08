import { readFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"

/**
 * Every repo in this fleet keeps its paper trail in `docs/decisions/`, and the
 * shape is written down in AGENTS.md: one decision per file, named
 * `YYYY-MM-DD-<kebab-slug>.md`, an ADR-lite header, then the four sections.
 *
 * The shape was followed by hand, so it drifted. Measured across agentic's 260
 * records on 2026-09-08: the sections held up (0 missing `## Decision`, 9
 * missing `## Context`), but a quarter were missing header fields and two
 * records had never been added to the index at all — which makes them
 * invisible, because the index is what gets read.
 *
 * ⚠️ Lint CHANGED FILES, not the whole tree. Roughly 25% of existing records
 * predate the header convention. A linter that fails on them would either be
 * switched off or force a 60-file rewrite of settled history, and a decision
 * record is not supposed to be edited after the fact.
 */

/** @type {readonly string[]} */
const requiredHeaderFields = ["Status", "Date", "Type", "Supersedes", "Superseded by"]

/** @type {readonly string[]} */
const requiredSections = ["Decision", "Context", "Why", "Evidence"]

const fileNamePattern = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/

/**
 * `- **Status:** Accepted` is the documented form. Some early records used a
 * bare `Status: Accepted`, so both are accepted here — the point is that the
 * field is present and findable, not that it is bold.
 *
 * @param {string} field
 * @returns {RegExp}
 */
const headerFieldPattern = (
  field,
) => (
  new RegExp(
    `^-?\\s*(?:\\*\\*)?${field.replace(" ", "\\s+")}:(?:\\*\\*)?\\s*(\\S.*)$`,
    "im",
  )
)

/**
 * @param {string} filePath
 * @param {string} contents
 * @param {string | null} indexContents
 * @returns {{ filePath: string, rule: string, message: string }[]}
 */
export const lintDecisionRecord = (
  filePath,
  contents,
  indexContents,
) => {
  const fileName = basename(filePath)
  /** @type {{ filePath: string, rule: string, message: string }[]} */
  const problems = []

  const fail = (
    /** @type {string} */ rule,
    /** @type {string} */ message,
  ) => {
    problems.push({ filePath, rule, message })
  }

  if (fileName === "README.md") {
    return problems
  }

  const nameMatch = fileNamePattern.exec(fileName)

  if (!nameMatch) {
    fail(
      "file-name",
      "Name the file `YYYY-MM-DD-<kebab-slug>.md`. The date is how the index sorts, and the slug is what a reader greps for.",
    )
  }

  if (!contents.startsWith("# ")) {
    fail(
      "title",
      "Start with a single `# ` title on the first line. It is what the index links to.",
    )
  }

  for (const field of requiredHeaderFields) {
    if (!headerFieldPattern(field).test(contents)) {
      fail(
        "header-field",
        `Missing the \`${field}:\` header field. \`Supersedes\`/\`Superseded by\` carry an em dash when empty — the point is that a later reader can see nothing replaced this.`,
      )
    }
  }

  const dateMatch = headerFieldPattern("Date").exec(contents)

  if (
    nameMatch
    && dateMatch
    && dateMatch[1].trim() !== nameMatch[1]
  ) {
    fail(
      "date-mismatch",
      `The header says \`${dateMatch[1].trim()}\` but the file name says \`${nameMatch[1]}\`. They are read by different people and must agree.`,
    )
  }

  for (const section of requiredSections) {
    if (
      !new RegExp(`^##\\s+${section}\\b`, "m")
        .test(contents)
    ) {
      fail(
        "section",
        `Missing the \`## ${section}\` section. \`Evidence\` is the one that keeps getting dropped, and it is the one that stops a future agent re-litigating a settled call.`,
      )
    }
  }

  if (
    indexContents !== null
    && !indexContents.includes(fileName)
  ) {
    fail(
      "not-indexed",
      "Add a row for this record to `docs/decisions/README.md`. An unindexed record is invisible: the index is what gets read.",
    )
  }

  return problems
}

/**
 * @param {string[]} filePaths
 * @returns {Promise<{ filePath: string, rule: string, message: string }[]>}
 */
export const lintDecisionRecords = async (
  filePaths,
) => {
  /** @type {Map<string, string | null>} */
  const indexCache = new Map()

  /** @type {{ filePath: string, rule: string, message: string }[]} */
  const problems = []

  for (const filePath of filePaths) {
    const indexPath = join(dirname(filePath), "README.md")

    if (!indexCache.has(indexPath)) {
      indexCache.set(
        indexPath,
        await readFile(indexPath, "utf8")
          .catch(() => null),
      )
    }

    problems.push(
      ...lintDecisionRecord(
        filePath,
        await readFile(filePath, "utf8"),
        indexCache.get(indexPath) ?? null,
      ),
    )
  }

  return problems
}
