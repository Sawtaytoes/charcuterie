import { existsSync, globSync, readFileSync } from "node:fs"
import { isBuiltin } from "node:module"
import {
  dirname,
  extname,
  join,
  matchesGlob,
  relative,
  resolve,
} from "node:path"

import { build } from "esbuild"
import ts from "typescript"

/**
 * Which files a module loads, as a bundler resolves them.
 *
 * The lock needs to know every file a scenario runs. Resolving
 * imports by hand means re-implementing Vite: extension order,
 * `package.json` `exports` conditions, `export *`, JSON modules, and
 * CSS `@import`. esbuild already does all of that, so the checker asks
 * it for the import graph and hashes the files it lists. The output
 * itself is thrown away.
 *
 * Three kinds of import stop the walk:
 *
 * - npm packages (anything resolved inside `node_modules`). Their
 *   versions are the pnpm lockfile's job.
 * - the code under test, listed as `subjects` in the config. A
 *   component change is not a requirement change. A subject read as
 *   text (`?raw`) is still hashed, because then its bytes are the
 *   fixture.
 * - assets such as images and fonts. They are hashed as files, but
 *   nothing is read from them.
 *
 * @typedef {{
 *   imports: Map<string, Map<string, string>>,
 *   rawFiles: Set<string>,
 *   dataFiles: Set<string>,
 *   manifests: Set<string>,
 *   modules: Set<string>,
 *   closureOf: (entry: string) => Set<string>,
 *   problems: import("./features.js").Problem[],
 * }} ModuleGraph
 *
 * `imports` maps each loaded file (absolute) to its import specifiers
 * and the files they resolved to. `closureOf` lists every tracked file
 * an entry loads, itself included. `rawFiles` are files some module
 * reads as bytes (`?raw`, `?url`, or a `new URL(…, import.meta.url)`
 * asset), so their comments matter. `dataFiles` are JSON files some
 * module imports as data, so every field counts. `manifests` are the
 * `package.json` files whose `exports` chose a workspace import's
 * target, or that set how its files are read. `modules` are the files
 * that run as code.
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

/**
 * Export conditions as Vite's dev server applies them in the browser,
 * plus `source`, which Charcuterie's workspace packages use to point at
 * the source `pnpm build` compiles, and `style`, which CSS packages use.
 * The order here does not matter: each package's `exports` order picks.
 */
const conditions = [
  "source",
  "development",
  "module",
  "browser",
  "style",
]

/** Files esbuild reads as modules. Anything else is an asset. */
const moduleFile = /\.(?:[cm]?[jt]sx?|json|css)$/

/** Code that can be an entry, such as a worker. */
const codeFile = /\.[cm]?[jt]sx?$/

/** Vite import suffixes such as `?raw` and `?worker`. */
const querySuffix = /\?.*$/

/** Queries that load a file's bytes or its URL, not its code. */
const byteQuery = /[?&](?:raw|url)(?:[&=]|$)/

/** @param {string} specifier */
const isBareSpecifier = (specifier) =>
  !specifier.startsWith(".") && !specifier.startsWith("/")

/**
 * @param {string} path
 */
const toPosix = (path) => path.split("\\").join("/")

/**
 * A bare specifier's package name: `@scope/name` or `name`.
 *
 * @param {string} specifier
 */
const packageNameOf = (specifier) =>
  specifier
    .split("/")
    .slice(0, specifier.startsWith("@") ? 2 : 1)
    .join("/")

/**
 * The `package.json` files that decide what a package import loads:
 * the package's own, whose `exports` chose the file, and the nearest
 * one above the file, whose `type` says how a `.js` file is read.
 *
 * @param {string} path the resolved file
 * @param {string} specifier the bare specifier that chose it
 * @returns {string[]}
 */
const manifestsOf = (path, specifier) => {
  const name = packageNameOf(specifier)
  /** @type {string[]} */
  const found = []
  let directory = dirname(path)

  while (directory !== dirname(directory)) {
    const candidate = join(directory, "package.json")

    if (existsSync(candidate)) {
      if (found.length === 0) {
        found.push(candidate)
      }

      try {
        if (
          JSON.parse(readFileSync(candidate, "utf8"))
            .name === name
        ) {
          if (!found.includes(candidate)) {
            found.push(candidate)
          }

          return found
        }
      } catch {
        // The lock reports a manifest it cannot read when it hashes it.
      }
    }

    directory = dirname(directory)
  }

  return found
}

/** TypeScript script kinds for the code files the URL scan reads. */
const scriptKinds = /** @type {const} */ ({
  ".ts": ts.ScriptKind.TS,
  ".mts": ts.ScriptKind.TS,
  ".cts": ts.ScriptKind.TS,
  ".tsx": ts.ScriptKind.TSX,
  ".js": ts.ScriptKind.JS,
  ".mjs": ts.ScriptKind.JS,
  ".cjs": ts.ScriptKind.JS,
  ".jsx": ts.ScriptKind.JSX,
})

/**
 * @typedef {{
 *   specifier: string,
 *   isPattern: boolean,
 *   line: number,
 *   column: number,
 * }} UrlImport
 *
 * `isPattern` marks a template such as `./${name}.json`, which Vite
 * resolves as a glob, with `*` in place of each expression.
 */

/**
 * The `new URL(…, import.meta.url)` calls in a module, read from its
 * syntax tree, so a comment or a string that mentions one does not
 * count.
 *
 * @param {string} file
 * @returns {UrlImport[]}
 */
const urlImportsIn = (file) => {
  const scriptKind =
    scriptKinds[
      /** @type {keyof typeof scriptKinds} */ (
        extname(file)
      )
    ]

  if (scriptKind === undefined) {
    return []
  }

  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  )
  /** @type {UrlImport[]} */
  const found = []

  /** @param {ts.Node} node */
  const isImportMetaUrl = (node) =>
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "url" &&
    ts.isMetaProperty(node.expression) &&
    node.expression.keywordToken ===
      ts.SyntaxKind.ImportKeyword

  /** @param {ts.Node} node */
  const visit = (node) => {
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "URL" &&
      node.arguments?.length === 2 &&
      isImportMetaUrl(node.arguments[1])
    ) {
      const [target] = node.arguments
      const position = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      )
      const at = {
        line: position.line + 1,
        column: position.character + 1,
      }

      if (
        ts.isStringLiteral(target) ||
        ts.isNoSubstitutionTemplateLiteral(target)
      ) {
        found.push({
          specifier: target.text,
          isPattern: false,
          ...at,
        })
      } else if (ts.isTemplateExpression(target)) {
        found.push({
          specifier: [
            target.head.text,
            ...target.templateSpans.map(
              (span) => `*${span.literal.text}`,
            ),
          ]
            .join("")
            // Two expressions side by side are still one wildcard.
            .replace(/\*{2,}/g, "*"),
          isPattern: true,
          ...at,
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  return found
}

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
  /** @type {Set<string>} */
  const dataFiles = new Set()
  /** @type {Set<string>} */
  const manifests = new Set()
  /** @type {Set<string>} */
  const modules = new Set()
  /** @type {import("./features.js").Problem[]} */
  const problems = []
  /** @type {Set<string>} */
  const queued = new Set()
  /** Every file built as an entry so far, root-relative. */
  /** @type {Set<string>} */
  const scheduled = new Set()

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

  /**
   * @param {string} importer
   * @param {string} specifier
   * @param {string} target
   */
  const addEdge = (importer, specifier, target) => {
    const edges = imports.get(importer) ?? new Map()

    imports.set(importer, edges)
    edges.set(specifier, target)

    if (!imports.has(target)) {
      imports.set(target, new Map())
    }
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
        // A CSS `url()` reads the file as an asset, as `?url` does.
        const isBytes =
          byteQuery.test(args.path) ||
          args.kind === "url-token"
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
          (isSubject(result.path) && !isBytes)
        ) {
          return { path: args.path, external: true }
        }

        if (isBareSpecifier(specifier) && args.importer) {
          // Its `exports` chose this file, so it is part of the import.
          for (const manifest of manifestsOf(
            result.path,
            specifier,
          )) {
            manifests.add(manifest)
            addEdge(
              args.importer,
              `${specifier} (${toPosix(relative(root, manifest))})`,
              manifest,
            )
          }
        }

        if (args.importer) {
          addEdge(args.importer, args.path, result.path)
        }

        if (isBytes || !moduleFile.test(result.path)) {
          // Loaded as bytes or a URL, not as a module, so it is hashed
          // byte for byte and nothing it imports runs.
          rawFiles.add(result.path)

          return { path: args.path, external: true }
        }

        if (specifier !== args.path) {
          // Any other query, such as `?inline` or `?worker`, still
          // compiles the file and what it imports, but exports
          // something else, so it is built as its own entry.
          if (!modules.has(result.path)) {
            queued.add(result.path)
          }

          return { path: args.path, external: true }
        }

        if (result.path.endsWith(".json")) {
          dataFiles.add(result.path)
        }

        return { path: result.path }
      })
    },
  }

  /** @param {string[]} batch */
  const buildBatch = async (batch) => {
    for (const entry of batch) {
      scheduled.add(entry)
    }

    try {
      const result = await build({
        absWorkingDir: root,
        // Each entry gets its own output name. Two entries such as
        // `target.ts?worker` and `target.js?worker` would otherwise
        // both write `target.js`, and the build would fail.
        entryPoints: batch.map((entry) => ({
          in: entry,
          out: `entry-${scheduled.size}-${batch.indexOf(entry)}`,
        })),
        bundle: true,
        write: false,
        metafile: true,
        outdir: "requirements-graph",
        format: "esm",
        platform: "browser",
        splitting: true,
        jsx: "automatic",
        conditions,
        resolveExtensions: viteExtensions,
        logLevel: "silent",
        plugins: [boundaries],
      })

      for (const input of Object.keys(
        result.metafile.inputs,
      )) {
        const absolutePath = resolve(root, input)

        modules.add(absolutePath)

        if (!imports.has(absolutePath)) {
          imports.set(absolutePath, new Map())
        }
      }
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
            : (batch[0] ?? ""),
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
  }

  /** @type {Set<string>} */
  const scanned = new Set()
  let batch = [...new Set(entries)]

  /**
   * Whether a file still needs its own build. Each round builds only
   * files no earlier round built, so the loop ends.
   *
   * @param {string} path absolute
   */
  const isPending = (path) =>
    !modules.has(path) &&
    !scheduled.has(toPosix(relative(root, path)))

  // Vite also loads `new URL("./file", import.meta.url)`, which esbuild
  // leaves alone. A code target is a worker: it is built like an entry,
  // so what it imports is followed. Anything else is data, read as
  // bytes. Workers can load more workers, so this repeats until no
  // new file turns up.
  while (batch.length > 0) {
    await buildBatch(batch)

    /** @type {Set<string>} */
    const next = new Set(
      [...queued]
        .filter(isPending)
        .map((path) => toPosix(relative(root, path))),
    )

    queued.clear()

    for (const file of modules) {
      if (scanned.has(file) || !codeFile.test(file)) {
        continue
      }

      scanned.add(file)

      for (const url of urlImportsIn(file)) {
        const { specifier } = url
        /** @param {string} message */
        const report = (message) =>
          problems.push({
            file: toPosix(relative(root, file)),
            line: url.line,
            column: url.column,
            rule: "unresolved-import",
            message,
          })

        if (/^[a-z][a-z\d+.-]*:/i.test(specifier)) {
          continue
        }

        if (specifier.startsWith("/")) {
          report(
            `new URL("${specifier}", import.meta.url) starts at the server root, which the lock cannot follow. Use a path relative to this file.`,
          )
          continue
        }

        if (url.isPattern && !specifier.startsWith(".")) {
          report(
            `new URL(\`${specifier}\`, import.meta.url) does not start with a relative folder, so the lock cannot tell which files it loads. Start the template with "./" or "../".`,
          )
          continue
        }

        const targets = url.isPattern
          ? globSync(specifier, { cwd: dirname(file) }).map(
              (match) => resolve(dirname(file), match),
            )
          : [resolve(dirname(file), specifier)].filter(
              (target) => existsSync(target),
            )

        if (targets.length === 0) {
          report(
            `new URL("${specifier}", import.meta.url) names ${url.isPattern ? "no file that exists" : "a file that does not exist"}. The lock hashes every file a scenario loads, so every import must resolve.`,
          )
          continue
        }

        for (const target of targets) {
          if (isSubject(target) && codeFile.test(target)) {
            continue
          }

          addEdge(file, `new URL(${specifier})`, target)

          if (codeFile.test(target)) {
            if (isPending(target)) {
              next.add(toPosix(relative(root, target)))
            }
          } else {
            rawFiles.add(target)
          }
        }
      }
    }

    batch = [...next]
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

  return {
    imports,
    rawFiles,
    dataFiles,
    manifests,
    modules,
    closureOf,
    problems,
  }
}
