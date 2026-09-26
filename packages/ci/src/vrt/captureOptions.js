/**
 * The pure half of the shared Storybook capture: argument parsing, story
 * selection and file naming. Nothing in here touches a browser, a socket
 * or the file system, so every branch is a unit test.
 *
 * The contract every consumer depends on:
 *
 * - Shots are PNG files under ONE directory, `$VRT_ACTUAL_DIR` (default
 *   `.vrt-actual`). reg-suit compares that directory against the baseline.
 * - A shot's name is stable and file-system safe. It is the story id, then
 *   `__<scheme>` when a scheme global is in play, then `.png`, inside a
 *   subfolder named for the Storybook's prefix when there is one.
 * - A Storybook with NO prefix (`packages/docs/storybook-static`, or
 *   `=packages/docs/storybook-static`) writes at the top level, which is
 *   byte-for-byte the naming `packages/docs/scripts/vrtCapture.mjs` used. A
 *   repo that moves to this capture keeps its baseline.
 */

/**
 * @typedef {{ prefix: string, staticDir: string }} StorybookSource
 * @typedef {{ height: number, width: number }} Viewport
 * @typedef {{ id: string, type?: string }} StoryEntry
 * @typedef {{
 *   prefix: string,
 *   staticDir: string,
 *   storyId: string,
 *   scheme: string | null,
 *   fileName: string,
 * }} Shot
 */

export const DEFAULT_ACTUAL_DIR = ".vrt-actual"

export const DEFAULT_VIEWPORT = Object.freeze({
  height: 800,
  width: 1280,
})

export const DEFAULT_CONCURRENCY = 4

/**
 * A prefix becomes a directory name, so it is held to the same rule as
 * the rest of the path: letters, digits, dot, underscore and hyphen. An
 * id from Storybook already obeys that (Storybook sanitizes ids), so the
 * prefix is the only part a person types.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/

/**
 * Split a whitespace-, comma- or newline-separated list, dropping blanks.
 * Every list input arrives through a YAML block scalar or an environment
 * variable, and both of those add stray whitespace.
 *
 * @param {string | undefined | null} text
 * @returns {string[]}
 */
export const splitList = (text) =>
  (text ?? "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

/**
 * `web=packages/web/storybook-static` → prefix `web`.
 * `packages/docs/storybook-static` or `=packages/docs/storybook-static`
 * → no prefix, shots at the top level of the actual directory.
 *
 * @param {string} spec
 * @returns {StorybookSource}
 */
export const parseStorybookSource = (spec) => {
  const trimmed = spec.trim()
  const separator = trimmed.indexOf("=")

  const prefix =
    separator === -1
      ? ""
      : trimmed.slice(0, separator).trim()
  const staticDir = (
    separator === -1
      ? trimmed
      : trimmed.slice(separator + 1)
  ).trim()

  if (staticDir === "") {
    throw new Error(
      `Storybook source \`${spec}\` has no directory. Write \`prefix=path\` or just \`path\`.`,
    )
  }

  if (prefix !== "" && !SAFE_SEGMENT.test(prefix)) {
    throw new Error(
      `Storybook prefix \`${prefix}\` is not file-system safe. Use letters, digits, \`.\`, \`_\` and \`-\`.`,
    )
  }

  return { prefix, staticDir }
}

/**
 * @param {string[]} specs
 * @returns {StorybookSource[]}
 */
export const parseStorybookSources = (specs) => {
  const sources = specs.map(parseStorybookSource)
  const seen = new Set()

  for (const { prefix } of sources) {
    // Two sources with the same prefix would write over each other's
    // shots, and the second one would silently win.
    if (seen.has(prefix)) {
      throw new Error(
        prefix === ""
          ? "Only one Storybook may go without a prefix."
          : `Two Storybooks share the prefix \`${prefix}\`.`,
      )
    }

    seen.add(prefix)
  }

  return sources
}

/**
 * `1280x800` → `{ width: 1280, height: 800 }`.
 *
 * @param {string | undefined | null} text
 * @returns {Viewport}
 */
export const parseViewport = (text) => {
  if (text == null || text.trim() === "") {
    return { ...DEFAULT_VIEWPORT }
  }

  const match = /^\s*(\d+)\s*[xX]\s*(\d+)\s*$/.exec(text)

  if (match == null) {
    throw new Error(
      `Viewport \`${text}\` is not \`<width>x<height>\`, for example \`1280x800\`.`,
    )
  }

  const width = Number(match[1])
  const height = Number(match[2])

  if (width < 1 || height < 1) {
    throw new Error(`Viewport \`${text}\` has a zero side.`)
  }

  return { height, width }
}

/**
 * @param {string | number | undefined | null} value
 * @returns {number}
 */
export const parseConcurrency = (value) => {
  if (value == null || String(value).trim() === "") {
    return DEFAULT_CONCURRENCY
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `Concurrency \`${value}\` is not a positive whole number.`,
    )
  }

  return parsed
}

/**
 * The schemes to shoot. With no scheme global there is exactly one pass
 * and no suffix: many repos have no scheme toolbar at all, and inventing
 * one would put `__default` on every file for nothing.
 *
 * @param {{ schemeGlobal?: string | null, schemes?: string[] }} options
 * @returns {(string | null)[]}
 */
export const resolveSchemes = ({
  schemeGlobal,
  schemes = [],
}) => {
  if (schemeGlobal == null || schemeGlobal.trim() === "") {
    if (schemes.length > 0) {
      throw new Error(
        "Schemes were given without a scheme global. Name the Storybook global that selects the scheme (Charcuterie's is `scheme`).",
      )
    }

    return [null]
  }

  if (schemes.length === 0) {
    throw new Error(
      `The scheme global \`${schemeGlobal}\` was given with no schemes to shoot.`,
    )
  }

  for (const scheme of schemes) {
    if (!SAFE_SEGMENT.test(scheme)) {
      throw new Error(
        `Scheme \`${scheme}\` is not file-system safe.`,
      )
    }
  }

  return schemes
}

/**
 * An include or exclude pattern matches a story id when it is a
 * substring of it, or — when it holds a `*` — as a glob over the whole
 * id. Substring is what the old `VRT_ONLY` knob did, and it is what a
 * person reaches for during flake triage.
 *
 * @param {string} pattern
 * @param {string} storyId
 * @returns {boolean}
 */
export const isStoryIdMatch = (pattern, storyId) => {
  if (!pattern.includes("*")) {
    return storyId.includes(pattern)
  }

  const expression = pattern
    .split("*")
    .map((part) =>
      part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join(".*")

  return new RegExp(`^${expression}$`).test(storyId)
}

/**
 * Stories from a Storybook `index.json`, docs entries dropped, filtered
 * and sorted by id. The sort is load-bearing: the old capture recorded a
 * story's rendered height moving by 58px when the stories ahead of it on
 * the same pooled page changed, so the order must not depend on how the
 * index happened to be written.
 *
 * @param {{ entries?: Record<string, StoryEntry>, stories?: Record<string, StoryEntry> }} index
 * @param {{ include?: string[], exclude?: string[] }} [filter]
 * @returns {string[]}
 */
export const selectStoryIds = (
  index,
  { include = [], exclude = [] } = {},
) =>
  Object.values(index.entries ?? index.stories ?? {})
    // Storybook 7+ marks every entry with a `type`; a v6 `stories.json`
    // has no `type` and lists only stories.
    .filter(
      (entry) =>
        entry.type == null || entry.type === "story",
    )
    .map((entry) => entry.id)
    .filter(
      (storyId) =>
        include.length === 0 ||
        include.some((pattern) =>
          isStoryIdMatch(pattern, storyId),
        ),
    )
    .filter(
      (storyId) =>
        !exclude.some((pattern) =>
          isStoryIdMatch(pattern, storyId),
        ),
    )
    .sort((first, second) => first.localeCompare(second))

/**
 * @param {{ prefix: string, storyId: string, scheme: string | null }} shot
 * @returns {string}
 */
export const shotFileName = ({
  prefix,
  storyId,
  scheme,
}) => {
  const base =
    scheme == null
      ? `${storyId}.png`
      : `${storyId}__${scheme}.png`

  return prefix === "" ? base : `${prefix}/${base}`
}

/**
 * Storybook's iframe URL for one story, with the scheme global applied
 * through the query string — the same channel the toolbar writes to.
 *
 * @param {{ origin: string, storyId: string, schemeGlobal?: string | null, scheme: string | null }} options
 * @returns {string}
 */
export const storyUrl = ({
  origin,
  storyId,
  schemeGlobal,
  scheme,
}) => {
  const query = new URLSearchParams({
    id: storyId,
    viewMode: "story",
  })

  if (schemeGlobal && scheme != null) {
    query.set("globals", `${schemeGlobal}:${scheme}`)
  }

  return `${origin}/iframe.html?${query.toString()}`
}

/**
 * Every (story, scheme) pair across every Storybook: the whole run as
 * one list, drained by a fixed pool of pages.
 *
 * @param {{ source: StorybookSource, storyIds: string[] }[]} catalogs
 * @param {(string | null)[]} schemes
 * @returns {Shot[]}
 */
export const planShots = (catalogs, schemes) =>
  catalogs.flatMap(({ source, storyIds }) =>
    storyIds.flatMap((storyId) =>
      schemes.map((scheme) => ({
        fileName: shotFileName({
          prefix: source.prefix,
          scheme,
          storyId,
        }),
        prefix: source.prefix,
        scheme,
        staticDir: source.staticDir,
        storyId,
      })),
    ),
  )

/**
 * Read command-line arguments, falling back to environment variables, so
 * the same script is driven by the shared workflow (environment) and by a
 * person at a shell (flags).
 *
 * @param {string[]} argv
 * @param {Record<string, string | undefined>} env
 */
export const parseCaptureArguments = (argv, env) => {
  /** @type {Record<string, string>} */
  const flags = {}
  /** @type {string[]} */
  const positional = []

  const valued = new Set([
    "--concurrency",
    "--exclude",
    "--include",
    "--limit",
    "--out",
    "--scheme-attribute",
    "--scheme-global",
    "--schemes",
    "--viewport",
  ])

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const equals = arg.indexOf("=")
    const name = arg.startsWith("--")
      ? equals === -1
        ? arg
        : arg.slice(0, equals)
      : null

    if (name == null) {
      positional.push(arg)
    } else if (valued.has(name)) {
      if (equals !== -1) {
        flags[name] = arg.slice(equals + 1)
      } else {
        index += 1

        if (argv[index] == null) {
          throw new Error(`${name} needs a value.`)
        }

        flags[name] = argv[index]
      }
    } else {
      throw new Error(`Unknown option \`${arg}\`.`)
    }
  }

  const sourceSpecs =
    positional.length > 0
      ? positional
      : (env.VRT_STORYBOOK_STATIC_DIRS ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)

  if (sourceSpecs.length === 0) {
    throw new Error(
      "No Storybook to capture. Pass `prefix=path/to/storybook-static` (or set VRT_STORYBOOK_STATIC_DIRS, one per line).",
    )
  }

  const schemeGlobal =
    flags["--scheme-global"] ?? env.VRT_SCHEME_GLOBAL ?? ""

  const schemeAttribute =
    flags["--scheme-attribute"] ??
    env.VRT_SCHEME_ATTRIBUTE ??
    ""

  const limit = Number(
    flags["--limit"] ?? env.VRT_LIMIT ?? 0,
  )

  return {
    actualDir:
      flags["--out"] ||
      env.VRT_ACTUAL_DIR ||
      DEFAULT_ACTUAL_DIR,
    concurrency: parseConcurrency(
      flags["--concurrency"] ?? env.VRT_CONCURRENCY,
    ),
    exclude: splitList(
      flags["--exclude"] ?? env.VRT_EXCLUDE,
    ),
    include: splitList(
      flags["--include"] ?? env.VRT_INCLUDE,
    ),
    limit: Number.isInteger(limit) && limit > 0 ? limit : 0,
    schemeAttribute: schemeAttribute.trim() || null,
    schemeGlobal: schemeGlobal.trim() || null,
    schemes: resolveSchemes({
      schemeGlobal,
      schemes: splitList(
        flags["--schemes"] ?? env.VRT_SCHEMES,
      ),
    }),
    sources: parseStorybookSources(sourceSpecs),
    viewport: parseViewport(
      flags["--viewport"] ?? env.VRT_VIEWPORT,
    ),
  }
}
