import {
  ExpressionFactory,
  ParameterType,
  ParameterTypeRegistry,
} from "@cucumber/cucumber-expressions"

import { loadProject } from "./config.js"
import { parseFeature } from "./features.js"
import { readSources } from "./sources.js"

/**
 * QuickPickle turns these tags into `test.skip`, `test.todo`,
 * `test.fails` (a failure REPORTED AS A PASS), soft failure, or
 * concurrency. Each one lets a requirement stop proving anything
 * while the suite stays green, so none is allowed unless the repo's
 * config lists it — and `@todo`, the one pending marker, is counted
 * and reported rather than hidden.
 */
const runnerTags = new Set([
  "@skip",
  "@todo",
  "@wip",
  "@fails",
  "@failing",
  "@should-fail",
  "@soft",
  "@softfail",
  "@concurrent",
  "@sequential",
])

/** @type {Record<string, "Given" | "When" | "Then">} */
const kindForType = {
  Context: "Given",
  Action: "When",
  Outcome: "Then",
}

/**
 * @typedef {import("./features.js").Problem} Problem
 * @typedef {import("./features.js").FeatureDocument} FeatureDocument
 * @typedef {import("./features.js").FeatureScenario} FeatureScenario
 * @typedef {import("./features.js").FeatureStep} FeatureStep
 * @typedef {import("./sources.js").StepDefinition} StepDefinition
 *
 * @typedef {{
 *   step: FeatureStep,
 *   scenario: FeatureScenario,
 *   matches: StepDefinition[],
 * }} StepMatch
 *
 * @typedef {Awaited<ReturnType<typeof analyzeProject>>} Analysis
 */

/**
 * @param {string} rootDirectory
 */
export const analyzeProject = async (rootDirectory) => {
  const project = await loadProject(rootDirectory)
  const { config } = project
  /** @type {Problem[]} */
  const problems = []
  /** @type {FeatureDocument[]} */
  const documents = []

  for (const file of project.featureFiles) {
    const parsed = await parseFeature(project.root, file)

    problems.push(...parsed.problems)

    if (parsed.document) {
      documents.push(parsed.document)
    }
  }

  const sources = readSources(project)

  problems.push(...sources.problems)

  const registry = new ParameterTypeRegistry()

  for (const parameterType of sources.parameterTypes) {
    registry.defineParameterType(
      new ParameterType(
        parameterType.name,
        parameterType.regexp,
        null,
        (value) => value,
        true,
        false,
      ),
    )
  }

  const factory = new ExpressionFactory(registry)
  const compiled = sources.definitions.map((definition) => {
    try {
      return {
        definition,
        expression: factory.createExpression(
          definition.expression,
        ),
      }
    } catch (error) {
      problems.push({
        file: definition.file,
        line: definition.line,
        column: definition.column,
        rule: "invalid-expression",
        message: `This Cucumber expression does not parse: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      })

      return null
    }
  })

  /** @type {Map<string, StepDefinition[]>} */
  const byExpression = new Map()

  for (const definition of sources.definitions) {
    const list =
      byExpression.get(definition.expression) ?? []

    list.push(definition)
    byExpression.set(definition.expression, list)
  }

  for (const [expression, list] of byExpression) {
    if (list.length > 1) {
      for (const definition of list.slice(1)) {
        problems.push({
          file: definition.file,
          line: definition.line,
          column: definition.column,
          rule: "duplicate-definition",
          message: `"${expression}" is already defined at ${list[0]?.file}:${list[0]?.line}.`,
        })
      }
    }
  }

  /** @param {string} text */
  const matchText = (text) =>
    compiled
      .filter((entry) => entry?.expression.match(text))
      .map(
        (entry) =>
          /** @type {StepDefinition} */ (entry?.definition),
      )

  /** @type {StepMatch[]} */
  const stepMatches = []
  /** @type {Set<string>} */
  const usedDefinitions = new Set()
  /** @type {Map<string, { file: string, line: number }>} */
  const ids = new Map()
  const idPattern = new RegExp(
    `^@${config.idPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+$`,
  )
  const allowedTags = new Set(config.allowedTags)
  const pendingTags = new Set(config.pendingTags)

  /**
   * @param {{ name: string, line: number }} tag
   * @param {string} file
   * @param {string} where
   */
  const checkPlainTag = (tag, file, where) => {
    if (idPattern.test(tag.name)) {
      problems.push({
        file,
        line: tag.line,
        column: 1,
        rule: "id-on-wrong-level",
        message: `Put ${tag.name} on its Scenario, not on the ${where}. A requirement ID names exactly one scenario.`,
      })
    } else if (!allowedTags.has(tag.name)) {
      problems.push({
        file,
        line: tag.line,
        column: 1,
        rule: "forbidden-tag",
        message: forbiddenTagMessage(tag.name),
      })
    }
  }

  /** @param {string} name */
  const forbiddenTagMessage = (name) =>
    runnerTags.has(name)
      ? `${name} changes how QuickPickle runs this scenario, so it can stop proving the requirement while the suite stays green. Remove it, or list it in requirements.config.json "allowedTags" with a decision record.`
      : `${name} is not an allowed tag. Allowed: requirement IDs, ${[...allowedTags].join(", ") || "none"}.`

  for (const document of documents) {
    for (const tag of document.tags) {
      checkPlainTag(tag, document.file, "Feature")
    }

    for (const tag of document.ruleTags) {
      checkPlainTag(
        tag,
        document.file,
        `Rule "${tag.ruleName}"`,
      )
    }

    /** @type {Map<string, number>} */
    const names = new Map()

    for (const scenario of document.scenarios) {
      const scenarioIds = scenario.ownTags.filter((tag) =>
        idPattern.test(tag.name),
      )

      if (scenarioIds.length === 0) {
        problems.push({
          file: document.file,
          line: scenario.line,
          column: 1,
          rule: "missing-id",
          message: `Tag this scenario with one stable requirement ID, @${config.idPrefix}<number>. The lock tracks requirements by that ID.`,
        })
      }

      if (scenarioIds.length > 1) {
        problems.push({
          file: document.file,
          line: scenario.line,
          column: 1,
          rule: "multiple-ids",
          message: `One scenario, one requirement: ${scenarioIds.map((tag) => tag.name).join(", ")}.`,
        })
      }

      for (const tag of scenarioIds) {
        const id = tag.name.slice(1)
        const seen = ids.get(id)

        if (seen) {
          problems.push({
            file: document.file,
            line: tag.line,
            column: 1,
            rule: "duplicate-id",
            message: `${id} already names the scenario at ${seen.file}:${seen.line}.`,
          })
        } else {
          ids.set(id, {
            file: document.file,
            line: scenario.line,
          })
        }
      }

      for (const tag of scenario.ownTags) {
        if (
          !idPattern.test(tag.name) &&
          !allowedTags.has(tag.name)
        ) {
          problems.push({
            file: document.file,
            line: tag.line,
            column: 1,
            rule: "forbidden-tag",
            message: forbiddenTagMessage(tag.name),
          })
        }
      }

      if (!scenario.name.trim()) {
        problems.push({
          file: document.file,
          line: scenario.line,
          column: 1,
          rule: "unnamed-scenario",
          message:
            "Name the scenario after the behavior it proves. The name is the test title an agent searches for.",
        })
      }

      const previous = names.get(scenario.name)

      if (previous !== undefined && scenario.name.trim()) {
        problems.push({
          file: document.file,
          line: scenario.line,
          column: 1,
          rule: "duplicate-scenario-name",
          message: `Line ${previous} already has a scenario named "${scenario.name}".`,
        })
      } else {
        names.set(scenario.name, scenario.line)
      }

      if (scenario.templateSteps.length === 0) {
        problems.push({
          file: document.file,
          line: scenario.line,
          column: 1,
          rule: "empty-scenario",
          message:
            "A scenario with no steps runs and passes without checking anything.",
        })
      }

      if (scenario.examples.length > 1) {
        problems.push({
          file: document.file,
          line: scenario.examples[1]?.line ?? scenario.line,
          column: 1,
          rule: "multiple-examples",
          message:
            "QuickPickle 1.11 runs only the FIRST Examples table, so these rows would never run (dnotes/quickpickle#62). Merge the tables into one.",
        })
      }

      for (const examples of scenario.examples) {
        for (const tag of examples.tags) {
          checkPlainTag(
            tag,
            document.file,
            "Examples table",
          )
        }

        if (examples.rows.length === 0) {
          problems.push({
            file: document.file,
            line: examples.line,
            column: 1,
            rule: "empty-examples",
            message:
              "An Examples table with no rows produces no test at all.",
          })
        }
      }

      if (
        scenario.keyword.startsWith("Scenario Outline") ||
        scenario.keyword.startsWith("Scenario Template")
      ) {
        if (scenario.examples.length === 0) {
          problems.push({
            file: document.file,
            line: scenario.line,
            column: 1,
            rule: "empty-examples",
            message:
              "A Scenario Outline needs one Examples table, or it produces no test.",
          })
        }
      }

      /** @type {Set<string>} */
      const reportedLines = new Set()

      for (const pickle of scenario.pickles) {
        for (const step of pickle.steps) {
          const matches = matchText(step.text)

          stepMatches.push({ step, scenario, matches })

          for (const match of matches) {
            usedDefinitions.add(match.key)
          }

          // An outline step yields one pickle step per row; say so once.
          const lineKey = `${step.line}:${matches.length}`

          if (reportedLines.has(lineKey)) {
            continue
          }

          reportedLines.add(lineKey)

          if (matches.length === 0) {
            problems.push({
              file: document.file,
              line: step.line,
              column: 1,
              rule: "undefined-step",
              message: `No step definition matches "${step.text}".`,
            })
          } else if (matches.length > 1) {
            problems.push({
              file: document.file,
              line: step.line,
              column: 1,
              rule: "ambiguous-step",
              message: `"${step.text}" matches ${matches.length} definitions: ${matches.map((match) => `${match.kind}("${match.expression}") at ${match.file}:${match.line}`).join("; ")}. Reword one of them.`,
            })
          } else {
            const [match] = matches
            const expected = kindForType[step.type]

            if (
              match &&
              expected &&
              match.kind !== expected
            ) {
              problems.push({
                file: document.file,
                line: step.line,
                column: 1,
                rule: "keyword-mismatch",
                message: `This is a ${expected} step, but it matches ${match.kind}("${match.expression}") at ${match.file}:${match.line}. A Given sets up, a When acts, and a Then checks.`,
              })
            }
          }
        }
      }
    }
  }

  for (const definition of sources.definitions) {
    if (!usedDefinitions.has(definition.key)) {
      problems.push({
        file: definition.file,
        line: definition.line,
        column: definition.column,
        rule: "unused-step",
        message: `No scenario uses ${definition.kind}("${definition.expression}"). Delete it, or add it with the scenario that needs it.`,
      })
    }
  }

  problems.push(...sources.unreachedHelpers())

  const pending = documents.flatMap((document) =>
    document.scenarios.filter((scenario) =>
      scenario.ownTags.some((tag) =>
        pendingTags.has(tag.name),
      ),
    ),
  )

  return {
    project,
    documents,
    sources,
    stepMatches,
    problems,
    pending,
    idPattern,
  }
}

/**
 * eslint's format, because agents already know how to read it.
 *
 * @param {Problem[]} problems
 */
export const formatProblems = (problems) =>
  [...problems]
    .sort(
      (left, right) =>
        left.file.localeCompare(right.file) ||
        left.line - right.line,
    )
    .map(
      (problem) =>
        `${problem.file}:${problem.line}:${problem.column}  ${problem.rule}  ${problem.message}`,
    )
    .join("\n")
