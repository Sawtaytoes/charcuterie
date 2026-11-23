import { existsSync, readFileSync } from "node:fs"
import { isBuiltin } from "node:module"
import {
  dirname,
  matchesGlob,
  relative,
  resolve,
} from "node:path"

import { build } from "esbuild"

/**
 * Which files a module loads, as a bundler resolves them.
 *
 * The lock needs to know every file a scenario runs. Resolving
 * imports by hand means re-implementing Vite: extension order,
 * `package.json` `exports` conditions, `export *`, JSON modules, and
 * CSS `@import`. esbuild already does all of that, so the checker asks
 * it for the import graph (its metafile) and hashes the files it
 * lists. The output itself is thrown away.
 *
 * Three kinds of import stop the walk:
 *
 * - npm packages (anything resolved inside `node_modules`). Their
 *   versions are the pnpm lockfile's job.
 * - the code under test, listed as `subjects` in the config. A
 *   component change is not a requirement change.
 * - assets such as images and fonts. They are hashed as files, but
 *   nothing is read from them.
 *
 * @typedef {{
 *   imports: Map<string, Map<string, string>>,
 *   rawFiles: Set<string>,
 *   closureOf: (entry: string) => Set<string>,
 *   problems: import("./features.js").Problem[],
 * }} ModuleGraph
 *
 * `imports` maps each loaded file (absolute) to its import specifiers
 * and the files they resolved to. `closureOf` lists every tracked file
 * an entry loads, itself included. `rawFiles` are files some module
 * imports as text or as a URL (`?raw`, `new URL(…, import.meta.url)`),
 * so their bytes matter, not just the code they compile to.
 */

/**
 * Vite's default `resolve.extensions`, in its order, so `./queries`
 * picks the same file Vite would when two exist side by side.
 */
const viteExtensions = [
  ".mjs",
  ".js",
  ".mts",
  ".ts",
  ".jsx",
  ".tsx",
  ".json",
]

/** Files esbuild reads as modules. Anything else is an asset. */
const moduleFile = /\.(?:[cm]?[jt]sx?|json|css)$/

/** `new URL("./file", import.meta.url)`, which Vite resolves. */
const urlImport =
  /new\s+URL\(\s*(["'`])([^"'`]+)\1\s*,\s*import\.meta\.url\s*\)/g

/** Vite import suffixes such as `?raw` and `?url`. */
const querySuffix = /\?.*$/

/** @param {string} specifier */
const isBareSpecifier = (specifier) =>
  !specifier.startsWith(".") && !specifier.startsWith("/")

/**
 * @param {string} path
 */
const toPosix = (path) => path.split("\\").join("/")

/**
 * @param {{
 *   root: string,
 *   subjects: string[],
 * }} options
 * @param {string[]} entries root-relative
 * @returns {Promise<ModuleGraph>}
 */
export const readGraph = async (
  { root, subjects },
  entries,
) => {
  /** @type {Map<string, Map<string, string>>} */
  const imports = new Map()
  /** @type {Set<string>} */
  const rawFiles = new Set()
  /** @type {import("./features.js").Problem[]} */
  const problems = []

  /** @param {string} absolutePath */
  const isSubject = (absolutePath) => {
    const file = toPosix(relative(root, absolutePath))
    let isMatch = false

    for (const pattern of subjects) {
      if (pattern.startsWith("!")) {
        if (matchesGlob(file, pattern.slice(1))) {
          isMatch = false
        }
      } else if (matchesGlob(file, pattern)) {
        isMatch = true
      }
    }

    return isMatch
  }

  /** @type {import("esbuild").Plugin} */
  const boundaries = {
    name: "requirements-boundaries",
    setup(plugin) {
      plugin.onResolve({ filter: /.*/ }, async (args) => {
        if (args.pluginData?.isInner) {
          return undefined
        }

        if (
          isBuiltin(args.path) ||
          args.path.startsWith("virtual:") ||
          args.path.startsWith("/@")
        ) {
          return { path: args.path, external: true }
        }

        const specifier = args.path.replace(querySuffix, "")
        const result = await plugin.resolve(specifier, {
          kind: args.kind,
          importer: args.importer,
          resolveDir: args.resolveDir,
          pluginData: { isInner: true },
        })

        if (result.errors.length > 0) {
          // A package's build output, such as `dist/theme.css`, is not
          // in git, so it can be missing before a build. A package is
          // outside the lock either way; a relative path must resolve.
          return isBareSpecifier(specifier)
            ? { path: args.path, external: true }
            : { errors: result.errors }
        }

        if (
          result.external ||
          result.path.includes("/node_modules/") ||
          isSubject(result.path)
        ) {
          return { path: args.path, external: true }
        }

        const edges =
          imports.get(args.importer) ?? new Map()

        imports.set(args.importer, edges)
        edges.set(args.path, result.path)

        if (
          specifier !== args.path ||
          !moduleFile.test(result.path)
        ) {
          // The file is loaded as text or a URL, not as a module, so it
          // is hashed byte for byte and nothing is read from it.
          rawFiles.add(result.path)

          if (!imports.has(result.path)) {
            imports.set(result.path, new Map())
          }

          return { path: args.path, external: true }
        }

        return { path: result.path }
      })
    },
  }

  /** @type {import("esbuild").Metafile | undefined} */
  let metafile

  try {
    const result = await build({
      absWorkingDir: root,
      entryPoints: entries,
      bundle: true,
      write: false,
      metafile: true,
      outdir: "requirements-graph",
      format: "esm",
      platform: "browser",
      splitting: true,
      jsx: "automatic",
      conditions: ["source", "style"],
      resolveExtensions: viteExtensions,
      logLevel: "silent",
      plugins: [boundaries],
    })

    metafile = result.metafile
  } catch (error) {
    const failures =
      error &&
      typeof error === "object" &&
      "errors" in error &&
      Array.isArray(error.errors)
        ? /** @type {import("esbuild").Message[]} */ (
            error.errors
          )
        : []

    for (const failure of failures) {
      problems.push({
        file: failure.location
          ? toPosix(
              relative(
                root,
                resolve(root, failure.location.file),
              ),
            )
          : (entries[0] ?? ""),
        line: failure.location?.line ?? 1,
        column: (failure.location?.column ?? 0) + 1,
        rule: "unresolved-import",
        message: `${failure.text}. The lock hashes every file a scenario loads, so every import must resolve.`,
      })
    }

    if (failures.length === 0) {
      throw error
    }
  }

  for (const input of Object.keys(metafile?.inputs ?? {})) {
    const absolutePath = resolve(root, input)

    if (!imports.has(absolutePath)) {
      imports.set(absolutePath, new Map())
    }
  }

  // Vite also loads `new URL("./file", import.meta.url)`, which esbuild
  // leaves alone. Such a file can be a worker or data a test reads.
  for (const [file, edges] of [...imports]) {
    if (
      !/\.[cm]?[jt]sx?$/.test(file) ||
      !existsSync(file)
    ) {
      continue
    }

    for (const match of readFileSync(file, "utf8").matchAll(
      urlImport,
    )) {
      const specifier = match[2] ?? ""
      const target = resolve(dirname(file), specifier)

      if (!specifier.startsWith(".")) {
        continue
      }

      if (!existsSync(target)) {
        problems.push({
          file: toPosix(relative(root, file)),
          line: 1,
          column: 1,
          rule: "unresolved-import",
          message: `new URL("${specifier}", import.meta.url) names a file that does not exist. The lock hashes every file a scenario loads, so every import must resolve.`,
        })
        continue
      }

      edges.set(`new URL(${specifier})`, target)
      rawFiles.add(target)

      if (!imports.has(target)) {
        imports.set(target, new Map())
      }
    }
  }

  /** @param {string} entry */
  const closureOf = (entry) => {
    const start = resolve(root, entry)
    /** @type {Set<string>} */
    const reached = new Set()
    const pending = [start]

    while (pending.length > 0) {
      const file = /** @type {string} */ (pending.pop())

      if (reached.has(file) || !imports.has(file)) {
        continue
      }

      reached.add(file)
      pending.push(...(imports.get(file)?.values() ?? []))
    }

    return reached
  }

  return { imports, rawFiles, closureOf, problems }
}
