/**
 * Fixture-driven regression tests: run the real `ESLint` class
 * over real files, the same technique
 * `mux-magic/packages/tools/src/eslintBooleanPrefixRule.test.ts`
 * uses.
 *
 * Asserting against the actual engine rather than a rule-tester
 * harness is what catches the failure this repo is most likely to
 * hit — a rule that is *configured* correctly but never *applies*,
 * because a `files` glob or a parser option is wrong. That kind of
 * silent no-op is indistinguishable from "clean" in CI.
 */

import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"
import { expect, test } from "vitest"

import {
  createComponentChoiceRules,
  createLogicalPropertiesRules,
  createTestRules,
  createTypedRules,
} from "./index.js"

const packageRoot = resolve(
  fileURLToPath(import.meta.url),
  "../..",
)

const fixture = (name: string) =>
  resolve(packageRoot, "src/__fixtures__", name)

const getRuleIds = async (
  eslint: ESLint,
  fixtureName: string,
) => {
  const [result] = await eslint.lintFiles([
    fixture(fixtureName),
  ])

  return [
    ...result.messages,
    ...result.suppressedMessages,
  ].map((message) => message.ruleId)
}

/**
 * The reported half only. `getRuleIds` folds
 * `suppressedMessages` in, which is what the older tests want —
 * but an escape-hatch test that cannot tell "silenced by a
 * disable comment" from "never matched in the first place" is
 * asserting nothing.
 */
const getReportedRuleIds = async (
  eslint: ESLint,
  fixtureName: string,
) => {
  const [result] = await eslint.lintFiles([
    fixture(fixtureName),
  ])

  return result.messages.map((message) => message.ruleId)
}

const getSuppressedRuleIds = async (
  eslint: ESLint,
  fixtureName: string,
) => {
  const [result] = await eslint.lintFiles([
    fixture(fixtureName),
  ])

  return result.suppressedMessages.map(
    (message) => message.ruleId,
  )
}

/**
 * A per-rule tally rather than a total. A single number cannot
 * tell "six rules fired once" from "one rule fired six times",
 * which is exactly the regression a rule set this wide invites.
 */
const countRuleIds = (ruleIds: (string | null)[]) => {
  const counts: Record<string, number> = {}

  for (const ruleId of ruleIds) {
    const ruleKey = String(ruleId)

    counts[ruleKey] = (counts[ruleKey] ?? 0) + 1
  }

  return counts
}

/**
 * `defineConfig` rather than a raw array, because
 * `createTypedRules` uses `extends` — which is a `defineConfig`
 * feature, not a flat-config one. Running the test through the
 * same wrapper the README tells consumers to use means a config
 * that only works in the test is not a thing that can happen.
 */
const createTypedLinter = () =>
  new ESLint({
    cwd: packageRoot,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      createTypedRules({
        files: ["**/*.ts"],
        tsconfigRootDir: packageRoot,
      }),
    ),
  })

// ---------------------------------------------------------------
// Booleans get an is/has prefix
// ---------------------------------------------------------------

test("boolean without an is/has prefix is reported", async () => {
  const ruleIds = await getRuleIds(
    createTypedLinter(),
    "badBooleanName.ts",
  )

  const violations = ruleIds.filter(
    (ruleId) =>
      ruleId === "@typescript-eslint/naming-convention",
  )

  // A bare `const`, an annotated `const`, and a parameter.
  expect(violations).toHaveLength(3)
}, 30_000)

test("is/has-prefixed booleans and non-booleans are clean", async () => {
  const ruleIds = await getRuleIds(
    createTypedLinter(),
    "goodBooleanName.ts",
  )

  expect(ruleIds).toEqual([])
}, 30_000)

// ---------------------------------------------------------------
// id-length
// ---------------------------------------------------------------

test("single-letter identifier is reported", async () => {
  const ruleIds = await getRuleIds(
    createTypedLinter(),
    "shortIdentifier.ts",
  )

  expect(ruleIds).toContain("id-length")
}, 30_000)

// ---------------------------------------------------------------
// Logical properties only
//
// Syntax-only on purpose: `no-restricted-syntax` needs no type
// information, and keeping the type checker out of this instance
// is what lets the .tsx fixtures skip a React dependency.
// ---------------------------------------------------------------

const createMarkupLinter = () =>
  new ESLint({
    cwd: packageRoot,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      {
        files: ["**/*.tsx"],
        languageOptions: {
          // The TypeScript parser, but with no `projectService`.
          // The fixtures are annotated TSX, so espree cannot read
          // them at all — and a parse error surfaces as a `null`
          // ruleId, which looks exactly like "the rule found
          // nothing".
          parser: tseslint.parser,
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
        },
      },
      createLogicalPropertiesRules({
        files: ["**/*.tsx"],
      }),
    ),
  })

test("physical-direction utilities in className are reported", async () => {
  const ruleIds = await getRuleIds(
    createMarkupLinter(),
    "physicalDirectionClassName.tsx",
  )

  const violations = ruleIds.filter(
    (ruleId) => ruleId === "no-restricted-syntax",
  )

  // One per offending className: two literals in the first
  // component, then modifier, negative, rounded, template,
  // float, and inset.
  expect(violations).toHaveLength(8)
}, 30_000)

test("logical utilities and their near misses are clean", async () => {
  const ruleIds = await getRuleIds(
    createMarkupLinter(),
    "logicalDirectionClassName.tsx",
  )

  // `border-red-500`, `rounded-lg`, `place-items-center`, and
  // `text-relaxed` all contain a physical utility as a substring.
  // If this ever fails, the pattern lost its anchors.
  expect(ruleIds).toEqual([])
}, 30_000)

// ---------------------------------------------------------------
// Component choice — reach for the library, not a raw element
//
// The `files` argument is the whole mechanism keeping these rules
// off `@charcuterie/ui`, so the linter under test is wired the
// way a consumer wires it: the parser matches every fixture, and
// the rules match only the app-side one.
// ---------------------------------------------------------------

const createComponentChoiceLinter = () =>
  new ESLint({
    cwd: packageRoot,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      {
        files: ["**/*.tsx"],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
        },
        rules: {
          // Stands in for the rest of a consumer's config, and
          // it is load-bearing: `require-suppression-reason`
          // must leave *other people's* disable comments alone,
          // and ESLint 10 warns about an unused directive by
          // default, so the foreign disable in the fixture has
          // to have something real to suppress.
          "no-console": "error",
        },
      },
      createComponentChoiceRules({
        files: ["**/__fixtures__/appPackage/**/*.tsx"],
      }),
    ),
  })

test("raw elements and hand-rolled click targets are reported", async () => {
  const ruleIds = await getReportedRuleIds(
    createComponentChoiceLinter(),
    "appPackage/rawComponentChoice.tsx",
  )

  expect(countRuleIds(ruleIds)).toEqual({
    // `<div>`, `<li>`, `<span>`.
    "charcuterie/no-clickable-non-interactive": 3,
    // `navigate()`, `router.push()`, `location.href =`.
    "charcuterie/no-navigation-in-click-handler": 3,
    "charcuterie/no-raw-anchor": 1,
    "charcuterie/no-raw-button": 1,
    "charcuterie/no-raw-select": 1,
    "charcuterie/prefer-listbox-over-select": 1,
  })
}, 30_000)

test("every message says which component to reach for instead", async () => {
  const [result] =
    await createComponentChoiceLinter().lintFiles([
      fixture("appPackage/rawComponentChoice.tsx"),
    ])

  // A rule that only says "don't" changes nobody's next edit.
  // Each message has to name a replacement and an escape hatch.
  for (const message of result.messages) {
    expect(message.message).toMatch(
      /TextLink|ButtonLink|Button|IconButton|Listbox|Combobox/,
    )
    expect(message.message).toContain(
      "eslint-disable-next-line",
    )
  }
}, 30_000)

test("library components and their near misses are clean", async () => {
  const ruleIds = await getReportedRuleIds(
    createComponentChoiceLinter(),
    "appPackage/libraryComponentChoice.tsx",
  )

  // `rows.push(…)` is an array append, `name.replace(…)` is a
  // string method, and a `role`/`tabIndex` is a deliberate
  // widget. If this ever fails, a rule lost its guard.
  expect(ruleIds).toEqual([])
}, 30_000)

test("a disable comment with a reason silences the rule it names", async () => {
  const eslint = createComponentChoiceLinter()

  const reportedRuleIds = await getReportedRuleIds(
    eslint,
    "appPackage/justifiedSuppression.tsx",
  )

  expect(reportedRuleIds).toEqual([])

  // …and the violations are still *there*, which is what makes
  // the previous assertion mean "suppressed" rather than
  // "never matched".
  const suppressedRuleIds = await getSuppressedRuleIds(
    eslint,
    "appPackage/justifiedSuppression.tsx",
  )

  expect(suppressedRuleIds.sort()).toEqual([
    "charcuterie/no-raw-anchor",
    "charcuterie/no-raw-select",
    "charcuterie/prefer-listbox-over-select",
  ])
}, 30_000)

test("a disable comment with no reason is itself reported", async () => {
  const ruleIds = await getReportedRuleIds(
    createComponentChoiceLinter(),
    "appPackage/unjustifiedSuppression.tsx",
  )

  // The named-rule disable and the blanket one. The
  // `no-console` disable belongs to somebody else's rule and is
  // left alone.
  expect(countRuleIds(ruleIds)).toEqual({
    "charcuterie/require-suppression-reason": 2,
  })
}, 30_000)

test("the rules do not reach @charcuterie/ui's own source", async () => {
  const ruleIds = await getReportedRuleIds(
    createComponentChoiceLinter(),
    "uiPackage/rawElements.tsx",
  )

  // Raw `<a>`, `<button>`, `<select>` and a `<div onClick>`,
  // none of them suppressed — the `files` glob is the only thing
  // holding this, which is exactly why it is asserted.
  expect(ruleIds).toEqual([])
}, 30_000)

// ---------------------------------------------------------------
// test(), not it()
// ---------------------------------------------------------------

test("it() is reported in favour of test()", async () => {
  const eslint = new ESLint({
    cwd: packageRoot,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      createTestRules({ files: ["**/*.ts"] }),
    ),
  })

  const ruleIds = await getRuleIds(
    eslint,
    "consistentTestIt.ts",
  )

  expect(ruleIds).toContain("vitest/consistent-test-it")
}, 30_000)
