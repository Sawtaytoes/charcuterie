/**
 * Every class name in this package, compiled through the real
 * Tailwind, asserted to produce actual CSS.
 *
 * This is the test that makes the whole utility-class approach safe.
 * Tailwind v4 scans source text for *complete* class strings, so a
 * name it does not recognise — a typo, an interpolation, a utility
 * that needed a `@theme` bridge nobody added — generates **nothing
 * at all**. No error, no warning, no failing build: the element
 * simply renders unstyled, which reads as "the token layer is
 * broken" rather than as "the scanner never saw it". That is the
 * single most expensive failure mode in a Tailwind component
 * library, and it is entirely mechanical to catch.
 *
 * Two properties are asserted:
 *
 *  1. **No interpolated class names.** `` `bg-intent-${intent}-solid` ``
 *     is rejected at the AST level, which is why `intentStyles.ts`
 *     is 48 literals rather than a loop.
 *  2. **Every literal resolves.** `candidatesToCss` returns `null`
 *     for a candidate Tailwind cannot generate, and any `null` fails
 *     here with the offending class and file.
 *
 * The design system is built in memory from
 * `@charcuterie/tokens`' generator rather than from its `dist`, so
 * this also fails the moment a token bridge is removed — `text-md`
 * and `shadow-low` exist only because `theme.css` publishes
 * `--text-*` and `--shadow-*`.
 */

import { readdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join, relative, resolve } from "node:path"

import {
  buildThemeCss,
  buildVariablesCss,
} from "@charcuterie/tokens/src/buildCss.ts"
import { variants } from "@charcuterie/tokens/src/variants/index.ts"
import { __unstable__loadDesignSystem } from "tailwindcss"
import ts from "typescript"
import { expect, test } from "vitest"

const sourceDirectory = resolve(import.meta.dirname)

const require_ = createRequire(import.meta.url)

const getSourceFilePaths = async (
  directory: string,
): Promise<string[]> => {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })

  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return getSourceFilePaths(path)
      }

      if (
        /\.tsx?$/.test(entry.name) &&
        !entry.name.endsWith(".test.ts")
      ) {
        return [path]
      }

      return []
    }),
  )

  return paths.flat()
}

type Candidate = {
  className: string
  file: string
}

const collectFileCandidates = (
  path: string,
  contents: string,
) => {
  const sourceFile = ts.createSourceFile(
    path,
    contents,
    ts.ScriptTarget.ESNext,
    true,
    path.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )

  const candidates: Candidate[] = []

  const interpolations: string[] = []

  const file = relative(sourceDirectory, path)

  const COMPARISON_OPERATORS = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
  ])

  const collectStrings = (node: ts.Node) => {
    // `sizing === "icon" ? a : b` — the operand of a comparison is a
    // prop value, not a class name. Descending into it is how
    // `"icon"` ends up looking like a missing utility.
    if (ts.isConditionalExpression(node)) {
      collectStrings(node.whenTrue)

      collectStrings(node.whenFalse)

      return
    }

    if (ts.isBinaryExpression(node)) {
      if (
        COMPARISON_OPERATORS.has(node.operatorToken.kind)
      ) {
        return
      }

      if (
        node.operatorToken.kind ===
        ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        collectStrings(node.right)

        return
      }
    }

    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node)
    ) {
      for (const className of node.text.split(/\s+/)) {
        if (className.length > 0) {
          candidates.push({ className, file })
        }
      }

      return
    }

    // The silent-failure case, refused outright: Tailwind cannot see
    // a class name that only exists at runtime.
    if (ts.isTemplateExpression(node)) {
      interpolations.push(
        `${file}: ${node.getText().split("\n")[0]}`,
      )

      return
    }

    ts.forEachChild(node, collectStrings)
  }

  const visit = (node: ts.Node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText() === "className" &&
      node.initializer
    ) {
      collectStrings(node.initializer)
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.getText() === "toClassName"
    ) {
      for (const argument of node.arguments) {
        collectStrings(argument)
      }
    }

    // The class maps — `INTENT_APPEARANCE_CLASS`,
    // `CONTROL_SIZE_CLASS`, `FOCUS_RING_CLASS`, … — where every
    // string literal is by definition a class list.
    if (
      ts.isVariableDeclaration(node) &&
      /_CLASS$/.test(node.name.getText()) &&
      node.initializer
    ) {
      collectStrings(node.initializer)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return { candidates, interpolations }
}

const loadStylesheet = async (
  id: string,
  _base: string,
) => {
  if (id === "tailwindcss") {
    const path = require_.resolve("tailwindcss/index.css")

    return {
      path,
      base: dirname(path),
      content: await readFile(path, "utf8"),
    }
  }

  // Generated in memory, so this test fails on a *generator*
  // regression rather than on a stale `dist`.
  if (id === "./variables.css") {
    return {
      path: "/virtual/variables.css",
      base: "/virtual",
      content: buildVariablesCss(variants, "daylight"),
    }
  }

  throw new Error(`Unexpected stylesheet import: ${id}`)
}

const collected = await Promise.all(
  (await getSourceFilePaths(sourceDirectory)).map(
    async (path) =>
      collectFileCandidates(
        path,
        await readFile(path, "utf8"),
      ),
  ),
)

const candidates = collected.flatMap(
  (result) => result.candidates,
)

const interpolations = collected.flatMap(
  (result) => result.interpolations,
)

test("no class name is built by interpolation", () => {
  // `` className={`bg-${intent}`} `` renders unstyled and passes
  // every other test in the repo.
  expect(interpolations).toEqual([])
})

test("this package has class names to check at all", () => {
  // A regex refactor that quietly stops matching would otherwise
  // turn the next test into a green no-op.
  expect(candidates.length).toBeGreaterThan(200)
})

/**
 * The two class names in this package that are deliberately not
 * utilities.
 *
 * `group` is Tailwind's own marker — it generates no CSS by design,
 * it is what `group-hover:` reads. The `charcuterie-*` four are the
 * looping affordances, which cannot be utilities because Tailwind's
 * own `animate-spin` hardcodes 1s past `prefers-reduced-motion`;
 * they live in `styles.css` and are checked against it below.
 */
const TAILWIND_MARKER_CLASSES = ["group"]

test("every `charcuterie-` class a component uses is defined in styles.css", async () => {
  // The other half of the "no silently-unstyled component" gate. A
  // component reaching for `.charcuterie-glow` fails here rather
  // than rendering a static bar nobody notices.
  const styles = await readFile(
    join(sourceDirectory, "styles.css"),
    "utf8",
  )

  const used = [
    ...new Set(
      candidates
        .map((one) => one.className)
        .filter((className) =>
          className.startsWith("charcuterie-"),
        ),
    ),
  ]

  expect(used.length).toBeGreaterThan(0)

  for (const className of used) {
    expect(styles).toContain(`.${className}`)
  }

  // And every one of them is switched off under reduced motion —
  // `variables.css` zeroing the duration is not enough, because a
  // `0ms` looping animation still holds its first keyframe.
  const reducedMotionBlock = styles.slice(
    styles.indexOf(
      "@media (prefers-reduced-motion: reduce)",
    ),
  )

  for (const className of used) {
    expect(reducedMotionBlock).toContain(`.${className}`)
  }
})

test("every class name compiles to real CSS", async () => {
  const design = await __unstable__loadDesignSystem(
    `@import "tailwindcss";\n${buildThemeCss()}`,
    {
      base: sourceDirectory,
      loadStylesheet,
      loadModule: () => {
        throw new Error(
          "The token layer is plain CSS — no Tailwind plugin should be loaded.",
        )
      },
    },
  )

  const unique = [
    ...new Set(candidates.map((one) => one.className)),
  ].filter(
    (className) =>
      !className.startsWith("charcuterie-") &&
      !TAILWIND_MARKER_CLASSES.includes(className),
  )

  const generated = design.candidatesToCss(unique)

  const unknown = unique
    .filter((_, index) => generated[index] === null)
    .map((className) => {
      const source = candidates.find(
        (one) => one.className === className,
      )

      return `${className} (${source?.file})`
    })

  expect(unknown).toEqual([])
})

test("the token bridges are load-bearing, not decorative", async () => {
  // The mutation check for the test above: drop `theme.css` and the
  // colour utilities, the type ramp, and the elevation scale all
  // stop resolving. If this passes with Tailwind alone, the
  // components are not actually reading our tokens.
  const design = await __unstable__loadDesignSystem(
    `@import "tailwindcss";\n`,
    {
      base: sourceDirectory,
      loadStylesheet,
      loadModule: () => {
        throw new Error("no plugins")
      },
    },
  )

  const withoutTokens = design.candidatesToCss([
    "bg-intent-accent-solid",
    "text-content-primary",
    "shadow-low",
    "text-md",
    "cq-sm:flex-row",
  ])

  expect(withoutTokens).toEqual([
    null,
    null,
    null,
    null,
    null,
  ])
})
