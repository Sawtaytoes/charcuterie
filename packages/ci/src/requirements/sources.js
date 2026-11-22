import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
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
    absolutePath.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )

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
  if (!specifier.startsWith(".")) {
    return null
  }

  const base = resolve(dirname(fromFile), specifier)
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
  ]

  return (
    candidates.find((candidate) => existsSync(candidate)) ??
    null
  )
}

/**
 * @param {ts.SourceFile} sourceFile
 * @param {string} name
 */
const declaresName = (sourceFile, name) =>
  sourceFile.statements.some(
    (statement) =>
      ((ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
        statement.name?.text === name) ||
      (ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === name,
        )),
  )

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
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const specifier = statement.moduleSpecifier.text
      const clause = statement.importClause

      const isTypeOnly = Boolean(clause?.isTypeOnly)

      moduleStatements.push(statement)

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
    } else if (ts.isVariableStatement(statement)) {
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
          methods.set(
            `${statement.name.text}.${member.name.text}`,
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

  for (const module of modules.values()) {
    if (module.absolutePath === stepModulePath) {
      continue
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
        const [patterns] = node.arguments
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
            const [expressionNode, , priority] =
              node.arguments

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

  /** @param {string} absolutePath */
  const toKey = (absolutePath) =>
    relative(root, absolutePath).split("\\").join("/")

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
            ? hashText(JSON.stringify(JSON.parse(text)))
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
  const runtimeKeys = [
    ...new Set([
      ...project.runtimeFiles,
      config.stepModule,
      ...parameterTypes.map((type) => type.file),
    ]),
  ]
    .filter((file) => existsSync(resolve(root, file)))
    .map((file) => addWholeFile(resolve(root, file), false))
    .sort()

  /** @type {Map<string, { module: SourceModule, node: ts.Node }[]>} */
  const methodsByName = new Map()

  for (const module of modules.values()) {
    for (const [qualified, node] of module.methods) {
      const methodName =
        qualified.split(".")[1] ?? qualified
      const list = methodsByName.get(methodName) ?? []

      list.push({ module, node })
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

  /**
   * A barrel such as `testing/index.ts` only re-exports, so hashing
   * it would miss a change to the assertion it forwards. Follow the
   * name through `export … from` to the file that declares it.
   *
   * @param {string} absolutePath
   * @param {string} importedName
   * @param {number} depth
   * @returns {string}
   */
  const declaringFile = (
    absolutePath,
    importedName,
    depth = 0,
  ) => {
    if (
      depth > 8 ||
      importedName === "default" ||
      importedName === "*" ||
      !/\.tsx?$/.test(absolutePath)
    ) {
      return absolutePath
    }

    const sourceFile = parseSource(
      absolutePath,
      readFileSync(absolutePath, "utf8"),
    )

    for (const statement of sourceFile.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        continue
      }

      const target = resolveRelative(
        absolutePath,
        statement.moduleSpecifier.text,
      )

      if (!target) {
        continue
      }

      if (!statement.exportClause) {
        // `export * from`: follow only if the target declares it.
        const followed = declaringFile(
          target,
          importedName,
          depth + 1,
        )

        if (
          followed !== target ||
          declaresName(
            parseSource(
              target,
              readFileSync(target, "utf8"),
            ),
            importedName,
          )
        ) {
          return followed
        }

        continue
      }

      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause
          .elements) {
          if (element.name.text === importedName) {
            return declaringFile(
              target,
              (element.propertyName ?? element.name).text,
              depth + 1,
            )
          }
        }
      }
    }

    return absolutePath
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
        ts.isPropertyAccessExpression(child) &&
        ts.isIdentifier(child.name)
      ) {
        for (const method of methodsByName.get(
          child.name.text,
        ) ?? []) {
          const className =
            method.node.parent &&
            ts.isClassDeclaration(method.node.parent) &&
            method.node.parent.name
              ? method.node.parent.name.text
              : "class"
          const key = addUnit(
            method.module,
            `${className}.${child.name.text}`,
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
              printer.printNode(
                ts.EmitHint.Unspecified,
                statement,
                module.sourceFile,
              ),
            )
            .join("\n"),
        ),
        isExternal: module.file.startsWith(".."),
        isHelper: false,
      })
    }

    reached.add(key)

    for (const statement of statements) {
      if (!ts.isImportDeclaration(statement)) {
        walk(module, statement, reached)
      }
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

    const target = resolveRelative(
      module.absolutePath,
      imported.specifier,
    )

    // A bare package import is recorded by the importing module's
    // ‹module› unit, which hashes its import statements.
    if (!target || target === stepModulePath) {
      return
    }

    if (!/\.tsx?$/.test(target)) {
      reached.add(addWholeFile(target, true))

      return
    }

    if (imported.importedName === "*") {
      if (isSubject(target)) {
        return
      }

      const targetModule = moduleAt(target)

      enterModule(targetModule, reached)

      for (const exportedName of targetModule.exported) {
        reachIdentifier(targetModule, exportedName, reached)
      }

      return
    }

    const declaring = declaringFile(
      target,
      imported.importedName,
    )

    if (isSubject(declaring)) {
      return
    }

    const targetModule = moduleAt(declaring)

    if (
      targetModule.declarations.has(imported.importedName)
    ) {
      reachIdentifier(
        targetModule,
        imported.importedName,
        reached,
      )

      return
    }

    // `export * as`, or another form the walker does not follow:
    // hash the whole file rather than nothing.
    reached.add(
      addWholeFile(
        declaring,
        targetModule.file.startsWith(".."),
      ),
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
