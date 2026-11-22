import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

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
 *   imports: Map<string, { specifier: string, importedName: string }>,
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

      if (clause?.name) {
        imports.set(clause.name.text, {
          specifier,
          importedName: "default",
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
      // Re-exports are resolved through the importing side.
    }
  }

  return {
    absolutePath,
    file: relative(root, absolutePath)
      .split("\\")
      .join("/"),
    sourceFile,
    imports,
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

  for (const module of [...modules.values()]) {
    const isStepModule =
      module.absolutePath === stepModulePath

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
            problems.push({
              file: module.file,
              ...position,
              rule: "direct-quickpickle-step",
              message: `Import ${imported.importedName} from ${config.stepModule}, not "quickpickle". The wrapper is what names this definition when its step fails.`,
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
        isExternal: false,
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
   * @param {string} importedPath
   * @param {string} importedName
   */
  const addExternal = (importedPath, importedName) => {
    const absolutePath = declaringFile(
      importedPath,
      importedName,
    )
    const key = relative(root, absolutePath)
      .split("\\")
      .join("/")

    if (!units.has(key)) {
      const sourceFile = parseSource(
        absolutePath,
        readFileSync(absolutePath, "utf8"),
      )

      units.set(key, {
        key,
        file: key,
        line: 1,
        hash: hashNode(sourceFile, sourceFile),
        isExternal: true,
        isHelper: false,
      })
    }

    return key
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
        walk(module, local, reached)
      }

      return
    }

    const imported = module.imports.get(name)

    if (!imported) {
      return
    }

    const target = resolveRelative(
      module.absolutePath,
      imported.specifier,
    )

    if (!target || target === stepModulePath) {
      return
    }

    const isInsideRoot = !relative(root, target).startsWith(
      "..",
    )

    if (!isInsideRoot || !/\.tsx?$/.test(target)) {
      const key = addExternal(target, imported.importedName)

      reached.add(key)

      return
    }

    const targetModule = moduleAt(target)

    if (imported.importedName === "*") {
      for (const exportedName of targetModule.exported) {
        reachIdentifier(targetModule, exportedName, reached)
      }

      return
    }

    reachIdentifier(
      targetModule,
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
    units,
    unreachedHelpers,
  }
}
