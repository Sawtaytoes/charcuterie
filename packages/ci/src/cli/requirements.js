#!/usr/bin/env node
import { execFile } from "node:child_process"
import { appendFile } from "node:fs/promises"
import { promisify } from "node:util"

import {
  analyzeProject,
  formatProblems,
} from "../requirements/check.js"
import { commandFor } from "../requirements/config.js"
import {
  baseProblems,
  buildLock,
  describeChanges,
  emptyLock,
  formatChangesMarkdown,
  lockProblems,
  readLock,
  writeLock,
} from "../requirements/lock.js"
import {
  traceIndex,
  traceIndexJson,
  traceTarget,
} from "../requirements/trace.js"

const run = promisify(execFile)

/**
 * The lock at `base`. A base commit with no lock file means every
 * requirement is new; anything else that goes wrong — an unknown
 * ref, a malformed lock — is an error, never an empty base, because
 * an empty base would report every requirement as merely "added".
 *
 * @param {string} cwd
 * @param {string} base
 * @param {string} lockFile
 * @returns {Promise<import("../requirements/lock.js").RequirementsLock>}
 */
const readBaseLock = async (cwd, base, lockFile) => {
  const git = (/** @type {string[]} */ args) =>
    run("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 })

  try {
    await git([
      "rev-parse",
      "--verify",
      "--quiet",
      `${base}^{commit}`,
    ])
  } catch {
    throw new Error(
      `--base ${base} is not a commit here. Fetch it first (CI fetches the pull request's base SHA).`,
    )
  }

  try {
    await git(["cat-file", "-e", `${base}:./${lockFile}`])
  } catch {
    return emptyLock()
  }

  const { stdout } = await git([
    "show",
    `${base}:./${lockFile}`,
  ])

  try {
    return JSON.parse(stdout)
  } catch (error) {
    throw new Error(
      `The lock at ${base} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

const usage = `charcuterie-requirements <command> [--root <dir>]

  check                      lint features and steps, and verify the lock (CI runs this)
  lock                       rewrite the lock from the current features and code
  lock --retire <ID> --reason "<why>"
                             retire a removed requirement; its ID is never reused
  which <target>             trace one step to its definition and the code it reaches
                             <target>: file.feature:line, a requirement ID, or step text
  index [--json]             trace every step
  diff [--base <ref>]        list requirements that changed against a git ref
                             (default origin/HEAD), and fail on a requirement or
                             retirement dropped without a trace; --summary appends
                             Markdown to $GITHUB_STEP_SUMMARY`

/**
 * @param {string[]} args
 */
const parseArgs = (args) => {
  /** @type {string[]} */
  const positional = []
  /** @type {Record<string, string | true>} */
  const options = {}
  const takesValue = new Set([
    "--root",
    "--base",
    "--retire",
    "--reason",
  ])

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? ""

    if (takesValue.has(arg)) {
      const value = args[index + 1]

      if (value === undefined) {
        throw new Error(`${arg} needs a value.`)
      }

      options[arg] = value
      index += 1
    } else if (arg.startsWith("--")) {
      options[arg] = true
    } else {
      positional.push(arg)
    }
  }

  return { positional, options }
}

const main = async () => {
  const { positional, options } = parseArgs(
    process.argv.slice(2),
  )
  const [command = "check", ...rest] = positional
  const root =
    typeof options["--root"] === "string"
      ? options["--root"]
      : "."

  if (command === "help" || options["--help"]) {
    console.log(usage)

    return
  }

  const analysis = await analyzeProject(root)
  const locked = await readLock(analysis)

  if (command === "check") {
    const problems = [
      ...analysis.problems,
      ...lockProblems(analysis, locked),
    ]
    const scenarioCount = analysis.documents.reduce(
      (count, document) =>
        count + document.scenarios.length,
      0,
    )

    if (problems.length > 0) {
      console.error(formatProblems(problems))
      console.error(
        `\n${problems.length} problem${problems.length === 1 ? "" : "s"}. Trace any step with \`${commandFor(analysis.project.config, "which")} <file.feature:line>\`.`,
      )
      process.exitCode = 1

      return
    }

    console.log(
      `${scenarioCount} requirement${scenarioCount === 1 ? "" : "s"} checked, ${analysis.sources.definitions.length} step definitions, lock current.`,
    )

    if (analysis.pending.length > 0) {
      console.log(
        `PENDING (not proven): ${analysis.pending
          .map(
            (scenario) =>
              `${scenario.file}:${scenario.line} ${scenario.name}`,
          )
          .join("; ")}`,
      )
    }

    return
  }

  if (command === "lock") {
    const retire = options["--retire"]
    // Taken before --retire edits the lock, so the printed changes
    // include the retirement itself.
    const before = structuredClone(locked)

    if (typeof retire === "string") {
      const reason = options["--reason"]
      const entry = locked.requirements[retire]

      if (typeof reason !== "string" || !reason.trim()) {
        throw new Error('--retire needs --reason "<why>".')
      }

      if (!entry) {
        throw new Error(`${retire} is not in the lock.`)
      }

      locked.retired = {
        ...locked.retired,
        [retire]: { scenario: entry.scenario, reason },
      }
      delete locked.requirements[retire]
    }

    const blocking = [
      ...analysis.problems,
      ...lockProblems(analysis, locked),
    ].filter((problem) => problem.rule !== "stale-lock")

    if (blocking.length > 0) {
      console.error(formatProblems(blocking))
      console.error(
        "\nFix these before locking. A lock records what the requirements prove, so it is only written from a clean check.",
      )
      process.exitCode = 1

      return
    }

    const next = buildLock(analysis, locked)
    const changes = describeChanges(before, next)

    await writeLock(analysis, next)
    console.log(formatChangesMarkdown(changes))

    return
  }

  if (command === "which") {
    const target = rest.join(" ")

    if (!target) {
      throw new Error("which needs a target. See --help.")
    }

    const trace = traceTarget(analysis, target)

    if (trace === null) {
      console.error(`Nothing matches "${target}".`)
      process.exitCode = 1

      return
    }

    console.log(trace)

    return
  }

  if (command === "index") {
    console.log(
      options["--json"]
        ? JSON.stringify(traceIndexJson(analysis), null, 2)
        : traceIndex(analysis),
    )

    return
  }

  if (command === "diff") {
    const base =
      typeof options["--base"] === "string"
        ? options["--base"]
        : "origin/HEAD"
    const before = await readBaseLock(
      analysis.project.root,
      base,
      analysis.project.config.lock,
    )
    const head = buildLock(analysis, locked)
    const problems = baseProblems(
      before,
      head,
      analysis.project.config.lock,
    )

    const markdown = `${formatChangesMarkdown(
      describeChanges(before, head),
    )}${
      problems.length > 0
        ? `\n**Blocking:**\n\n${problems.map((problem) => `- ${problem.rule}: ${problem.message}`).join("\n")}\n`
        : ""
    }`

    console.log(markdown)

    if (
      options["--summary"] &&
      process.env.GITHUB_STEP_SUMMARY
    ) {
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        markdown,
      )
    }

    if (problems.length > 0) {
      console.error(formatProblems(problems))
      process.exitCode = 1
    }

    return
  }

  console.error(usage)
  process.exitCode = 1
}

main().catch((error) => {
  console.error(
    `charcuterie-requirements: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
})
