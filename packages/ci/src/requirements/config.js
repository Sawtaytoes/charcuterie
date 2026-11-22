import { existsSync } from "node:fs"
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
 *   stepFiles: string[],
 *   entry: string,
 *   runtime: string[],
 *   subjects: string[],
 *   packages: Record<string, string>,
 *   command: string,
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
 *   stepFiles: Set<string>,
 *   runtimeFiles: string[],
 * }} RequirementsProject
 */

/** @type {RequirementsConfig} */
const defaults = {
  idPrefix: "REQ-",
  features: ["**/*.feature"],
  sources: ["**/*.ts"],
  exclude: [
    "**/*.test.ts",
    "**/*.test.js",
    "**/node_modules/**",
  ],
  helpers: ["helpers/**/*.ts"],
  stepModule: "support/steps.ts",
  // Must equal the `import.meta.glob` in `entry`; the check compares
  // them, so a step file the runner never loads cannot count as a
  // definition.
  stepFiles: ["steps/*.steps.ts"],
  entry: "index.ts",
  // Code every scenario runs through: the setup file, the World, the
  // step wrapper, and the parameter types. Each is hashed whole and
  // reached by every requirement.
  runtime: ["index.ts", "support/**/*.ts"],
  // The code under test, which the lock neither hashes nor follows.
  // A `!` pattern excludes, so stories can be fixtures while the
  // components beside them are subjects.
  subjects: [],
  // Workspace packages to follow by name: package name -> directory,
  // relative to the root.
  packages: {},
  // How problem messages name the CLI.
  command: "charcuterie-requirements",
  allowedTags: [],
  pendingTags: ["@todo"],
  lock: "requirements.lock.json",
}

export const configFileName = "requirements.config.json"

/**
 * A subcommand as the repo runs it: `charcuterie-requirements lock`,
 * or `pnpm requirements:lock` when `command` ends with a colon.
 *
 * @param {RequirementsConfig} config
 * @param {string} subcommand
 */
export const commandFor = (config, subcommand) =>
  config.command.endsWith(":")
    ? `${config.command}${subcommand}`
    : `${config.command} ${subcommand}`

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
    // A literal path may point outside the root, such as the Vitest
    // config that runs the features.
    if (!/[*?[\]{}]/.test(pattern)) {
      if (existsSync(join(root, pattern))) {
        found.add(pattern.split("\\").join("/"))
      }

      continue
    }

    for await (const match of glob(pattern, {
      cwd: root,
      exclude,
    })) {
      const path = match.split("\\").join("/")

      // `**/*.test.js` never matches `../x/a.test.js`, so match
      // the path below its leading `../` segments too.
      const inside = path.replace(/^(\.\.\/)+/, "")

      if (
        !exclude.some(
          (excluded) =>
            matchesGlob(path, excluded) ||
            matchesGlob(inside, excluded),
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
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      // Scanning a whole repository by mistake reports every tag in
      // it as forbidden; refuse instead.
      throw new Error(
        `${join(root, configFileName)} does not exist. Pass --root <the requirements directory>.`,
      )
    }

    throw error
  }

  /** @type {RequirementsConfig} */
  const config = { ...defaults, ...written }

  const [
    featureFiles,
    sourceFiles,
    helperFiles,
    stepFiles,
    runtimeFiles,
  ] = await Promise.all([
    expand(root, config.features, config.exclude),
    expand(root, config.sources, config.exclude),
    expand(root, config.helpers, config.exclude),
    expand(root, config.stepFiles, config.exclude),
    expand(root, config.runtime, config.exclude),
  ])

  return {
    root,
    config,
    featureFiles,
    sourceFiles,
    helperFiles: new Set(helperFiles),
    stepFiles: new Set(stepFiles),
    runtimeFiles,
  }
}

/**
 * @param {string} root
 * @param {string} absolutePath
 */
export const toRootRelative = (root, absolutePath) =>
  relative(root, absolutePath).split("\\").join("/")
