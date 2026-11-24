import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
} from "node:path"

import { transformSync } from "esbuild"
import ts from "typescript"

import { configFileName } from "./config.js"
import { readGraph } from "./graph.js"

/**
 * Everything the checker knows about step code, read from source
 * without running it.
 *
 * Importing the step files is not an option: they import stories,
 * the stories import components, and the components need a browser.
 * The TypeScript parser needs none of that, and a step definition
 * written as `Then("literal", …)` is fully described by its syntax.
 * That is why the checker REQUIRES the literal form — a pattern
 * built at runtime is a pattern no static tool can trace. Which files
 * each step file loads comes from esbuild (see `graph.js`).
 *
 * @typedef {"Given" | "When" | "Then"} StepKind
 *
 * @typedef {{
 *   key: string,
 *   kind: StepKind,
 *   expression: string,
 *   file: string,
 *   line: number,
 *   column: number,
 *   summary: string,
 * }} StepDefinition
 *
 * @typedef {{
 *   name: string,
 *   regexp: RegExp,
 *   file: string,
 *   line: number,
 * }} ParameterTypeDefinition
 *
 * @typedef {{
 *   key: string,
 *   file: string,
 *   line: number,
 *   hash: string,
 *   isExternal: boolean,
 *   isHelper: boolean,
 * }} CodeUnit
 *
 * @typedef {import("./features.js").Problem} Problem
 */

const stepKinds = new Set(["Given", "When", "Then"])

/**
 * `JSON.parse` after dropping a byte-order mark, which Vite accepts.
 *
 * @param {string} text
 * @returns {any}
 */
const parseJson = (text) =>
  JSON.parse(text.replace(/^\uFEFF/, ""))

/** A JSON file that parses, but is not the object it must be. */
class NotAnObjectError extends Error {}

/**
 * A `package.json` parsed, which must be an object. `null`, an array,
 * or a bare value parses as JSON, but no tool can read fields from it.
 *
 * @param {string} text
 * @returns {Record<string, any>}
 */
const parseManifest = (text) => {
  const manifest = parseJson(text)

  if (
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest)
  ) {
    throw new NotAnObjectError()
  }

  return manifest
}

/**
 * Only the fields that decide which code runs. A release bumps
 * `version` in every package.json; that must not mark requirements
 * changed, or every release would stale the lock on master.
 * Dependency versions are the pnpm lockfile's job.
 *
 * @param {string} text
 */
const packageManifestText = (text) => {
  const manifest = parseManifest(text)

  return JSON.stringify(
    [
      "name",
      "type",
      "main",
      "module",
      "exports",
      "imports",
    ].map((field) => [field, manifest[field] ?? null]),
  )
}

/**
 * True when the module calls `import.meta.glob`, read from the AST,
 * so a comment that mentions it does not count.
 *
 * @param {ts.SourceFile} sourceFile
 */
const callsGlob = (sourceFile) => {
  let found = false

  /** @param {ts.Node} node */
  const visit = (node) => {
    if (
      !found &&
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "glob" &&
      ts.isMetaProperty(node.expression.expression)
    ) {
      found = true
    }

    if (!found) {
      ts.forEachChild(node, visit)
    }
  }

  visit(sourceFile)

  return found
}

/** @param {string} text */
const hashText = (text) =>
  createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 16)

/** esbuild loaders for the files Vite compiles. */
const loaders = /** @type {const} */ ({
  ".ts": "ts",
  ".mts": "ts",
  ".cts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".jsx": "jsx",
})

/**
 * A file's hash, taken from what runs rather than what is written.
 * A file read as bytes or a URL (`as: "bytes"`) is hashed byte for
 * byte. A `package.json` that chose an import's target, or that a
 * runtime list names (`as: "manifest"`), counts only for the fields
 * that choose code; imported as data, it counts whole.
 *
 * Code is hashed as esbuild compiles it, the same compiler Vite uses
 * for TypeScript: comments, formatting, and types are gone, so a
 * Biome reflow or a new type annotation does not mark requirements
 * changed. `verbatimModuleSyntax` keeps every value import, even an
 * unused one, because importing a module runs its top-level code.
 *
 * CSS is hashed as esbuild prints it, which drops comments and layout
 * but keeps selectors and strings exact.
 *
 * @param {string} absolutePath
 * @param {"code" | "bytes" | "manifest"} [as]
 * @returns {string}
 */
const hashFile = (absolutePath, as = "code") => {
  const extension = extname(absolutePath)
  const loader =
    loaders[/** @type {keyof typeof loaders} */ (extension)]

  if (as === "bytes") {
    return createHash("sha256")
      .update(readFileSync(absolutePath))
      .digest("hex")
      .slice(0, 16)
  }

  if (loader) {
    return hashText(
      transformSync(readFileSync(absolutePath, "utf8"), {
        loader,
        jsx: "preserve",
        legalComments: "none",
        target: "esnext",
        sourcefile: absolutePath,
        tsconfigRaw: {
          compilerOptions: { verbatimModuleSyntax: true },
        },
      }).code,
    )
  }

  if (extension === ".css") {
    return hashText(
      transformSync(readFileSync(absolutePath, "utf8"), {
        loader: "css",
        legalComments: "none",
        sourcefile: absolutePath,
      }).code,
    )
  }

  if (as === "manifest") {
    return hashText(
      packageManifestText(
        readFileSync(absolutePath, "utf8"),
      ),
    )
  }

  if (extension === ".json") {
    return hashText(
      JSON.stringify(
        parseJson(readFileSync(absolutePath, "utf8")),
      ),
    )
  }

  return createHash("sha256")
    .update(readFileSync(absolutePath))
    .digest("hex")
    .slice(0, 16)
}

/**
 * @param {string} absolutePath
 * @param {string} text
 */
const parseSource = (absolutePath, text) =>
  ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.[jt]sx$/.test(absolutePath)
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )

/** Runtime files that are graph entries: code and stylesheets. */
const graphEntry = /\.(?:[cm]?[jt]sx?|css)$/

/** Files the walker reads as modules: TypeScript and JavaScript. */
const codeFile = /\.[cm]?[jt]sx?$/

/**
 * @param {ts.SourceFile} sourceFile
 * @param {ts.Node} node
 */
const lineOf = (sourceFile, node) => {
  const position = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  )

  return {
    line: position.line + 1,
    column: position.character + 1,
  }
}

/**
 * The first sentence of the JSDoc above a step definition, which the
 * trace prints so a reader learns what a step checks without
 * opening the file.
 *
 * @param {ts.Node} node
 */
const summaryOf = (node) => {
  /** @type {ts.Node | undefined} */
  let current = node

  while (current && !ts.isExpressionStatement(current)) {
    current = current.parent
  }

  if (!current) {
    return ""
  }

  const docs = ts.getJSDocCommentsAndTags(current)
  const comment = docs
    .map((doc) =>
      typeof doc.comment === "string"
        ? doc.comment
        : (doc.comment ?? [])
            .map((part) => part.text)
            .join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  return comment
}

/**
 * @param {string} fromFile absolute
 * @param {string} specifier
 * @returns {string | null} absolute path of an existing file
 */
const resolveRelative = (fromFile, specifier) => {
  const candidates = relativeCandidates(fromFile, specifier)

  // A directory's own `package.json` can point Vite anywhere.
  return candidates.length === 1 &&
    candidates[0] !==
      join(
        resolve(dirname(fromFile), specifier),
        "package.json",
      )
    ? candidates[0]
    : null
}

/** Vite's default `resolve.extensions`, in its order. */
const viteExtensions = [
  ".mjs",
  ".js",
  ".mts",
  ".ts",
  ".jsx",
  ".tsx",
  ".json",
]

/** @param {string} path */
const isExistingFile = (path) =>
  existsSync(path) && statSync(path).isFile()

/**
 * Every file Vite could load for a relative specifier. A specifier
 * that names a file exactly has one. Otherwise more than one means
 * the checker cannot know which runs: Vite tries `.js` before `.ts`,
 * so `./queries` can load a `queries.js` placed beside `queries.ts`.
 *
 * @param {string} fromFile
 * @param {string} specifier
 * @returns {string[]}
 */
const relativeCandidates = (fromFile, specifier) => {
  if (!specifier.startsWith(".")) {
    return []
  }

  const base = resolve(dirname(fromFile), specifier)

  if (isExistingFile(base)) {
    return [base]
  }

  // TypeScript lets `./weak.js` name `weak.ts`.
  const withoutJs = base.replace(/\.[cm]?jsx?$/, "")

  return [
    ...new Set([
      ...viteExtensions.map(
        (extension) => `${base}${extension}`,
      ),
      ...(withoutJs === base
        ? []
        : [".ts", ".mts", ".tsx"].map(
            (extension) => `${withoutJs}${extension}`,
          )),
      // Vite reads a directory's `package.json` before its index.
      join(base, "package.json"),
      ...viteExtensions.map((extension) =>
        join(base, `index${extension}`),
      ),
    ]),
  ].filter(isExistingFile)
}

/**
 * A JSX pragma comment changes which module compiles the file's JSX.
 *
 * @param {ts.SourceFile} sourceFile
 */
const hasJsxPragma = (sourceFile) =>
  /@jsx(?:ImportSource|Runtime|Frag)?\b/.test(
    sourceFile.text,
  )

/**
 * @typedef {{
 *   absolutePath: string,
 *   file: string,
 *   sourceFile: ts.SourceFile,
 *   imports: Map<string, { specifier: string, importedName: string, isTypeOnly: boolean }>,
 *   declarations: Map<string, ts.Node>,
 *   exported: Set<string>,
 * }} SourceModule
 */

/**
 * The names a module imports, declares, and exports. The checker
 * needs these for the step rules and the trace, not to resolve
 * imports: esbuild does that.
 *
 * @param {string} root absolute
 * @param {string} absolutePath
 * @returns {SourceModule}
 */
const readModule = (root, absolutePath) => {
  const sourceFile = parseSource(
    absolutePath,
    readFileSync(absolutePath, "utf8"),
  )
  /** @type {SourceModule["imports"]} */
  const imports = new Map()
  /** @type {SourceModule["declarations"]} */
  const declarations = new Map()
  /** @type {Set<string>} */
  const exported = new Set()

  /** @param {ts.Node} node */
  const hasModifier = (
    node,
    /** @type {ts.SyntaxKind} */ kind,
  ) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === kind,
    )

  /**
   * @param {string} name
   * @param {ts.Node} statement
   * @param {ts.Node} node
   */
  const declare = (name, statement, node) => {
    declarations.set(name, node)

    if (
      hasModifier(statement, ts.SyntaxKind.ExportKeyword)
    ) {
      exported.add(name)
    }

    if (
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
    ) {
      declarations.set("default", node)
    }
  }

  for (const statement of sourceFile.statements) {
    if (
      hasModifier(statement, ts.SyntaxKind.DeclareKeyword)
    ) {
      continue
    }

    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const specifier = statement.moduleSpecifier.text
      const clause = statement.importClause
      const isTypeOnly = Boolean(clause?.isTypeOnly)

      if (clause?.name) {
        imports.set(clause.name.text, {
          specifier,
          importedName: "default",
          isTypeOnly,
        })
      }

      if (
        clause?.namedBindings &&
        ts.isNamedImports(clause.namedBindings)
      ) {
        for (const element of clause.namedBindings
          .elements) {
          imports.set(element.name.text, {
            specifier,
            importedName: (
              element.propertyName ?? element.name
            ).text,
            isTypeOnly: isTypeOnly || element.isTypeOnly,
          })
        }
      }

      if (
        clause?.namedBindings &&
        ts.isNamespaceImport(clause.namedBindings)
      ) {
        imports.set(clause.namedBindings.name.text, {
          specifier,
          importedName: "*",
          isTypeOnly,
        })
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      declare(statement.name.text, statement, statement)
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList
        .declarations) {
        if (ts.isIdentifier(declaration.name)) {
          declare(
            declaration.name.text,
            statement,
            declaration,
          )
        }
      }
    } else if (
      ts.isExportAssignment(statement) &&
      !statement.isExportEquals
    ) {
      declarations.set("default", statement)
    }
  }

  /**
   * `import("./late.ts")` loads the whole module, like a namespace
   * import.
   *
   * @param {ts.Node} node
   */
  const findDynamicImports = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind ===
        ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      const specifier = node.arguments[0].text

      imports.set(`import(${specifier})`, {
        specifier,
        importedName: "*",
        isTypeOnly: false,
      })
    }

    ts.forEachChild(node, findDynamicImports)
  }

  findDynamicImports(sourceFile)

  return {
    absolutePath,
    file: relative(root, absolutePath)
      .split("\\")
      .join("/"),
    sourceFile,
    imports,
    declarations,
    exported,
  }
}

/**
 * Each `import(…)` whose path is not a string literal. esbuild cannot
 * follow it, so neither can the lock.
 *
 * @param {ts.SourceFile} sourceFile
 * @returns {ts.Node[]}
 */
const computedImports = (sourceFile) => {
  /** @type {ts.Node[]} */
  const found = []

  /** @param {ts.Node} node */
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind ===
        ts.SyntaxKind.ImportKeyword &&
      !(
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      )
    ) {
      found.push(node)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return found
}

/**
 * Reads the step code and finds the files each step file loads.
 *
 * The lock records files, not functions. Each scenario loads the
 * runtime files (the setup file, the World, the step wrapper, the
 * parameter types, and the Vitest configs) and everything they
 * import; those are the shared files, hashed once. Each step file
 * adds the files it imports beyond those, such as its helpers and
 * stories. A requirement reaches the files of every step file whose
 * definitions its steps use.
 *
 * @param {import("./config.js").RequirementsProject} project
 */
export const readSources = async (project) => {
  const { root, config } = project
  /** @type {Problem[]} */
  const problems = []
  /** @type {StepDefinition[]} */
  const definitions = []
  /** @type {ParameterTypeDefinition[]} */
  const parameterTypes = []
  /** @type {Map<string, SourceModule>} */
  const modules = new Map()
  /** @type {Map<string, ts.Node>} step key -> call */
  const definitionNodes = new Map()
  const stepModulePath = resolve(root, config.stepModule)
  // The config is always shared: moving a story into `subjects`
  // would otherwise stop the lock from hashing it, unnoticed.
  const runtimeFiles = new Set([
    ...project.runtimeFiles,
    config.stepModule,
    configFileName,
  ])

  for (const file of project.sourceFiles) {
    const absolutePath = resolve(root, file)

    modules.set(
      absolutePath,
      readModule(root, absolutePath),
    )
  }

  /** @param {string} absolutePath */
  const moduleAt = (absolutePath) => {
    const existing = modules.get(absolutePath)

    if (existing) {
      return existing
    }

    const created = readModule(root, absolutePath)

    modules.set(absolutePath, created)

    return created
  }

  /** @param {string} absolutePath */
  const toKey = (absolutePath) =>
    relative(root, absolutePath).split("\\").join("/")

  /** @type {Set<string>} */
  const checked = new Set()

  /**
   * The rules every loaded module must follow, wherever it lives: a
   * helper outside the requirements root that registers a hook
   * changes every scenario just the same.
   *
   * @param {SourceModule} module
   */
  const checkModule = (module) => {
    if (
      checked.has(module.absolutePath) ||
      module.absolutePath === stepModulePath
    ) {
      return
    }

    checked.add(module.absolutePath)

    if (
      module.file !== config.entry &&
      callsGlob(module.sourceFile)
    ) {
      problems.push({
        file: module.file,
        line: 1,
        column: 1,
        rule: "glob-outside-entry",
        message: `Only ${config.entry} may load files with import.meta.glob. A glob elsewhere loads files the lock cannot follow.`,
      })
    }

    if (hasJsxPragma(module.sourceFile)) {
      problems.push({
        file: module.file,
        line: 1,
        column: 1,
        rule: "jsx-pragma",
        message:
          "Remove the @jsx pragma comment. It changes which module compiles this file's JSX, and the lock cannot follow it.",
      })
    }

    for (const node of computedImports(module.sourceFile)) {
      problems.push({
        file: module.file,
        ...lineOf(module.sourceFile, node),
        rule: "dynamic-import",
        message:
          "Write `import()` with a string literal path, so the lock can follow it.",
      })
    }

    for (const [localName, imported] of module.imports) {
      const position = lineOf(
        module.sourceFile,
        module.sourceFile,
      )

      if (
        imported.specifier === "quickpickle" &&
        !imported.isTypeOnly &&
        !runtimeFiles.has(module.file)
      ) {
        problems.push({
          file: module.file,
          ...position,
          rule: stepKinds.has(imported.importedName)
            ? "direct-quickpickle-step"
            : "quickpickle-outside-runtime",
          message: stepKinds.has(imported.importedName)
            ? `Import ${imported.importedName} from ${config.stepModule}, not "quickpickle". The wrapper is what names a definition when its step fails, and the lock hashes it.`
            : `\`${localName}\` comes from "quickpickle" outside the runtime files (${config.runtime.join(", ")}). A hook or World change here would alter every scenario from one requirement's files. Move it into a runtime file; type-only imports are fine.`,
        })
      }

      if (
        imported.importedName === "*" &&
        resolveRelative(
          module.absolutePath,
          imported.specifier,
        ) === stepModulePath
      ) {
        problems.push({
          file: module.file,
          ...position,
          rule: "namespace-step-import",
          message: `Import Given, When, and Then from ${config.stepModule} by name. The checker reads only named step calls, so \`${localName}.Then(…)\` would run without being checked.`,
        })
      }
    }
  }

  for (const module of [...modules.values()]) {
    checkModule(module)
  }

  const entryPath = resolve(root, config.entry)

  if (existsSync(entryPath)) {
    const entry = moduleAt(entryPath)
    /** @type {Set<string>} */
    const registered = new Set()

    /** @param {ts.Node} node */
    const findGlobs = (node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(entry.sourceFile) ===
          "import.meta.glob"
      ) {
        const [patterns, options] = node.arguments
        const isEager =
          options &&
          ts.isObjectLiteralExpression(options) &&
          options.properties.some(
            (property) =>
              ts.isPropertyAssignment(property) &&
              ts.isIdentifier(property.name) &&
              property.name.text === "eager" &&
              property.initializer.kind ===
                ts.SyntaxKind.TrueKeyword,
          )
        const isStatement =
          ts.isExpressionStatement(node.parent) &&
          node.parent.parent === entry.sourceFile

        if (!isEager || !isStatement) {
          problems.push({
            file: entry.file,
            ...lineOf(entry.sourceFile, node),
            rule: "registration-mismatch",
            message:
              'Register step files with one top-level `import.meta.glob("…", { eager: true })` statement. A lazy or conditional glob never imports them, so their steps would not run.',
          })
        }

        const literals =
          patterns && ts.isArrayLiteralExpression(patterns)
            ? patterns.elements
            : patterns
              ? [patterns]
              : []

        for (const literal of literals) {
          if (ts.isStringLiteralLike(literal)) {
            registered.add(
              literal.text.replace(/^\.\//, ""),
            )
          } else {
            problems.push({
              file: entry.file,
              ...lineOf(entry.sourceFile, literal),
              rule: "registration-mismatch",
              message:
                'Write the step-file glob as a string literal, so the checker can compare it with requirements.config.json "stepFiles".',
            })
          }
        }
      }

      ts.forEachChild(node, findGlobs)
    }

    findGlobs(entry.sourceFile)

    const configured = new Set(config.stepFiles)

    if (
      registered.size !== configured.size ||
      [...registered].some(
        (pattern) => !configured.has(pattern),
      )
    ) {
      problems.push({
        file: entry.file,
        line: 1,
        column: 1,
        rule: "registration-mismatch",
        message: `${config.entry} loads ${[...registered].join(", ") || "no step files"}, but requirements.config.json "stepFiles" is ${config.stepFiles.join(", ")}. Make them equal, so the checker reads exactly the steps the runner registers.`,
      })
    }
  } else {
    problems.push({
      file: config.entry,
      line: 1,
      column: 1,
      rule: "registration-mismatch",
      message: `The setup file ${config.entry} does not exist. Set requirements.config.json "entry" to the file that registers the step files.`,
    })
  }

  for (const module of [...modules.values()]) {
    const isStepModule =
      module.absolutePath === stepModulePath
    const isStepFile = project.stepFiles.has(module.file)

    /** @param {ts.Node} node */
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression)
      ) {
        const calleeName = node.expression.text
        const imported = module.imports.get(calleeName)

        if (
          imported &&
          stepKinds.has(imported.importedName) &&
          !isStepModule
        ) {
          const position = lineOf(module.sourceFile, node)
          const target = resolveRelative(
            module.absolutePath,
            imported.specifier,
          )

          if (imported.specifier === "quickpickle") {
            // Reported once, at the import, above.
          } else if (
            target === stepModulePath &&
            !isStepFile
          ) {
            problems.push({
              file: module.file,
              ...position,
              rule: "step-outside-step-files",
              message: `${config.entry} never loads this file, so this ${imported.importedName} would not run. Move it into a file matching ${config.stepFiles.join(", ")}.`,
            })
          } else if (target === stepModulePath) {
            const [expressionNode, handler, priority] =
              node.arguments

            const body =
              handler && ts.skipParentheses(handler)

            if (
              !body ||
              (!ts.isArrowFunction(body) &&
                !ts.isFunctionExpression(body))
            ) {
              problems.push({
                file: module.file,
                ...position,
                rule: "step-handler-shape",
                message:
                  "Pass the step's code as an inline function. Any other expression runs when the step file loads, for every scenario, and the lock cannot tie it to this step.",
              })
            }

            if (priority) {
              problems.push({
                file: module.file,
                ...position,
                rule: "step-priority",
                message:
                  "Remove the priority argument. Two patterns that both match one step are an ambiguity to fix by rewording, and a priority hides it.",
              })
            }

            if (
              !expressionNode ||
              !ts.isStringLiteralLike(expressionNode)
            ) {
              problems.push({
                file: module.file,
                ...position,
                rule:
                  expressionNode &&
                  ts.isRegularExpressionLiteral(
                    expressionNode,
                  )
                    ? "regex-expression"
                    : "non-literal-expression",
                message:
                  "Write the pattern as one string literal Cucumber expression, such as `the {role} named {string} is disabled`. A regular expression or a computed pattern cannot be traced statically.",
              })
            } else {
              const kind = /** @type {StepKind} */ (
                imported.importedName
              )
              const expression = expressionNode.text
              const key = `${module.file} › ${kind} ${expression}`

              definitions.push({
                key,
                kind,
                expression,
                file: module.file,
                ...position,
                summary: summaryOf(node),
              })
              definitionNodes.set(key, node)
            }
          }
        }

        if (
          imported?.importedName ===
            "defineParameterType" &&
          imported.specifier === "quickpickle"
        ) {
          const [options] = node.arguments
          const position = lineOf(module.sourceFile, node)

          if (
            options &&
            ts.isObjectLiteralExpression(options)
          ) {
            /** @type {string | null} */
            let name = null
            /** @type {RegExp | null} */
            let regexp = null

            for (const property of options.properties) {
              if (
                ts.isPropertyAssignment(property) &&
                ts.isIdentifier(property.name)
              ) {
                if (
                  property.name.text === "name" &&
                  ts.isStringLiteralLike(
                    property.initializer,
                  )
                ) {
                  name = property.initializer.text
                }

                if (
                  property.name.text === "regexp" &&
                  ts.isRegularExpressionLiteral(
                    property.initializer,
                  )
                ) {
                  const literal = property.initializer.text
                  const lastSlash = literal.lastIndexOf("/")

                  regexp = new RegExp(
                    literal.slice(1, lastSlash),
                    literal.slice(lastSlash + 1),
                  )
                }
              }
            }

            if (name && regexp) {
              parameterTypes.push({
                name,
                regexp,
                file: module.file,
                line: position.line,
              })
            } else {
              problems.push({
                file: module.file,
                ...position,
                rule: "non-literal-parameter-type",
                message:
                  "Define a parameter type with a literal `name` string and a literal `regexp`, so the checker can match steps that use it.",
              })
            }
          }
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(module.sourceFile)
  }

  // Runtime stylesheets are entries too, so their `@import`s count.
  const runtimeCode = [...runtimeFiles].filter(
    (file) =>
      graphEntry.test(file) &&
      existsSync(resolve(root, file)),
  )
  const graph = await readGraph(
    { root, subjects: config.subjects },
    [...new Set([...project.stepFiles, ...runtimeCode])],
  )

  problems.push(...graph.problems)

  /**
   * Files every scenario loads.
   *
   * @type {Set<string>}
   */
  const shared = new Set()

  for (const file of runtimeFiles) {
    const absolutePath = resolve(root, file)

    if (!existsSync(absolutePath)) {
      continue
    }

    if (graphEntry.test(file)) {
      for (const loaded of graph.closureOf(file)) {
        shared.add(loaded)
      }
    } else {
      shared.add(absolutePath)
    }
  }

  /**
   * The files each step file adds to what every scenario loads.
   *
   * @type {Map<string, Set<string>>}
   */
  const stepFileReach = new Map()

  for (const file of project.stepFiles) {
    stepFileReach.set(
      file,
      new Set(
        [...graph.closureOf(file)].filter(
          (loaded) => !shared.has(loaded),
        ),
      ),
    )
  }

  /** @type {Map<string, CodeUnit>} */
  const units = new Map()

  for (const absolutePath of [
    ...shared,
    ...[...stepFileReach.values()].flatMap((files) => [
      ...files,
    ]),
  ]) {
    const key = toKey(absolutePath)

    if (units.has(key)) {
      continue
    }

    // A file read only as text (`?raw`) never runs, so the rules for
    // code do not apply to it.
    if (
      codeFile.test(absolutePath) &&
      graph.modules.has(absolutePath)
    ) {
      checkModule(moduleAt(absolutePath))
    }

    /** @type {string} */
    let hash

    try {
      hash = hashFile(
        absolutePath,
        // The strictest use wins: bytes, then data, where every JSON
        // field counts, then a manifest, where only the fields that
        // choose code count.
        graph.rawFiles.has(absolutePath)
          ? "bytes"
          : graph.dataFiles.has(absolutePath)
            ? "code"
            : graph.manifests.has(absolutePath) ||
                (runtimeFiles.has(key) &&
                  basename(absolutePath) === "package.json")
              ? "manifest"
              : "code",
      )
    } catch (error) {
      problems.push({
        file: key,
        line: 1,
        column: 1,
        rule: "unreadable-file",
        message: `The lock cannot hash this file: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      })
      hash = ""
    }

    units.set(key, {
      key,
      file: key,
      line: 1,
      hash,
      isExternal: key.startsWith(".."),
      isHelper: project.helperFiles.has(key),
    })
  }

  /**
   * The files a definition's step file adds: the code that differs
   * from one requirement to the next.
   *
   * @param {StepDefinition} definition
   * @returns {Set<string>}
   */
  const reachOf = (definition) =>
    new Set(
      [...(stepFileReach.get(definition.file) ?? [])]
        .map(toKey)
        .sort(),
    )

  /**
   * @param {SourceModule} module
   * @param {string} specifier
   */
  const resolveImport = (module, specifier) =>
    graph.imports
      .get(module.absolutePath)
      ?.get(specifier) ??
    resolveRelative(module.absolutePath, specifier)

  /**
   * Where a name is declared, following re-exports. Only the trace
   * uses this, to print a line; the lock does not depend on it.
   *
   * @param {string} path
   * @param {string} name
   * @param {number} [depth]
   * @returns {{ path: string, line: number } | null}
   */
  const declarationOf = (path, name, depth = 0) => {
    if (
      depth > 8 ||
      !codeFile.test(path) ||
      !existsSync(path)
    ) {
      return null
    }

    const module = moduleAt(path)
    const declaration = module.declarations.get(name)

    if (declaration) {
      return {
        path,
        line: lineOf(module.sourceFile, declaration).line,
      }
    }

    for (const statement of module.sourceFile.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        continue
      }

      const next = resolveImport(
        module,
        statement.moduleSpecifier.text,
      )
      const clause = statement.exportClause
      const element =
        clause && ts.isNamedExports(clause)
          ? clause.elements.find(
              (candidate) => candidate.name.text === name,
            )
          : undefined

      if (!next || (clause && !element)) {
        continue
      }

      const found = declarationOf(
        next,
        element?.propertyName?.text ?? name,
        depth + 1,
      )

      if (found) {
        return found
      }
    }

    return null
  }

  /**
   * The imported functions a definition calls directly, each with the
   * line that declares it, so the trace can name them.
   *
   * @param {StepDefinition} definition
   * @returns {{ name: string, file: string, line: number | null }[]}
   */
  const callsOf = (definition) => {
    const node = definitionNodes.get(definition.key)
    const module = modules.get(
      resolve(root, definition.file),
    )

    if (!node || !module) {
      return []
    }

    /** @type {Map<string, { name: string, file: string, line: number | null }>} */
    const calls = new Map()

    /** @param {ts.Node} child */
    const visit = (child) => {
      if (
        ts.isCallExpression(child) &&
        ts.isIdentifier(child.expression)
      ) {
        const imported = module.imports.get(
          child.expression.text,
        )
        const target =
          imported &&
          !stepKinds.has(imported.importedName) &&
          resolveImport(module, imported.specifier)

        if (
          imported &&
          target &&
          !calls.has(child.expression.text)
        ) {
          const found = declarationOf(
            target,
            imported.importedName,
          )

          calls.set(child.expression.text, {
            name: imported.importedName,
            file: toKey(found?.path ?? target),
            line: found?.line ?? null,
          })
        }
      }

      ts.forEachChild(child, visit)
    }

    visit(node)

    return [...calls.values()]
  }

  /**
   * Helper exports that nothing imports: dead weight. A helper used
   * only inside its own file counts as used.
   */
  const unreachedHelpers = () => {
    /** @type {Map<string, Set<string>>} absolute path -> imported names */
    const used = new Map()
    const loaded = [
      ...new Set([
        ...modules.keys(),
        ...[...graph.imports.keys()].filter((path) =>
          codeFile.test(path),
        ),
      ]),
    ]

    for (const path of loaded) {
      if (!existsSync(path)) {
        continue
      }

      const module = moduleAt(path)

      for (const imported of module.imports.values()) {
        if (imported.isTypeOnly) {
          continue
        }

        const target = resolveImport(
          module,
          imported.specifier,
        )

        if (target) {
          const names = used.get(target) ?? new Set()

          names.add(imported.importedName)
          used.set(target, names)
        }
      }
    }

    /** @type {Problem[]} */
    const unused = []

    for (const module of modules.values()) {
      if (!project.helperFiles.has(module.file)) {
        continue
      }

      const names =
        used.get(module.absolutePath) ?? new Set()

      for (const name of module.exported) {
        const node = module.declarations.get(name)

        if (
          !node ||
          names.has(name) ||
          names.has("*") ||
          isUsedLocally(module.sourceFile, name, node)
        ) {
          continue
        }

        unused.push({
          file: module.file,
          ...lineOf(module.sourceFile, node),
          rule: "unused-helper",
          message: `No step uses \`${name}\`. Delete it, or add it with the scenario that needs it.`,
        })
      }
    }

    return unused
  }

  const runtimeKeys = [...shared].map(toKey).sort()

  for (const file of project.stepFiles) {
    if (
      !definitions.some(
        (definition) => definition.file === file,
      )
    ) {
      problems.push({
        file,
        line: 1,
        column: 1,
        rule: "step-file-without-steps",
        message:
          "A step file must define at least one step. Setup code that runs for every scenario belongs in the runtime files (support/), where the lock hashes it for every requirement.",
      })
    }
  }

  return {
    definitions,
    parameterTypes,
    problems,
    callsOf,
    reachOf,
    runtimeKeys,
    units,
    unreachedHelpers,
  }
}

/**
 * True when `name` appears in its own file outside its declaration,
 * as when one helper calls another.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {string} name
 * @param {ts.Node} declaration
 */
const isUsedLocally = (sourceFile, name, declaration) => {
  let found = false

  /** @param {ts.Node} node */
  const visit = (node) => {
    if (found) {
      return
    }

    if (
      ts.isIdentifier(node) &&
      node.text === name &&
      !(
        node.pos >= declaration.pos &&
        node.end <= declaration.end
      )
    ) {
      found = true

      return
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return found
}
