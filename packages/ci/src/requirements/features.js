import { readFile } from "node:fs/promises"
import { join } from "node:path"

import {
  AstBuilder,
  compile,
  GherkinClassicTokenMatcher,
  Parser,
} from "@cucumber/gherkin"
import { IdGenerator } from "@cucumber/messages"

/**
 * The same parser and compiler QuickPickle uses, so a scenario this
 * checker accepts is one the runner can render — `Rule`, inherited
 * `Background`s, outlines, and all.
 *
 * @typedef {{
 *   file: string,
 *   line: number,
 *   column: number,
 *   rule: string,
 *   message: string,
 * }} Problem
 *
 * @typedef {{
 *   file: string,
 *   line: number,
 *   keyword: string,
 *   text: string,
 *   argument: string,
 *   type: "Context" | "Action" | "Outcome" | "Unknown",
 * }} FeatureStep
 *
 * @typedef {{
 *   file: string,
 *   line: number,
 *   name: string,
 *   keyword: string,
 *   ruleName: string,
 *   ownTags: { name: string, line: number }[],
 *   inheritedTags: { name: string, line: number }[],
 *   tags: string[],
 *   examples: {
 *     line: number,
 *     tags: { name: string, line: number }[],
 *     header: string[],
 *     rows: string[][],
 *   }[],
 *   templateSteps: string[],
 *   pickles: { name: string, steps: FeatureStep[] }[],
 * }} FeatureScenario
 *
 * @typedef {{
 *   file: string,
 *   name: string,
 *   line: number,
 *   tags: { name: string, line: number }[],
 *   ruleTags: { name: string, line: number, ruleName: string }[],
 *   scenarios: FeatureScenario[],
 * }} FeatureDocument
 */

/**
 * @param {readonly { name: string, location: { line: number } }[]} tags
 */
const toTags = (tags) =>
  tags.map((tag) => ({
    name: tag.name,
    line: tag.location.line,
  }))

/**
 * A data table or doc string, as text. QuickPickle passes both to the
 * step callback, so they are part of what a step proves: a changed
 * table of expected values is a changed requirement.
 *
 * @param {{ dataTable?: { rows: readonly { cells: readonly { value: string }[] }[] }, docString?: { content: string, mediaType?: string } } | undefined} argument
 */
export const argumentText = (argument) => {
  if (argument?.dataTable) {
    return argument.dataTable.rows
      .map(
        (row) =>
          `| ${row.cells.map((cell) => cell.value).join(" | ")} |`,
      )
      .join("\n")
  }

  if (argument?.docString) {
    return `"""${argument.docString.mediaType ?? ""}\n${argument.docString.content}\n"""`
  }

  return ""
}

/**
 * @param {string} root
 * @param {string} file root-relative
 * @returns {Promise<{ document: FeatureDocument | null, problems: Problem[] }>}
 */
export const parseFeature = async (root, file) => {
  const source = await readFile(join(root, file), "utf8")
  const newId = IdGenerator.incrementing()
  const parser = new Parser(
    new AstBuilder(newId),
    new GherkinClassicTokenMatcher(),
  )

  /** @type {import("@cucumber/messages").GherkinDocument} */
  let gherkinDocument

  try {
    gherkinDocument = parser.parse(source)
  } catch (error) {
    const errors =
      error &&
      typeof error === "object" &&
      "errors" in error &&
      Array.isArray(error.errors)
        ? error.errors
        : [error]

    return {
      document: null,
      problems: errors.map(
        (
          /** @type {{ message?: string, location?: { line?: number, column?: number } }} */ parseError,
        ) => ({
          file,
          line: parseError?.location?.line ?? 1,
          column: parseError?.location?.column ?? 1,
          rule: "parse-error",
          message: String(
            parseError?.message ?? parseError,
          ),
        }),
      ),
    }
  }

  const feature = gherkinDocument.feature

  if (!feature) {
    return {
      document: {
        file,
        name: "",
        line: 1,
        tags: [],
        ruleTags: [],
        scenarios: [],
      },
      problems: [],
    }
  }

  const pickles = compile(gherkinDocument, file, newId)

  /** @type {Map<string, { line: number, keyword: string, text: string }>} */
  const stepsById = new Map()
  /** @type {Map<string, import("@cucumber/messages").Scenario>} */
  const scenariosById = new Map()
  /** @type {{ name: string, line: number, ruleName: string }[]} */
  const ruleTags = []
  /** @type {Map<string, { ruleName: string, inherited: { name: string, line: number }[] }>} */
  const scenarioContext = new Map()

  const featureTags = toTags(feature.tags)

  /**
   * @param {readonly import("@cucumber/messages").FeatureChild[] | readonly import("@cucumber/messages").RuleChild[]} children
   * @param {string} ruleName
   * @param {{ name: string, line: number }[]} inherited
   */
  const visit = (children, ruleName, inherited) => {
    for (const child of children) {
      if (child.background) {
        for (const step of child.background.steps) {
          stepsById.set(step.id, {
            line: step.location.line,
            keyword: step.keyword.trim(),
            text: step.text,
          })
        }
      }

      if ("rule" in child && child.rule) {
        const ownRuleTags = toTags(child.rule.tags)

        ruleTags.push(
          ...ownRuleTags.map((tag) => ({
            ...tag,
            ruleName: child.rule?.name ?? "",
          })),
        )

        visit(child.rule.children, child.rule.name, [
          ...inherited,
          ...ownRuleTags,
        ])
      }

      if (child.scenario) {
        scenariosById.set(child.scenario.id, child.scenario)
        scenarioContext.set(child.scenario.id, {
          ruleName,
          inherited,
        })

        for (const step of child.scenario.steps) {
          stepsById.set(step.id, {
            line: step.location.line,
            keyword: step.keyword.trim(),
            text: step.text,
          })
        }
      }
    }
  }

  visit(feature.children, "", featureTags)

  /** @type {FeatureScenario[]} */
  const scenarios = [...scenariosById.values()].map(
    (scenario) => {
      const context = scenarioContext.get(scenario.id) ?? {
        ruleName: "",
        inherited: featureTags,
      }

      return {
        file,
        line: scenario.location.line,
        name: scenario.name,
        keyword: scenario.keyword.trim(),
        ruleName: context.ruleName,
        ownTags: toTags(scenario.tags),
        inheritedTags: context.inherited,
        // What QuickPickle acts on: it applies Feature and Rule tags to
        // every scenario under them, so an inherited `@todo` skips a
        // scenario exactly as its own would.
        tags: [
          ...new Set(
            [
              ...context.inherited,
              ...toTags(scenario.tags),
            ].map((tag) => tag.name),
          ),
        ],
        examples: scenario.examples.map((examples) => ({
          line: examples.location.line,
          tags: toTags(examples.tags),
          header:
            examples.tableHeader?.cells.map(
              (cell) => cell.value,
            ) ?? [],
          rows: examples.tableBody.map((row) =>
            row.cells.map((cell) => cell.value),
          ),
        })),
        templateSteps: scenario.steps.map((step) => {
          const argument = argumentText({
            ...(step.dataTable
              ? { dataTable: step.dataTable }
              : {}),
            ...(step.docString
              ? { docString: step.docString }
              : {}),
          })

          return `${step.keyword.trim()} ${step.text}${argument ? `\n${argument}` : ""}`
        }),
        pickles: pickles
          .filter((pickle) =>
            pickle.astNodeIds.includes(scenario.id),
          )
          .map((pickle) => ({
            name: pickle.name,
            steps: pickle.steps.map((pickleStep) => {
              // The last AST id is the step itself; an outline step
              // also carries its example row's id after it.
              const source = pickleStep.astNodeIds
                .map((id) => stepsById.get(id))
                .find(Boolean) ?? {
                line: 1,
                keyword: "",
                text: pickleStep.text,
              }

              return {
                file,
                line: source.line,
                keyword: source.keyword,
                text: pickleStep.text,
                argument: argumentText(pickleStep.argument),
                type: /** @type {FeatureStep["type"]} */ (
                  pickleStep.type ?? "Unknown"
                ),
              }
            }),
          })),
      }
    },
  )

  return {
    document: {
      file,
      name: feature.name,
      line: feature.location.line,
      tags: featureTags,
      ruleTags,
      scenarios,
    },
    problems: [],
  }
}
