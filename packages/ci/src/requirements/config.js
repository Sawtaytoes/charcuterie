import { glob, readFile } from "node:fs/promises"
import {
  join,
  matchesGlob,
  relative,
  resolve,
} from "node:path"

/**
 * A requirements root is a directory holding `.feature` files, the
 * TypeScript that binds their steps, and two JSON files:
 *
 *   requirements.config.json   written by people
 *   requirements.lock.json     written by `charcuterie-requirements lock`
 *
 * The config is deliberately small. Everything a check needs to know
 * about a step comes from the source itself, read statically, so the
 * checker can never disagree with the code that runs.
 *
 * @typedef {{
 *   idPrefix: string,
 *   features: string[],
 *   sources: string[],
 *   exclude: string[],
 *   helpers: string[],
 *   stepModule: string,
 *   allowedTags: string[],
 *   pendingTags: string[],
 *   lock: string,
 * }} RequirementsConfig
 *
 * @typedef {{
 *   root: string,
 *   config: RequirementsConfig,
 *   featureFiles: string[],
 *   sourceFiles: string[],
 *   helperFiles: Set<string>,
 * }} RequirementsProject
 */

/** @type {RequirementsConfig} */
const defaults = {
  idPrefix: "REQ-",
  features: ["**/*.feature"],
  sources: ["**/*.ts"],
  exclude: ["**/*.test.ts", "**/node_modules/**"],
  helpers: ["helpers/**/*.ts"],
  stepModule: "support/steps.ts",
  allowedTags: [],
  pendingTags: ["@todo"],
  lock: "requirements.lock.json",
}

export const configFileName = "requirements.config.json"

/**
 * @param {string} root
 * @param {string[]} patterns
 * @param {string[]} exclude
 * @returns {Promise<string[]>} sorted, root-relative, forward-slashed
 */
const expand = async (root, patterns, exclude) => {
  /** @type {Set<string>} */
  const found = new Set()

  for (const pattern of patterns) {
    for await (const match of glob(pattern, {
      cwd: root,
      exclude,
    })) {
      const path = match.split("\\").join("/")

      if (
        !exclude.some((excluded) =>
          matchesGlob(path, excluded),
        )
      ) {
        found.add(path)
      }
    }
  }

  return [...found].sort()
}

/**
 * @param {string} rootDirectory
 * @returns {Promise<RequirementsProject>}
 */
export const loadProject = async (rootDirectory) => {
  const root = resolve(rootDirectory)
  /** @type {Partial<RequirementsConfig>} */
  let written = {}

  try {
    written = JSON.parse(
      await readFile(join(root, configFileName), "utf8"),
    )
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error
    }
  }

  /** @type {RequirementsConfig} */
  const config = { ...defaults, ...written }

  const [featureFiles, sourceFiles, helperFiles] =
    await Promise.all([
      expand(root, config.features, config.exclude),
      expand(root, config.sources, config.exclude),
      expand(root, config.helpers, config.exclude),
    ])

  return {
    root,
    config,
    featureFiles,
    sourceFiles,
    helperFiles: new Set(helperFiles),
  }
}

/**
 * @param {string} root
 * @param {string} absolutePath
 */
export const toRootRelative = (root, absolutePath) =>
  relative(root, absolutePath).split("\\").join("/")
