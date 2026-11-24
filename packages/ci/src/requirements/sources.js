import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import {
  dirname,
  join,
  matchesGlob,
  relative,
  resolve,
} from "node:path"

import ts from "typescript"

/**
 * Everything the checker knows about step code, read from source
 * without running it.
 *
 * Importing the step files is not an option: they import stories,
 * the stories import components, and the components need a browser.
 * The TypeScript parser needs none of that, and a step definition
 * written as `Then("literal", …)` is fully described by its syntax.
 * That is why the checker REQUIRES the literal form — a pattern
 * built at runtime is a pattern no static tool can trace.
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
 * CSS without comments and layout, so a comment or a reflow does not
 * change a requirement. Strings are rare in token sheets and kept.
 *
 * @param {string} text
 */
const normalizeCss = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim()

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
 * A statement as it runs. An inline `type` specifier is erased like
 * `import type`, so adding one to an import is not a change.
 *
 * @param {ts.Node} statement
 * @param {ts.SourceFile} sourceFile
 */
const runtimeText = (statement, sourceFile) => {
  const bindings =
    ts.isImportDeclaration(statement) &&
    statement.importClause?.namedBindings
  const print = (/** @type {ts.Node} */ node) =>
    printer.printNode(
      ts.EmitHint.Unspecified,
      node,
      sourceFile,
    )

  if (
    !ts.isImportDeclaration(statement) ||
    !bindings ||
    !ts.isNamedImports(bindings)
  ) {
    return print(statement)
  }

  const defaultName =
    statement.importClause?.name?.text ?? ""
  const values = bindings.elements
    .filter((element) => !element.isTypeOnly)
    .map((element) => print(element))

  return `import ${defaultName}{${values.join(",")}} from ${print(statement.moduleSpecifier)}`
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

/**
 * Comments and formatting do not change what a step proves, so they
 * must not change its hash: a Biome reflow would otherwise mark
 * every requirement as changed. The printer drops comments and
 * normalizes layout; what is left is the code.
 */
const printer = ts.createPrinter({
  removeComments: true,
  newLine: ts.NewLineKind.LineFeed,
})

/**
 * @param {ts.Node} node
 * @param {ts.SourceFile} sourceFile
 */
const hashNode = (node, sourceFile) =>
  hashText(
    printer.printNode(
      ts.EmitHint.Unspecified,
      node,
      sourceFile,
    ),
  )

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
 * True when a JSON file is an object with `name` as a top-level key,
 * which Vite exports as a named export.
 *
 * @param {string} absolutePath
 * @param {string} name
 */
const jsonDeclares = (absolutePath, name) => {
  const parsed = jsonObjectAt(absolutePath)

  return parsed !== null && Object.hasOwn(parsed, name)
}

/**
 * The parsed object when the file is a JSON object; otherwise null.
 *
 * @param {string} absolutePath
 * @returns {Record<string, unknown> | null}
 */
const jsonObjectAt = (absolutePath) => {
  if (!absolutePath.endsWith(".json")) {
    return null
  }

  try {
    const parsed = parseJson(
      readFileSync(absolutePath, "utf8"),
    )

    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? parsed
      : null
  } catch {
    return null
  }
}

/** @param {ts.Node} statement */
const isAmbient = (statement) =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement) ?? []).some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.DeclareKeyword,
  )

/**
 * @param {ts.SourceFile} sourceFile
 * @param {string} name
 */
const declaresName = (sourceFile, name) =>
  (name === "default" &&
    sourceFile.statements.some(
      (statement) =>
        (ts.isExportAssignment(statement) &&
          !statement.isExportEquals) ||
        ((ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement)) &&
          (ts.getModifiers(statement) ?? []).some(
            (modifier) =>
              modifier.kind ===
              ts.SyntaxKind.DefaultKeyword,
          )),
    )) ||
  // Only an exported name counts: `export * from` still supplies a
  // name the module declares but does not export. A `declare` emits
  // nothing, so it does not count either.
  sourceFile.statements.some(
    (statement) =>
      !isAmbient(statement) &&
      (((ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
        statement.name?.text === name) ||
        (ts.isVariableStatement(statement) &&
          statement.declarationList.declarations.some(
            (declaration) =>
              ts.isIdentifier(declaration.name) &&
              declaration.name.text === name,
          ))) &&
      (ts.getModifiers(statement) ?? []).some(
        (modifier) =>
          modifier.kind === ts.SyntaxKind.ExportKeyword,
      ),
  ) ||
  sourceFile.statements.some(
    (statement) =>
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      !statement.isTypeOnly &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.some(
        (element) =>
          !element.isTypeOnly &&
          element.name.text === name &&
          (element.propertyName ?? element.name).text ===
            name &&
          !isTypeOnlyLocal(sourceFile, name),
      ),
  )

/**
 * A local name that only a type or an interface declares. TypeScript
 * erases `export { name }` for it, so it exports no value, and an
 * `export *` in the same file still supplies the runtime name.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {string} name
 */
const isTypeOnlyLocal = (sourceFile, name) => {
  /** @param {ts.Node} statement */
  const isTypeDeclaration = (statement) =>
    (ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)) &&
    statement.name.text === name

  /** @param {ts.Node} statement */
  const isValueDeclaration = (statement) =>
    ((ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement)) &&
      statement.name?.text === name) ||
    (ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) =>
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === name,
      )) ||
    (ts.isImportDeclaration(statement) &&
      !statement.importClause?.isTypeOnly &&
      (statement.importClause?.name?.text === name ||
        (statement.importClause?.namedBindings !==
          undefined &&
          (ts.isNamespaceImport(
            statement.importClause.namedBindings,
          )
            ? statement.importClause.namedBindings.name
                .text === name
            : statement.importClause.namedBindings.elements.some(
                (element) =>
                  !element.isTypeOnly &&
                  element.name.text === name,
              )))))

  return (
    sourceFile.statements.some(isTypeDeclaration) &&
    !sourceFile.statements.some(isValueDeclaration)
  )
}

/**
 * @typedef {{
 *   absolutePath: string,
 *   file: string,
 *   sourceFile: ts.SourceFile,
 *   imports: Map<string, { specifier: string, importedName: string, isTypeOnly: boolean }>,
 *   moduleStatements: ts.Node[],
 *   declarations: Map<string, ts.Node>,
 *   exported: Set<string>,
 *   methods: Map<string, ts.Node>,
 * }} SourceModule
 */

/** @param {ts.Node} node */
const isLiteral = (node) =>
  ts.isStringLiteral(node) ||
  ts.isNumericLiteral(node) ||
  ts.isBigIntLiteral(node) ||
  ts.isNoSubstitutionTemplateLiteral(node) ||
  ts.isRegularExpressionLiteral(node) ||
  node.kind === ts.SyntaxKind.TrueKeyword ||
  node.kind === ts.SyntaxKind.FalseKeyword ||
  node.kind === ts.SyntaxKind.NullKeyword

const shortCircuitOperators = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.CommaToken,
])

/**
 * True when evaluating `node` cannot run code of its own: literals,
 * names, functions (their bodies run later), and object and array
 * literals built from those. Anything else counts as effectful,
 * including a property read (a getter), a template with a value or
 * arithmetic (`toString` and `valueOf`), and a spread (an iterator or
 * getters). Errs toward effectful.
 *
 * @param {ts.Node} node
 * @returns {boolean}
 */
const isInert = (node) => {
  if (
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isIdentifier(node) ||
    isLiteral(node)
  ) {
    return true
  }

  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isTypeOfExpression(node) ||
    ts.isVoidExpression(node)
  ) {
    return isInert(node.expression)
  }

  if (ts.isPrefixUnaryExpression(node)) {
    return node.operator === ts.SyntaxKind.ExclamationToken
      ? isInert(node.operand)
      : ts.isNumericLiteral(node.operand) ||
          ts.isBigIntLiteral(node.operand)
  }

  if (ts.isConditionalExpression(node)) {
    return (
      isInert(node.condition) &&
      isInert(node.whenTrue) &&
      isInert(node.whenFalse)
    )
  }

  if (ts.isBinaryExpression(node)) {
    return (
      shortCircuitOperators.has(node.operatorToken.kind) &&
      isInert(node.left) &&
      isInert(node.right)
    )
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every(
      (element) =>
        ts.isOmittedExpression(element) ||
        (!ts.isSpreadElement(element) && isInert(element)),
    )
  }

  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every((property) => {
      if (ts.isSpreadAssignment(property)) {
        return false
      }

      if (
        property.name &&
        ts.isComputedPropertyName(property.name) &&
        !isLiteral(property.name.expression)
      ) {
        return false
      }

      if (ts.isPropertyAssignment(property)) {
        return isInert(property.initializer)
      }

      if (ts.isShorthandPropertyAssignment(property)) {
        return !property.objectAssignmentInitializer
      }

      // Methods and accessors run only when called or read.
      return true
    })
  }

  return false
}

/**
 * True when declaring the class runs code: an `extends` expression,
 * a decorator, a computed member name, a static block, or a static
 * initializer. Each runs when the module loads.
 *
 * @param {ts.ClassDeclaration} node
 */
const isEffectfulClass = (node) =>
  (ts.getDecorators(node) ?? []).length > 0 ||
  (node.heritageClauses ?? []).some(
    (clause) =>
      clause.token === ts.SyntaxKind.ExtendsKeyword &&
      clause.types.some(
        (type) => !isInert(type.expression),
      ),
  ) ||
  node.members.some(
    (member) =>
      ts.isClassStaticBlockDeclaration(member) ||
      (ts.canHaveDecorators(member) &&
        (ts.getDecorators(member) ?? []).length > 0) ||
      (member.name !== undefined &&
        ts.isComputedPropertyName(member.name) &&
        !isLiteral(member.name.expression)) ||
      (ts.isPropertyDeclaration(member) &&
        (ts.getModifiers(member) ?? []).some(
          (modifier) =>
            modifier.kind === ts.SyntaxKind.StaticKeyword,
        ) &&
        member.initializer !== undefined &&
        !isInert(member.initializer)),
  )

/**
 * `import "./x.ts"`, and also `import {} from "./x.ts"` or an import
 * of types only through inline specifiers, which load the module for
 * its effects all the same.
 *
 * @param {ts.Statement} statement
 * @returns {statement is ts.ImportDeclaration & { moduleSpecifier: ts.StringLiteral }}
 */
const isSideEffectImport = (statement) => {
  if (
    !ts.isImportDeclaration(statement) ||
    !ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return false
  }

  const clause = statement.importClause

  if (!clause) {
    return true
  }

  if (clause.isTypeOnly || clause.name) {
    return false
  }

  const bindings = clause.namedBindings

  return (
    !bindings ||
    (ts.isNamedImports(bindings) &&
      bindings.elements.every(
        (element) => element.isTypeOnly,
      ))
  )
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
  /** @type {SourceModule["methods"]} */
  const methods = new Map()
  /** @type {ts.Node[]} */
  const moduleStatements = []

  /** @param {ts.Node} node */
  const isDefaultExport = (node) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.DefaultKeyword,
    )

  /** @param {ts.Node} node */
  const isExported = (node) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.ExportKeyword,
    )

  for (const statement of sourceFile.statements) {
    // `declare` emits no code, so it declares nothing at run time.
    if (isAmbient(statement)) {
      continue
    }

    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const specifier = statement.moduleSpecifier.text
      const clause = statement.importClause

      const isTypeOnly = Boolean(clause?.isTypeOnly)

      // `import type` is erased; it cannot change what runs.
      if (!isTypeOnly) {
        moduleStatements.push(statement)
      }

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
      ts.isFunctionDeclaration(statement) &&
      statement.name
    ) {
      declarations.set(statement.name.text, statement)

      if (isExported(statement)) {
        exported.add(statement.name.text)
      }

      if (isDefaultExport(statement)) {
        declarations.set("default", statement)
      }
    } else if (
      ts.isExportAssignment(statement) &&
      !statement.isExportEquals
    ) {
      declarations.set("default", statement)

      if (!isInert(statement.expression)) {
        moduleStatements.push(statement)
      }
    } else if (ts.isVariableStatement(statement)) {
      // An initializer that runs code, or a destructuring the walker
      // cannot name, runs when the module loads whether or not a step
      // uses the binding — so it also joins the ‹module› unit.
      // A `using` binding's disposer runs when the module finishes.
      if (
        (statement.declarationList.flags &
          ts.NodeFlags.Using) !==
          0 ||
        statement.declarationList.declarations.some(
          (declaration) =>
            !ts.isIdentifier(declaration.name) ||
            (declaration.initializer &&
              !isInert(declaration.initializer)),
        )
      ) {
        moduleStatements.push(statement)
      }

      for (const declaration of statement.declarationList
        .declarations) {
        if (ts.isIdentifier(declaration.name)) {
          declarations.set(
            declaration.name.text,
            declaration,
          )

          if (isExported(statement)) {
            exported.add(declaration.name.text)
          }
        }
      }
    } else if (
      ts.isClassDeclaration(statement) &&
      statement.name
    ) {
      declarations.set(statement.name.text, statement)

      if (isEffectfulClass(statement)) {
        moduleStatements.push(statement)
      }

      if (isExported(statement)) {
        exported.add(statement.name.text)
      }

      if (isDefaultExport(statement)) {
        declarations.set("default", statement)
      }

      for (const member of statement.members) {
        if (
          (ts.isMethodDeclaration(member) ||
            ts.isGetAccessorDeclaration(member)) &&
          member.name &&
          ts.isIdentifier(member.name)
        ) {
          // A static and an instance method can share a name.
          const isStatic = (
            ts.getModifiers(member) ?? []
          ).some(
            (modifier) =>
              modifier.kind === ts.SyntaxKind.StaticKeyword,
          )

          methods.set(
            `${statement.name.text}.${member.name.text}${isStatic ? " (static)" : ""}`,
            member,
          )
        }
      }
    } else if (
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement)
    ) {
      // Types prove nothing at runtime; they never reach a hash.
    } else if (ts.isExportDeclaration(statement)) {
      // Re-exports are resolved through the importing side, and
      // hashed with the module's other top-level statements.
      moduleStatements.push(statement)
    } else {
      // A top-level call such as `userEvent.click = …` or
      // `AfterStep(…)` runs when the module loads, whatever a step
      // calls, so it is part of every requirement that loads it.
      moduleStatements.push(statement)
    }
  }

  return {
    absolutePath,
    file: relative(root, absolutePath)
      .split("\\")
      .join("/"),
    sourceFile,
    imports,
    moduleStatements,
    declarations,
    exported,
    methods,
  }
}

/**
 * @param {import("./config.js").RequirementsProject} project
 */
export const readSources = (project) => {
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
  const runtimeFiles = new Set([
    ...project.runtimeFiles,
    config.stepModule,
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

  /** @type {Set<string>} */
  const globChecked = new Set()

  /**
   * Only the setup file may load files by glob: a glob anywhere else
   * loads files the lock cannot follow.
   *
   * @param {SourceModule} module
   */
  const checkGlob = (module) => {
    if (
      globChecked.has(module.absolutePath) ||
      module.file === config.entry
    ) {
      return
    }

    globChecked.add(module.absolutePath)

    if (callsGlob(module.sourceFile)) {
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
  }

  for (const module of modules.values()) {
    if (module.absolutePath === stepModulePath) {
      continue
    }

    checkGlob(module)

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
            : `\`${localName}\` comes from "quickpickle" outside the runtime files (${config.runtime.join(", ")}). A hook or World change here would alter every scenario without changing the lock. Move it into a runtime file; type-only imports are fine.`,
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

  /**
   * Every code unit a step definition can reach: the definition
   * itself, each helper function and World method it calls (and
   * theirs, transitively), and — as whole files — the fixtures it
   * imports from outside the requirements root, such as stories.
   *
   * A requirement's lock entry lists these keys. Weaken one, and
   * every requirement that reaches it shows up as changed.
   *
   * @type {Map<string, CodeUnit>}
   */
  const units = new Map()
  /** @type {Map<string, Set<string>>} */
  const reachCache = new Map()
  const definitionCalls = new Set(definitionNodes.values())

  /**
   * Workspace packages the scenarios load by name, such as
   * `@charcuterie/storybook-config/testing`, resolved through each
   * package's `exports` (its `source` condition first, since a built
   * `dist` is not in git) and walked like relative imports.
   */
  const packageDirectories = Object.entries(config.packages)
    .map(([name, directory]) => ({
      name,
      directory: resolve(root, directory),
    }))
    .sort(
      (left, right) => right.name.length - left.name.length,
    )

  /** @param {string} specifier */
  const packageOf = (specifier) =>
    packageDirectories.find(
      ({ name }) =>
        specifier === name ||
        specifier.startsWith(`${name}/`),
    )

  /** @param {string} specifier */
  const isFollowedSpecifier = (specifier) =>
    specifier.startsWith(".") ||
    // Vite loads these from the project root or the `imports` map.
    // They never resolve here, so the check reports them.
    specifier.startsWith("/") ||
    specifier.startsWith("#") ||
    Boolean(packageOf(specifier))

  /**
   * @param {string} specifier
   * @returns {string | null}
   */
  const resolvePackage = (specifier) => {
    const found = packageOf(specifier)

    if (!found) {
      return null
    }

    const subpath =
      specifier === found.name
        ? "."
        : `.${specifier.slice(found.name.length)}`
    const manifestPath = join(
      found.directory,
      "package.json",
    )

    if (!existsSync(manifestPath)) {
      return null
    }

    /** @type {any} */
    let manifest

    try {
      manifest = parseManifest(
        readFileSync(manifestPath, "utf8"),
      )
    } catch (error) {
      reportMalformedJson(toKey(manifestPath), error)

      return null
    }
    /** @type {unknown} */
    let entry =
      typeof manifest.exports === "string" &&
      subpath === "."
        ? manifest.exports
        : manifest.exports?.[subpath]

    if (entry === undefined && manifest.exports) {
      for (const [pattern, value] of Object.entries(
        manifest.exports,
      )) {
        if (
          pattern.endsWith("/*") &&
          subpath.startsWith(pattern.slice(0, -1)) &&
          typeof value === "string"
        ) {
          entry = value.replace(
            "*",
            subpath.slice(pattern.length - 1),
          )
        }
      }
    }

    if (entry === undefined && subpath === ".") {
      entry = manifest.main
    }

    if (entry && typeof entry === "object") {
      const conditions =
        /** @type {Record<string, unknown>} */ (entry)

      entry =
        conditions.source ??
        conditions.import ??
        conditions.default
    }

    if (typeof entry !== "string") {
      return null
    }

    const file = resolve(found.directory, entry)

    return existsSync(file) && statSync(file).isFile()
      ? file
      : null
  }

  /**
   * @param {string} fromFile
   * @param {string} specifier
   */
  const resolveSpecifier = (fromFile, specifier) =>
    resolveRelative(fromFile, specifier) ??
    resolvePackage(specifier)

  /**
   * Every module a module imports or re-exports from at runtime.
   *
   * @param {SourceModule} module
   */
  const edgesOf = (module) => [
    ...[...module.imports.values()]
      .filter((imported) => !imported.isTypeOnly)
      .map((imported) => imported.specifier),
    ...module.moduleStatements.flatMap((statement) =>
      (isSideEffectImport(statement) ||
        (ts.isExportDeclaration(statement) &&
          !statement.isTypeOnly)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
        ? [statement.moduleSpecifier.text]
        : [],
    ),
  ]

  /** @param {string} absolutePath */
  const toKey = (absolutePath) =>
    relative(root, absolutePath).split("\\").join("/")

  /** @type {Set<string>} */
  const reportedMalformed = new Set()

  /**
   * @param {string} key
   * @param {unknown} [error] what parsing threw
   */
  const reportMalformedJson = (key, error) => {
    if (reportedMalformed.has(key)) {
      return
    }

    reportedMalformed.add(key)
    problems.push({
      file: key,
      line: 1,
      column: 1,
      rule: "malformed-json",
      message:
        error instanceof NotAnObjectError
          ? `${key} is valid JSON but not a JSON object, so no tool can read a field from it. Fix the file.`
          : `${key} is not valid JSON, so Vite cannot load it. Fix the file.`,
    })
  }

  /**
   * A JSON file's hash ignores formatting. Vite cannot load malformed
   * JSON, so that is reported instead of crashing the checker.
   *
   * @param {string} key
   * @param {string} absolutePath
   * @param {string} text
   */
  const jsonHash = (key, absolutePath, text) => {
    try {
      return hashText(
        absolutePath.endsWith("/package.json")
          ? packageManifestText(text)
          : JSON.stringify(parseJson(text)),
      )
    } catch (error) {
      reportMalformedJson(key, error)

      return hashText(text)
    }
  }

  /**
   * @param {string} absolutePath
   * @param {boolean} isExternal
   */
  const addWholeFile = (absolutePath, isExternal) => {
    const key = toKey(absolutePath)

    if (!units.has(key)) {
      const text = readFileSync(absolutePath, "utf8")
      const sourceFile = /\.[cm]?[jt]sx?$/.test(
        absolutePath,
      )
        ? parseSource(absolutePath, text)
        : null

      units.set(key, {
        key,
        file: key,
        line: 1,
        hash: sourceFile
          ? hashNode(sourceFile, sourceFile)
          : absolutePath.endsWith(".json")
            ? jsonHash(key, absolutePath, text)
            : absolutePath.endsWith(".css")
              ? hashText(normalizeCss(text))
              : hashText(text),
        isExternal,
        isHelper: false,
      })
    }

    return key
  }

  /**
   * Code every scenario passes through, whatever its steps: the
   * setup file, the World, the step wrapper, and the parameter types
   * that turn step text into arguments. Every requirement reaches
   * these, so weakening the wrapper changes every requirement.
   */
  const wholeRuntimeKeys = [
    ...new Set([
      ...project.runtimeFiles,
      config.stepModule,
      ...parameterTypes.map((type) => type.file),
    ]),
  ]
    .filter((file) => existsSync(resolve(root, file)))
    .map((file) => addWholeFile(resolve(root, file), false))
    .sort()

  /** @type {Map<string, { module: SourceModule, node: ts.Node, qualified: string }[]>} */
  const methodsByName = new Map()

  for (const module of modules.values()) {
    for (const [qualified, node] of module.methods) {
      const methodName = (
        qualified.split(".")[1] ?? qualified
      ).replace(/ \(static\)$/, "")
      const list = methodsByName.get(methodName) ?? []

      list.push({ module, node, qualified })
      methodsByName.set(methodName, list)
    }
  }

  /**
   * @param {SourceModule} module
   * @param {string} name
   * @param {ts.Node} node
   */
  const addUnit = (module, name, node) => {
    const key = `${module.file} › ${name}`

    if (!units.has(key)) {
      units.set(key, {
        key,
        file: module.file,
        line: lineOf(module.sourceFile, node).line,
        hash: hashNode(node, module.sourceFile),
        isExternal: module.file.startsWith(".."),
        isHelper: project.helperFiles.has(module.file),
      })
    }

    return key
  }

  /** @type {Set<string>} */
  const reportedTooDeep = new Set()

  /**
   * @param {string} absolutePath
   * @param {string} name
   */
  const reportTooDeep = (absolutePath, name) => {
    const key = `${absolutePath}|${name}`

    if (reportedTooDeep.has(key)) {
      return
    }

    reportedTooDeep.add(key)
    problems.push({
      file: toKey(absolutePath),
      line: 1,
      column: 1,
      rule: "reexport-too-deep",
      message: `\`${name}\` passes through more than eight re-exports before this file, so the checker stops following it. Import it from a file closer to where it is declared.`,
    })
  }

  /**
   * @typedef {{
   *   file: string,
   *   name: string,
   *   isFound: boolean,
   *   isTooDeep: boolean,
   *   isFallback?: boolean,
   * }} DeclarationSearch
   */

  /**
   * @param {string} absolutePath
   * @param {string} importedName
   * @param {number} depth
   * @param {string[]} hops
   * @param {Set<string>} seen the files on this path, so a cycle of
   *   `export *` ends instead of running out of depth
   * @returns {DeclarationSearch}
   */
  const searchDeclaration = (
    absolutePath,
    importedName,
    depth,
    hops,
    seen,
  ) => {
    /** @param {boolean} isFound */
    const here = (isFound) => ({
      file: absolutePath,
      name: importedName,
      isFound,
      isTooDeep: false,
    })

    if (depth > 8) {
      return { ...here(false), isTooDeep: true }
    }

    if (importedName === "*") {
      return here(true)
    }

    // A JSON file declares its top-level keys; any other non-code
    // file declares no names the checker can read. The caller hashes
    // the file whole either way.
    if (!codeFile.test(absolutePath)) {
      return here(jsonDeclares(absolutePath, importedName))
    }

    // A path can pass through one file twice under different names.
    const visit = `${absolutePath}|${importedName}`

    if (seen.has(visit)) {
      return here(false)
    }

    const onPath = new Set(seen).add(visit)
    const sourceFile = parseSource(
      absolutePath,
      readFileSync(absolutePath, "utf8"),
    )

    // Vite loads every module a file re-exports, even when the search
    // finds the name before it reaches that module, so malformed JSON
    // there fails the import.
    for (const statement of sourceFile.statements) {
      if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text.endsWith(".json")
      ) {
        const target = resolveSpecifier(
          absolutePath,
          statement.moduleSpecifier.text,
        )

        if (target) {
          try {
            parseJson(readFileSync(target, "utf8"))
          } catch (error) {
            reportMalformedJson(toKey(target), error)
          }
        }
      }
    }

    if (declaresName(sourceFile, importedName)) {
      return here(true)
    }

    // A named re-export wins over `export *` wherever it is written,
    // so try every named one first.
    const exportStatements = [
      ...sourceFile.statements.filter(
        (statement) =>
          ts.isExportDeclaration(statement) &&
          statement.exportClause !== undefined,
      ),
      ...sourceFile.statements.filter(
        (statement) =>
          ts.isExportDeclaration(statement) &&
          statement.exportClause === undefined,
      ),
    ]

    /** @type {{ search: DeclarationSearch, hops: string[] } | null} */
    let tooDeep = null
    /**
     * The first `export *` whose chain reached another file without
     * finding a declaration the checker recognizes. That file is the
     * best guess, and is hashed whole.
     *
     * @type {{ search: DeclarationSearch, hops: string[] } | null}
     */
    let reachedElsewhere = null
    /**
     * The first non-code `export *` target, at any depth, that may
     * supply the name, as a CSS module can. A JSON file cannot unless
     * it has the key, which counts as found. It is the last resort,
     * after any code chain.
     *
     * @type {{ search: DeclarationSearch, hops: string[] } | null}
     */
    let nonCodeFallback = null

    for (const statement of exportStatements) {
      if (
        !ts.isExportDeclaration(statement) ||
        statement.isTypeOnly ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        continue
      }

      const target = resolveSpecifier(
        absolutePath,
        statement.moduleSpecifier.text,
      )

      if (!target) {
        continue
      }

      if (!statement.exportClause) {
        // `export * from` never re-exports a default, and is
        // followed only if the target provides the name.
        if (importedName === "default") {
          continue
        }

        /** @type {string[]} */
        const deeper = []
        const followed = searchDeclaration(
          target,
          importedName,
          depth + 1,
          deeper,
          onPath,
        )

        if (followed.isFound) {
          hops.push(absolutePath, ...deeper)

          return followed
        }

        if (
          !followed.isTooDeep &&
          !codeFile.test(target) &&
          !target.endsWith(".json")
        ) {
          nonCodeFallback ??= {
            search: {
              file: target,
              name: importedName,
              isFound: false,
              isTooDeep: false,
              isFallback: true,
            },
            hops: [],
          }

          continue
        }

        // A deeper barrel fell back to a non-code file; that is still
        // only a fallback here, behind any code chain.
        if (followed.isFallback) {
          nonCodeFallback ??= {
            search: followed,
            hops: deeper,
          }

          continue
        }

        // Another `export *` may still supply the name; report the
        // depth only if none does.
        if (followed.isTooDeep && !tooDeep) {
          tooDeep = { search: followed, hops: deeper }
        } else if (
          !followed.isTooDeep &&
          followed.file !== target &&
          !reachedElsewhere
        ) {
          reachedElsewhere = {
            search: followed,
            hops: deeper,
          }
        }

        continue
      }

      // `export * as name from`: the name is the whole module.
      if (
        ts.isNamespaceExport(statement.exportClause) &&
        statement.exportClause.name.text === importedName
      ) {
        hops.push(absolutePath)

        return {
          file: target,
          name: "*",
          isFound: true,
          isTooDeep: false,
        }
      }

      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause
          .elements) {
          if (
            !element.isTypeOnly &&
            element.name.text === importedName
          ) {
            hops.push(absolutePath)

            // `export { a as b }` and `export { default }`: follow
            // the name the target declares, not the one imported.
            return searchDeclaration(
              target,
              (element.propertyName ?? element.name).text,
              depth + 1,
              hops,
              onPath,
            )
          }
        }
      }
    }

    if (tooDeep) {
      hops.push(absolutePath, ...tooDeep.hops)

      return tooDeep.search
    }

    if (reachedElsewhere) {
      hops.push(absolutePath, ...reachedElsewhere.hops)

      return reachedElsewhere.search
    }

    if (nonCodeFallback) {
      hops.push(absolutePath, ...nonCodeFallback.hops)

      return nonCodeFallback.search
    }

    return here(false)
  }

  /**
   * A barrel such as `testing/index.ts` only re-exports, so hashing
   * it would miss a change to the assertion it forwards. Follow the
   * name through `export … from` to the file that declares it.
   *
   * @param {string} absolutePath
   * @param {string} importedName
   * @param {string[]} hops collects each barrel passed through,
   *   whose own top-level code also runs on import
   * @returns {{ file: string, name: string }} the declaring file and
   *   the name it declares; `*` when the name is a whole module
   */
  const declaringFile = (
    absolutePath,
    importedName,
    hops = [],
  ) => {
    const search = searchDeclaration(
      absolutePath,
      importedName,
      0,
      hops,
      new Set(),
    )

    if (search.isTooDeep) {
      reportTooDeep(search.file, search.name)
    }

    // When nothing declares the name, the search ends at the last
    // file it reached, which the caller then hashes whole.
    return { file: search.file, name: search.name }
  }

  /**
   * Everything a namespace (`import * as x`, `export * as x`) can
   * reach: the module's own exports and every name it re-exports.
   *
   * @param {SourceModule} module
   * @param {Set<string>} reached
   * @param {Set<string>} seen
   */
  const reachNamespace = (
    module,
    reached,
    seen = new Set(),
  ) => {
    if (seen.has(module.absolutePath)) {
      return
    }

    seen.add(module.absolutePath)
    enterModule(module, reached)

    for (const name of module.exported) {
      reachIdentifier(module, name, reached)
    }

    if (module.declarations.has("default")) {
      reachIdentifier(module, "default", reached)
    }

    for (const statement of module.moduleStatements) {
      if (
        !ts.isExportDeclaration(statement) ||
        statement.isTypeOnly ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        continue
      }

      const target = resolveSpecifier(
        module.absolutePath,
        statement.moduleSpecifier.text,
      )

      if (
        !target ||
        isSubject(target) ||
        target === stepModulePath
      ) {
        continue
      }

      // A namespace holds every name a JSON or CSS file exports.
      if (!codeFile.test(target)) {
        reached.add(
          addWholeFile(
            target,
            toKey(target).startsWith(".."),
          ),
        )

        continue
      }

      const targetModule = moduleAt(target)

      if (
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const element of statement.exportClause
          .elements) {
          reachExport(
            targetModule,
            (element.propertyName ?? element.name).text,
            reached,
          )
        }
      } else {
        reachNamespace(targetModule, reached, seen)
      }
    }
  }

  /**
   * Reach `name` as `module` exports it, following re-exports.
   *
   * @param {SourceModule} module
   * @param {string} name
   * @param {Set<string>} reached
   */
  const reachExport = (module, name, reached) => {
    /** @type {string[]} */
    const hops = []
    const resolved = declaringFile(
      module.absolutePath,
      name,
      hops,
    )

    if (isSubject(resolved.file)) {
      return
    }

    for (const hop of hops) {
      if (!isSubject(hop)) {
        enterModule(moduleAt(hop), reached)
      }
    }

    const targetModule = moduleAt(resolved.file)

    if (resolved.name === "*") {
      reachNamespace(targetModule, reached)

      return
    }

    if (targetModule.declarations.has(resolved.name)) {
      reachIdentifier(targetModule, resolved.name, reached)

      return
    }

    // A form the walker does not follow: hash the whole file and
    // reach every declaration in it, so a miss over-reports.
    reached.add(
      addWholeFile(
        resolved.file,
        targetModule.file.startsWith(".."),
      ),
    )
    enterModule(targetModule, reached)

    for (const declared of targetModule.declarations.keys()) {
      reachIdentifier(targetModule, declared, reached)
    }
  }

  /**
   * @param {SourceModule} module
   * @param {ts.Node} node
   * @param {Set<string>} reached
   */
  const walk = (module, node, reached) => {
    /** @param {ts.Node} child */
    const visit = (child) => {
      if (
        ts.isCallExpression(child) &&
        child.expression.kind ===
          ts.SyntaxKind.ImportKeyword
      ) {
        const [specifier] = child.arguments

        if (
          specifier &&
          ts.isStringLiteralLike(specifier)
        ) {
          followDynamicImport(
            module,
            specifier.text,
            reached,
          )
        } else {
          reportDynamicImport(module, child)
        }
      }

      if (
        ts.isPropertyAccessExpression(child) &&
        ts.isIdentifier(child.name)
      ) {
        for (const method of methodsByName.get(
          child.name.text,
        ) ?? []) {
          const key = addUnit(
            method.module,
            method.qualified,
            method.node,
          )

          if (!reached.has(key)) {
            reached.add(key)
            walk(method.module, method.node, reached)
          }
        }

        visit(child.expression)

        return
      }

      if (ts.isIdentifier(child)) {
        reachIdentifier(module, child.text, reached)
      }

      ts.forEachChild(child, visit)
    }

    ts.forEachChild(node, visit)
  }

  /**
   * The code under test is the boundary: a component change is what
   * the scenarios exist to catch, not a change to what they prove. A
   * path matching `subjects` (a `!` pattern excludes) is neither
   * hashed nor followed.
   *
   * @param {string} absolutePath
   */
  const isSubject = (absolutePath) => {
    const key = toKey(absolutePath)
    const positives = config.subjects.filter(
      (pattern) => !pattern.startsWith("!"),
    )
    const negatives = config.subjects
      .filter((pattern) => pattern.startsWith("!"))
      .map((pattern) => pattern.slice(1))

    return (
      positives.some((pattern) =>
        matchesGlob(key, pattern),
      ) &&
      !negatives.some((pattern) =>
        matchesGlob(key, pattern),
      )
    )
  }

  /**
   * A module's imports and top-level statements that are not
   * declarations, as one unit. They run when the module loads, so a
   * changed import or a patch such as `userEvent.click = …` changes
   * every requirement that reaches the module.
   *
   * @param {SourceModule} module
   * @param {Set<string>} reached
   */
  const enterModule = (module, reached) => {
    checkGlob(module)

    // A step definition is a top-level call too, but it is its own
    // unit; folding it in would tie every step in a file to the rest.
    const statements = module.moduleStatements.filter(
      (statement) =>
        !(
          ts.isExpressionStatement(statement) &&
          definitionCalls.has(statement.expression)
        ),
    )

    if (statements.length === 0) {
      return
    }

    const key = `${module.file} › ‹module›`

    if (reached.has(key)) {
      return
    }

    if (!units.has(key)) {
      units.set(key, {
        key,
        file: module.file,
        line: 1,
        hash: hashText(
          statements
            .map((statement) =>
              runtimeText(statement, module.sourceFile),
            )
            .join("\n"),
        ),
        isExternal: module.file.startsWith(".."),
        isHelper: false,
      })
    }

    reached.add(key)

    // Every followed import and re-export must resolve, used or
    // not: a missing file would otherwise be skipped silently.
    for (const specifier of edgesOf(module)) {
      if (
        isFollowedSpecifier(specifier) &&
        !resolveSpecifier(module.absolutePath, specifier)
      ) {
        reportUnresolved(module, specifier)
      }
    }

    for (const statement of statements) {
      if (!ts.isImportDeclaration(statement)) {
        walk(module, statement, reached)
      } else if (isSideEffectImport(statement)) {
        // `import "./patch.ts"` runs that module for its effects.
        followSideEffectImport(
          module,
          statement.moduleSpecifier.text,
          reached,
        )
      }
    }
  }

  /**
   * `import("…")` gives the whole module, re-exports included, so it
   * is reached as a namespace.
   *
   * @param {SourceModule} module
   * @param {string} specifier
   * @param {Set<string>} reached
   */
  const followDynamicImport = (
    module,
    specifier,
    reached,
  ) => {
    if (!isFollowedSpecifier(specifier)) {
      return
    }

    const target = resolveSpecifier(
      module.absolutePath,
      specifier,
    )

    if (!target) {
      reportUnresolved(module, specifier)

      return
    }

    if (target === stepModulePath || isSubject(target)) {
      return
    }

    if (!codeFile.test(target)) {
      reached.add(
        addWholeFile(
          target,
          toKey(target).startsWith(".."),
        ),
      )

      return
    }

    const targetModule = moduleAt(target)

    reachNamespace(targetModule, reached)
    // Loading the target also runs the top-level code of every module
    // it imports, used or not, as a static import does.
    enterGraph(targetModule, reached, new Set())
  }

  /**
   * A module's top-level code runs once it is imported, so entering a
   * module enters every module it imports, transitively.
   *
   * @param {SourceModule} module
   * @param {Set<string>} reached
   * @param {Set<string>} visited
   */
  const enterGraph = (module, reached, visited) => {
    if (visited.has(module.absolutePath)) {
      return
    }

    visited.add(module.absolutePath)
    enterModule(module, reached)

    for (const specifier of edgesOf(module)) {
      const target = resolveSpecifier(
        module.absolutePath,
        specifier,
      )

      if (
        target &&
        target !== stepModulePath &&
        codeFile.test(target) &&
        !isSubject(target)
      ) {
        enterGraph(moduleAt(target), reached, visited)
      }
    }
  }

  /** @type {Set<string>} */
  const reportedDynamic = new Set()

  /**
   * @param {SourceModule} module
   * @param {ts.Node} node
   */
  const reportDynamicImport = (module, node) => {
    const position = lineOf(module.sourceFile, node)
    const key = `${module.file}:${position.line}`

    if (reportedDynamic.has(key)) {
      return
    }

    reportedDynamic.add(key)
    problems.push({
      file: module.file,
      ...position,
      rule: "dynamic-import",
      message:
        "Write `import()` with a string literal path, so the lock can follow it.",
    })
  }

  /** @type {Set<string>} */
  const reportedUnresolved = new Set()

  /**
   * @param {SourceModule} module
   * @param {string} specifier
   */
  const reportUnresolved = (module, specifier) => {
    const key = `${module.file}|${specifier}`

    if (reportedUnresolved.has(key)) {
      return
    }

    reportedUnresolved.add(key)

    const candidates = relativeCandidates(
      module.absolutePath,
      specifier,
    )

    problems.push({
      file: module.file,
      line: 1,
      column: 1,
      rule: "unresolved-import",
      message:
        candidates.length > 1
          ? `"${specifier}" could load any of ${candidates.map((candidate) => toKey(candidate)).join(", ")}, so the lock cannot know which runs. Write the full file name.`
          : candidates[0]?.endsWith("package.json")
            ? `"${specifier}" is a directory with a package.json, which can send Vite to any file. Import the file by its full path.`
            : specifier.startsWith("/") ||
                specifier.startsWith("#")
              ? `"${specifier}" is not followed. Import the file by its relative path.`
              : `"${specifier}" does not resolve to a file the checker can read, so the lock cannot follow it. Import the file by its path.`,
    })
  }

  /**
   * @param {SourceModule} module
   * @param {string} specifier
   * @param {Set<string>} reached
   */
  const followSideEffectImport = (
    module,
    specifier,
    reached,
  ) => {
    if (!isFollowedSpecifier(specifier)) {
      return
    }

    const target = resolveSpecifier(
      module.absolutePath,
      specifier,
    )

    if (!target) {
      reportUnresolved(module, specifier)

      return
    }

    if (target === stepModulePath || isSubject(target)) {
      return
    }

    if (!codeFile.test(target)) {
      reached.add(
        addWholeFile(
          target,
          toKey(target).startsWith(".."),
        ),
      )

      return
    }

    const targetModule = moduleAt(target)

    enterModule(targetModule, reached)

    for (const name of targetModule.declarations.keys()) {
      reachIdentifier(targetModule, name, reached)
    }
  }

  /**
   * @param {SourceModule} module
   * @param {string} name
   * @param {Set<string>} reached
   */
  const reachIdentifier = (module, name, reached) => {
    const local = module.declarations.get(name)

    if (local) {
      const key = addUnit(module, name, local)

      if (!reached.has(key)) {
        reached.add(key)
        enterModule(module, reached)
        walk(module, local, reached)
      }

      return
    }

    const imported = module.imports.get(name)

    if (!imported || imported.isTypeOnly) {
      return
    }

    const target = resolveSpecifier(
      module.absolutePath,
      imported.specifier,
    )

    if (
      !target &&
      isFollowedSpecifier(imported.specifier)
    ) {
      reportUnresolved(module, imported.specifier)

      return
    }

    // A bare package import is recorded by the importing module's
    // ‹module› unit, which hashes its import statements.
    if (!target || target === stepModulePath) {
      return
    }

    if (!codeFile.test(target)) {
      reached.add(
        addWholeFile(
          target,
          toKey(target).startsWith(".."),
        ),
      )

      return
    }

    if (isSubject(target)) {
      return
    }

    if (imported.importedName === "*") {
      reachNamespace(moduleAt(target), reached)

      return
    }

    reachExport(
      moduleAt(target),
      imported.importedName,
      reached,
    )
  }

  /**
   * @param {StepDefinition} definition
   * @returns {Set<string>}
   */
  const reachOf = (definition) => {
    const cached = reachCache.get(definition.key)

    if (cached) {
      return cached
    }

    const node = definitionNodes.get(definition.key)
    const module = modules.get(
      resolve(root, definition.file),
    )
    /** @type {Set<string>} */
    const reached = new Set([definition.key])

    if (node && module) {
      units.set(definition.key, {
        key: definition.key,
        file: definition.file,
        line: definition.line,
        hash: hashNode(node, module.sourceFile),
        isExternal: false,
        isHelper: false,
      })
      enterModule(module, reached)
      walk(module, node, reached)
    }

    reachCache.set(definition.key, reached)

    return reached
  }

  /** Helpers that no step definition reaches: dead weight in the World. */
  const unreachedHelpers = () => {
    const reachedKeys = new Set(
      definitions.flatMap((definition) => [
        ...reachOf(definition),
      ]),
    )
    /** @type {Problem[]} */
    const unused = []

    for (const module of modules.values()) {
      if (!project.helperFiles.has(module.file)) {
        continue
      }

      for (const name of module.exported) {
        const node = module.declarations.get(name)

        if (!node) {
          continue
        }

        if (ts.isClassDeclaration(node)) {
          for (const [
            qualified,
            method,
          ] of module.methods) {
            if (
              qualified.startsWith(`${name}.`) &&
              !reachedKeys.has(
                `${module.file} › ${qualified}`,
              )
            ) {
              unused.push({
                file: module.file,
                ...lineOf(module.sourceFile, method),
                rule: "unused-helper",
                message: `No step reaches \`${qualified}\`. Delete it, or add it with the scenario that needs it.`,
              })
            }
          }

          continue
        }

        if (!reachedKeys.has(`${module.file} › ${name}`)) {
          unused.push({
            file: module.file,
            ...lineOf(module.sourceFile, node),
            rule: "unused-helper",
            message: `No step reaches \`${name}\`. Delete it, or add it with the scenario that needs it.`,
          })
        }
      }
    }

    return unused
  }

  /**
   * Code every scenario loads, beyond the whole-file runtime units:
   * each step file's top-level code, which `index.ts` runs for every
   * scenario whether or not its steps are used, and whatever the
   * runtime TypeScript files import by relative path, such as the
   * Storybook preview behind `vitest.ui.setup.ts`.
   *
   * @type {Set<string>}
   */
  const loadedEverywhere = new Set(wholeRuntimeKeys)

  /** @type {Set<string>} */
  const enteredEverywhere = new Set()

  /**
   * Every module a step file or runtime file imports, transitively,
   * runs for every scenario.
   *
   * @param {SourceModule} module
   */
  const enterEverywhere = (module) =>
    enterGraph(module, loadedEverywhere, enteredEverywhere)

  for (const file of project.stepFiles) {
    enterEverywhere(moduleAt(resolve(root, file)))
  }

  for (const file of [
    ...project.runtimeFiles,
    config.stepModule,
  ]) {
    const absolutePath = resolve(root, file)

    if (
      !codeFile.test(absolutePath) ||
      !existsSync(absolutePath)
    ) {
      continue
    }

    const runtimeModule = moduleAt(absolutePath)

    enterEverywhere(runtimeModule)

    for (const [
      localName,
      imported,
    ] of runtimeModule.imports) {
      if (isFollowedSpecifier(imported.specifier)) {
        reachIdentifier(
          runtimeModule,
          localName,
          loadedEverywhere,
        )
      }
    }

    for (const statement of runtimeModule.moduleStatements) {
      if (isSideEffectImport(statement)) {
        followSideEffectImport(
          runtimeModule,
          statement.moduleSpecifier.text,
          loadedEverywhere,
        )
      }
    }
  }

  const runtimeKeys = [...loadedEverywhere].sort()

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
    reachOf,
    runtimeKeys,
    units,
    unreachedHelpers,
  }
}
