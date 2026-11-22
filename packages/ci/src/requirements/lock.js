import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { canonicalId } from "./check.js"
import { commandFor } from "./config.js"

/**
 * The lock is the requirement ledger.
 *
 * Plain English does not stop an agent from weakening a test: it can
 * leave every sentence alone and loosen the assertion underneath. So
 * each requirement's entry records both halves — the steps a person
 * reads, and the code each step reaches, down to the helper that
 * asserts and the story that supplies the fixture. Change either,
 * and the lock goes stale until someone regenerates it, which puts
 * the change in front of a reviewer as a named requirement ID.
 *
 * A requirement is never deleted from the lock. It is retired, with
 * a reason, and its ID can never be reused.
 *
 * @typedef {{
 *   feature: string,
 *   heading: string,
 *   description: string,
 *   rule?: string,
 *   scenario: string,
 *   status: "active" | "pending",
 *   tags?: string[],
 *   steps: string[],
 *   examples?: string[][],
 *   code: string[],
 *   digest?: string,
 * }} LockedRequirement
 *
 * @typedef {{
 *   version: 1,
 *   requirements: Record<string, LockedRequirement>,
 *   code: Record<string, string>,
 *   retired: Record<string, { scenario: string, reason: string }>,
 * }} RequirementsLock
 *
 * @typedef {import("./check.js").Analysis} Analysis
 */

/** @returns {RequirementsLock} */
export const emptyLock = () => ({
  version: 1,
  requirements: {},
  code: {},
  retired: {},
})

/**
 * @param {Analysis} analysis
 * @returns {Promise<RequirementsLock>}
 */
export const readLock = async (analysis) => {
  const file = join(
    analysis.project.root,
    analysis.project.config.lock,
  )
  /** @type {string} */
  let text

  try {
    text = await readFile(file, "utf8")
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return emptyLock()
    }

    throw error
  }

  return parseLock(text, analysis.project.config.lock)
}

/**
 * A lock edited by hand into another shape must fail loudly, not
 * read as "nothing locked": `{}` or a `null` tombstone would
 * otherwise pass every comparison.
 *
 * @param {string} text
 * @param {string} source where it came from, for the message
 * @returns {RequirementsLock}
 */
export const parseLock = (text, source) => {
  /** @type {unknown} */
  let value

  try {
    value = JSON.parse(text)
  } catch (error) {
    throw new Error(
      `${source} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  /** @type {string[]} */
  const errors = []
  /** @param {unknown} candidate */
  const isRecord = (candidate) =>
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
  /** @param {unknown} candidate */
  const isText = (candidate) =>
    typeof candidate === "string" && candidate.trim() !== ""
  const lock = /** @type {Record<string, unknown>} */ (
    isRecord(value) ? value : {}
  )

  if (lock.version !== 1) {
    errors.push("version must be 1")
  }

  for (const key of ["requirements", "code", "retired"]) {
    if (!isRecord(lock[key])) {
      errors.push(`"${key}" must be an object`)
    }
  }

  for (const [id, entry] of Object.entries(
    isRecord(lock.requirements)
      ? /** @type {Record<string, unknown>} */ (
          lock.requirements
        )
      : {},
  )) {
    const requirement =
      /** @type {Record<string, unknown>} */ (
        isRecord(entry) ? entry : {}
      )

    if (
      !isText(requirement.feature) ||
      !isText(requirement.scenario) ||
      (requirement.status !== "active" &&
        requirement.status !== "pending") ||
      !Array.isArray(requirement.steps) ||
      !Array.isArray(requirement.code)
    ) {
      errors.push(
        `requirement ${id} needs feature, scenario, status, steps, and code`,
      )
    }
  }

  for (const [id, entry] of Object.entries(
    isRecord(lock.retired)
      ? /** @type {Record<string, unknown>} */ (
          lock.retired
        )
      : {},
  )) {
    const retired = /** @type {Record<string, unknown>} */ (
      isRecord(entry) ? entry : {}
    )

    if (
      !isText(retired.scenario) ||
      !isText(retired.reason)
    ) {
      errors.push(
        `retired ${id} needs a scenario and a reason`,
      )
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${source} is malformed: ${errors.join("; ")}. Restore it from git; only the lock command writes it.`,
    )
  }

  return /** @type {RequirementsLock} */ (value)
}

/**
 * The lock the current tree implies. `retired` is carried over from
 * the existing lock, because nothing in the tree can produce it.
 *
 * @param {Analysis} analysis
 * @param {RequirementsLock} previous
 * @returns {RequirementsLock}
 */
export const buildLock = (analysis, previous) => {
  const pendingTags = new Set(
    analysis.project.config.pendingTags,
  )
  /** @type {RequirementsLock["requirements"]} */
  const requirements = {}
  /** @type {Set<string>} */
  const reachedCode = new Set()

  for (const document of analysis.documents) {
    for (const scenario of document.scenarios) {
      const idTag = scenario.ownTags.find((tag) =>
        analysis.idPattern.test(tag.name),
      )

      if (!idTag) {
        continue
      }

      /** @type {Set<string>} */
      const code = new Set()

      for (const match of analysis.stepMatches) {
        if (match.scenario !== scenario) {
          continue
        }

        for (const definition of match.matches) {
          for (const key of analysis.sources.reachOf(
            definition,
          )) {
            code.add(key)
          }
        }
      }

      for (const key of analysis.sources.runtimeKeys) {
        code.add(key)
      }

      for (const key of code) {
        reachedCode.add(key)
      }

      const backgroundSteps =
        scenario.pickles[0]?.steps
          .slice(
            0,
            Math.max(
              0,
              (scenario.pickles[0]?.steps.length ?? 0) -
                scenario.templateSteps.length,
            ),
          )
          .map(
            (step) =>
              `${step.keyword} ${step.text}${step.argument ? `\n${step.argument}` : ""}`,
          ) ?? []

      const [examples] = scenario.examples
      // Every tag that changes how or where the scenario runs, such
      // as `@responsive`, which moves it to the four-window project.
      const tags = scenario.tags
        .filter((tag) => !analysis.idPattern.test(tag))
        .sort()

      requirements[idTag.name.slice(1)] = {
        feature: document.file,
        heading: document.name,
        description: scenario.description,
        ...(scenario.ruleName
          ? { rule: scenario.ruleName }
          : {}),
        scenario: scenario.name,
        // Inherited tags count: QuickPickle applies a Rule's `@todo`
        // to every scenario under it.
        status: scenario.tags.some((tag) =>
          pendingTags.has(tag),
        )
          ? "pending"
          : "active",
        ...(tags.length > 0 ? { tags } : {}),
        steps: [
          ...backgroundSteps,
          ...scenario.templateSteps,
        ],
        ...(examples
          ? {
              examples: [examples.header, ...examples.rows],
            }
          : {}),
        code: [...code].sort(),
      }
    }
  }

  /** @type {RequirementsLock["code"]} */
  const code = {}

  for (const key of [...reachedCode].sort()) {
    const unit = analysis.sources.units.get(key)

    if (unit) {
      code[key] = unit.hash
    }
  }

  // A digest per requirement puts the ID itself in the lock's git
  // diff when only the code behind it changed.
  for (const requirement of Object.values(requirements)) {
    requirement.digest = createHash("sha256")
      .update(
        JSON.stringify(
          requirement.code.map((key) => [
            key,
            code[key] ?? "",
          ]),
        ),
      )
      .digest("hex")
      .slice(0, 16)
  }

  return {
    version: 1,
    requirements: Object.fromEntries(
      Object.entries(requirements).sort(([left], [right]) =>
        left.localeCompare(right, "en", { numeric: true }),
      ),
    ),
    code,
    retired: previous.retired ?? {},
  }
}

/** @param {RequirementsLock} lock */
export const serializeLock = (lock) =>
  `${JSON.stringify(lock, null, 2)}\n`

/**
 * @param {Analysis} analysis
 * @param {RequirementsLock} lock
 */
export const writeLock = (analysis, lock) =>
  writeFile(
    join(
      analysis.project.root,
      analysis.project.config.lock,
    ),
    serializeLock(lock),
  )

/**
 * Every way the tree and the lock disagree, as problems. An ID that
 * left the features without being retired is the one an agent most
 * needs to explain, so it gets its own rule.
 *
 * @param {Analysis} analysis
 * @param {RequirementsLock} locked
 */
export const lockProblems = (analysis, locked) => {
  const lockFile = analysis.project.config.lock
  const command = commandFor(
    analysis.project.config,
    "lock",
  )
  const expected = buildLock(analysis, locked)
  /** @type {import("./features.js").Problem[]} */
  const problems = []

  for (const id of Object.keys(locked.requirements)) {
    if (!(id in expected.requirements)) {
      problems.push({
        file: lockFile,
        line: 1,
        column: 1,
        rule: "removed-requirement",
        message: `${id} ("${locked.requirements[id]?.scenario}") is in the lock but no scenario has it. If it was removed on purpose, run \`${command} --retire ${id} --reason "<why>"\` and say so in the pull request. If not, restore the scenario.`,
      })
    }
  }

  problems.push(
    ...retiredIdProblems(
      lockFile,
      Object.keys(expected.requirements),
      locked.retired ?? {},
    ),
  )

  const removed = problems.some(
    (problem) => problem.rule === "removed-requirement",
  )

  if (
    !removed &&
    serializeLock(expected) !== serializeLock(locked)
  ) {
    const changes = describeChanges(locked, expected)

    problems.push({
      file: lockFile,
      line: 1,
      column: 1,
      rule: "stale-lock",
      message: `The lock does not match the requirements.\n${changes.map((change) => `    ${change.id} ${change.kind}: ${summarizeDetails(change.details) || change.scenario}`).join("\n") || "    lock metadata"}\n  If you meant to change these requirements, run \`${command}\` and list the IDs in the pull request. If you did not, revert the edit instead of relocking.`,
    })
  }

  return problems
}

/**
 * @param {string[]} details
 */
const summarizeDetails = (details) =>
  details.length > 6
    ? `${details.slice(0, 6).join("; ")}; and ${details.length - 6} more (run the lock command to see all)`
    : details.join("; ")

/**
 * @param {string} lockFile
 * @param {string[]} ids
 * @param {RequirementsLock["retired"]} retired
 */
const retiredIdProblems = (lockFile, ids, retired) => {
  const retiredById = new Map(
    Object.entries(retired).map(([id, entry]) => [
      canonicalId(id),
      { id, entry },
    ]),
  )

  return ids.flatMap((id) => {
    const match = retiredById.get(canonicalId(id))

    return match
      ? [
          {
            file: lockFile,
            line: 1,
            column: 1,
            rule: "retired-id",
            message: `${id} reuses retired ${match.id} ("${match.entry.reason}"). Give the new scenario a new ID, above every active and retired one.`,
          },
        ]
      : []
  })
}

/**
 * What only the base branch can prove: the PR's own lock can be edited
 * by hand, so a deleted tombstone or a requirement dropped from both
 * the features and the lock look clean on their own. CI runs this
 * against the base commit and fails on any of these.
 *
 * @param {RequirementsLock} base
 * @param {RequirementsLock} head
 * @param {string} lockFile
 */
export const baseProblems = (base, head, lockFile) => {
  /** @type {import("./features.js").Problem[]} */
  const problems = []
  const headRetired = head.retired ?? {}

  for (const [id, entry] of Object.entries(
    base.retired ?? {},
  )) {
    if (!(id in headRetired)) {
      problems.push({
        file: lockFile,
        line: 1,
        column: 1,
        rule: "missing-tombstone",
        message: `${id} ("${entry.scenario}") was retired on the base branch, and its entry is gone. Restore it; a retired ID stays retired.`,
      })
    }
  }

  for (const [id, entry] of Object.entries(
    base.requirements ?? {},
  )) {
    if (
      !(id in (head.requirements ?? {})) &&
      !(id in headRetired)
    ) {
      problems.push({
        file: lockFile,
        line: 1,
        column: 1,
        rule: "removed-requirement",
        message: `${id} ("${entry.scenario}") exists on the base branch and is gone without a retirement. Restore it, or retire it with a reason.`,
      })
    }
  }

  problems.push(
    ...retiredIdProblems(
      lockFile,
      Object.keys(head.requirements ?? {}),
      base.retired ?? {},
    ),
  )

  return problems
}

/**
 * @typedef {{
 *   id: string,
 *   kind: "added" | "retired" | "removed" | "changed",
 *   scenario: string,
 *   details: string[],
 * }} RequirementChange
 */

/**
 * @param {RequirementsLock} before
 * @param {RequirementsLock} after
 * @returns {RequirementChange[]}
 */
export const describeChanges = (before, after) => {
  /** @type {RequirementChange[]} */
  const changes = []
  const ids = new Set([
    ...Object.keys(before.requirements ?? {}),
    ...Object.keys(after.requirements ?? {}),
  ])

  for (const id of [...ids].sort((left, right) =>
    left.localeCompare(right, "en", { numeric: true }),
  )) {
    const old = before.requirements?.[id]
    const current = after.requirements?.[id]

    if (!old && current) {
      changes.push({
        id,
        kind: "added",
        scenario: current.scenario,
        details: [`status: ${current.status}`],
      })
      continue
    }

    if (old && !current) {
      const retired = after.retired?.[id]

      changes.push({
        id,
        kind: retired ? "retired" : "removed",
        scenario: old.scenario,
        details: retired
          ? [`reason: ${retired.reason}`]
          : [],
      })
      continue
    }

    if (!old || !current) {
      continue
    }

    /** @type {string[]} */
    const details = []

    if (old.scenario !== current.scenario) {
      details.push(
        `renamed: "${old.scenario}" -> "${current.scenario}"`,
      )
    }

    if (old.status !== current.status) {
      details.push(
        `status: ${old.status} -> ${current.status}`,
      )
    }

    if (
      JSON.stringify(old.tags ?? []) !==
      JSON.stringify(current.tags ?? [])
    ) {
      details.push(
        `tags: ${(old.tags ?? []).join(" ") || "none"} -> ${(current.tags ?? []).join(" ") || "none"}`,
      )
    }

    if ((old.rule ?? "") !== (current.rule ?? "")) {
      details.push(
        `rule: "${old.rule ?? ""}" -> "${current.rule ?? ""}"`,
      )
    }

    if (
      (old.description ?? "") !==
      (current.description ?? "")
    ) {
      details.push(
        "description: the Feature, Rule, or Scenario prose changed",
      )
    }

    if (old.heading !== current.heading) {
      details.push(
        `feature heading: "${old.heading ?? ""}" -> "${current.heading ?? ""}"`,
      )
    }

    if (old.feature !== current.feature) {
      details.push(
        `moved: ${old.feature} -> ${current.feature}`,
      )
    }

    if (
      JSON.stringify(old.steps) !==
        JSON.stringify(current.steps) ||
      JSON.stringify(old.examples) !==
        JSON.stringify(current.examples)
    ) {
      details.push("spec: the steps or examples changed")
    }

    const oldCode = new Set(old.code)
    const currentCode = new Set(current.code)

    for (const key of current.code) {
      if (!oldCode.has(key)) {
        details.push(`now reaches: ${key}`)
      } else if (before.code?.[key] !== after.code?.[key]) {
        details.push(`code changed: ${key}`)
      }
    }

    for (const key of old.code) {
      if (!currentCode.has(key)) {
        details.push(`no longer reaches: ${key}`)
      }
    }

    if (
      details.length === 0 &&
      JSON.stringify(old) !== JSON.stringify(current)
    ) {
      details.push("entry changed")
    }

    if (details.length > 0) {
      changes.push({
        id,
        kind: "changed",
        scenario: current.scenario,
        details,
      })
    }
  }

  for (const [id, entry] of Object.entries(
    before.retired ?? {},
  )) {
    if (!(id in (after.retired ?? {}))) {
      changes.push({
        id,
        kind: "removed",
        scenario: entry.scenario,
        details: ["its retirement entry was deleted"],
      })
    }
  }

  return changes
}

/**
 * @param {RequirementChange[]} changes
 */
export const formatChangesMarkdown = (changes) => {
  if (changes.length === 0) {
    return "### Requirements\n\nNo requirement changed: every scenario and the code behind it match the base branch.\n"
  }

  const lines = [
    "### Requirements changed",
    "",
    "Each ID below proves something different from the base branch. Check that the change was intended before merging.",
    "",
  ]

  for (const change of changes) {
    lines.push(
      `- **${change.id}** ${change.kind}: ${change.scenario}`,
    )

    for (const detail of change.details) {
      lines.push(`  - ${detail}`)
    }
  }

  return `${lines.join("\n")}\n`
}
