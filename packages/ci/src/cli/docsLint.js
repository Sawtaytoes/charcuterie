#!/usr/bin/env node
import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { lintDecisionRecords } from "../docsLint.js"

const run = promisify(execFile)

/**
 * Lints decision records. With no arguments it lints only what CHANGED against
 * a base ref, which is the mode CI uses — see the note in `docsLint.js` for why
 * linting the whole tree is the wrong default.
 *
 *   charcuterie-docs-lint                      # changed vs origin/HEAD
 *   charcuterie-docs-lint --base <ref>         # changed vs <ref>
 *   charcuterie-docs-lint --all                # every record (migration aid)
 *   charcuterie-docs-lint path/to/record.md    # exactly these files
 */
const main = async () => {
  const args = process.argv.slice(2)

  // Walk the arguments rather than filtering them. A plain `args.filter(a =>
  // !a.startsWith("-"))` swallows the VALUE of `--base` as though it were a
  // file to lint, so `--base <sha>` tried to open `<sha>` and every CI run
  // would have died with ENOENT.
  /** @type {string[]} */
  const explicitPaths = []
  let isAll = false
  /** @type {string | null} */
  let base = null

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === "--all") {
      isAll = true
    } else if (arg === "--base") {
      index += 1
      base = args[index] ?? null

      if (base === null) {
        console.error(
          "charcuterie-docs-lint: --base needs a ref.",
        )
        process.exitCode = 1
        return
      }
    } else if (arg.startsWith("-")) {
      console.error(
        `charcuterie-docs-lint: unknown option \`${arg}\`.`,
      )
      process.exitCode = 1
      return
    } else {
      explicitPaths.push(arg)
    }
  }

  /** @type {string[]} */
  let filePaths

  if (explicitPaths.length > 0) {
    filePaths = explicitPaths
  } else if (isAll) {
    const { stdout } = await run("git", [
      "ls-files",
      "docs/decisions/*.md",
    ])
    filePaths = stdout.split("\n").filter(Boolean)
  } else {
    // Fails SAFE in the opposite direction from the docs-only detector: if we
    // cannot work out what changed, lint NOTHING rather than the whole tree.
    // A false failure on settled history would train people to ignore this.
    const baseRef = base ?? "origin/HEAD"
    const { stdout } = await run("git", [
      "diff",
      "--name-only",
      "--diff-filter=d",
      `${baseRef}...HEAD`,
    ]).catch(() => ({ stdout: "" }))

    filePaths = stdout
      .split("\n")
      .filter((p) =>
        /(^|\/)docs\/decisions\/[^/]+\.md$/.test(p),
      )
  }

  if (filePaths.length === 0) {
    console.log(
      "charcuterie-docs-lint: no decision records to check.",
    )
    return
  }

  const problems = await lintDecisionRecords(filePaths)

  if (problems.length === 0) {
    console.log(
      `charcuterie-docs-lint: ${filePaths.length} record(s) checked, all good.`,
    )
    return
  }

  for (const problem of problems) {
    console.error(
      `${problem.filePath}: [${problem.rule}] ${problem.message}`,
    )
  }

  console.error(
    `\ncharcuterie-docs-lint: ${problems.length} problem(s) in ${filePaths.length} record(s).`,
  )

  process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
