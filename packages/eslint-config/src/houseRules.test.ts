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
