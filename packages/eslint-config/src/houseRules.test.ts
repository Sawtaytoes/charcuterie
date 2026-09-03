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
  APP_IGNORES,
  createAppConfig,
  createComponentChoiceRules,
  createFlexOverflowRules,
  createLogicalPropertiesRules,
  createTestRules,
  createTypedRules,
  GENERATED_SCHEMA_GLOBS,
  MULTI_COMPONENT_FILE_GLOBS,
  tseslint as reExportedTseslint,
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
      /TextLink|ButtonLink|UnstyledLink|Button|IconButton|Listbox|Combobox/,
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
// Flex overflow — a long unbreakable token cannot set a row's
// width
//
// The fixtures are the four rows the fleet fixed on 2026-08-11,
// before and after, verbatim from the shipping commits. A lint
// rule whose motivating bug is not in its fixtures is a rule
// nobody can show catches anything.
// ---------------------------------------------------------------

const createFlexOverflowLinter = () =>
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
      },
      createFlexOverflowRules({
        files: ["**/__fixtures__/appPackage/**/*.tsx"],
      }),
    ),
  })

test("the four rows the fleet fixed are each reported", async () => {
  const ruleIds = await getReportedRuleIds(
    createFlexOverflowLinter(),
    "appPackage/unconstrainedFlexText.tsx",
  )

  expect(countRuleIds(ruleIds)).toEqual({
    // gallery-downloader's `webtoons:<uri>` source span,
    // points-market's item-name `<h3>`, and points-market's
    // recent-buys chip name.
    "charcuterie/no-unconstrained-flex-text": 3,
    // rip-deck's control row, which could never wrap.
    "charcuterie/no-shrink-0-with-flex-wrap": 1,
  })
}, 30_000)

test("the heuristic half is a warning and the contradiction is an error", async () => {
  const [result] =
    await createFlexOverflowLinter().lintFiles([
      fixture("appPackage/unconstrainedFlexText.tsx"),
    ])

  const severityByRuleId = Object.fromEntries(
    result.messages.map((message) => [
      message.ruleId,
      message.severity,
    ]),
  )

  // `no-unconstrained-flex-text` cannot know whether `{status}`
  // is "OK" or a 300-character URL, so it warns. `shrink-0` with
  // `flex-wrap` is a flat contradiction, so it errors.
  expect(severityByRuleId).toEqual({
    "charcuterie/no-shrink-0-with-flex-wrap": 2,
    "charcuterie/no-unconstrained-flex-text": 1,
  })
}, 30_000)

test("every flex message names an escape that would fix it", async () => {
  const [result] =
    await createFlexOverflowLinter().lintFiles([
      fixture("appPackage/unconstrainedFlexText.tsx"),
    ])

  for (const message of result.messages) {
    expect(message.message).toMatch(
      /min-w-0|wrap-anywhere|truncate|shrink-0/,
    )
    expect(message.message).toContain(
      "eslint-disable-next-line",
    )
  }
}, 30_000)

test("the shipped fixes and the near misses are clean", async () => {
  const ruleIds = await getReportedRuleIds(
    createFlexOverflowLinter(),
    "appPackage/constrainedFlexText.tsx",
  )

  // Four different fixes, all accepted: `min-w-0 wrap-anywhere`,
  // `flex-wrap` + `shrink-0`, `truncate` + `title`, and removing
  // `shrink-0`. Plus the near misses — a column container, static
  // text, `{children}`, a `.map(…)`, and an unreadable className.
  expect(ruleIds).toEqual([])
}, 30_000)

test("the flex rules do not reach @charcuterie/ui's own source", async () => {
  const ruleIds = await getReportedRuleIds(
    createFlexOverflowLinter(),
    "uiPackage/rawElements.tsx",
  )

  expect(ruleIds).toEqual([])
}, 30_000)

test("both rule families can be enabled side by side", async () => {
  // The regression this composition exists to prevent: two config
  // blocks registering the `charcuterie` namespace. ESLint throws
  // `Cannot redefine plugin` when the objects differ, and the
  // whole reason both factories hand it the same reference is so
  // that a consumer can turn on one, the other, or both.
  const eslint = new ESLint({
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
      },
      createComponentChoiceRules({
        files: ["**/__fixtures__/appPackage/**/*.tsx"],
      }),
      createFlexOverflowRules({
        files: ["**/__fixtures__/appPackage/**/*.tsx"],
      }),
    ),
  })

  const ruleIds = await getReportedRuleIds(
    eslint,
    "appPackage/unconstrainedFlexText.tsx",
  )

  expect(countRuleIds(ruleIds)).toEqual({
    "charcuterie/no-shrink-0-with-flex-wrap": 1,
    "charcuterie/no-unconstrained-flex-text": 3,
  })
}, 30_000)

test("a flex-rule disable with no reason is itself reported", async () => {
  const ruleIds = await getReportedRuleIds(
    createFlexOverflowLinter(),
    "appPackage/unjustifiedFlexSuppression.tsx",
  )

  // The bare disable owes the same one line a component-choice
  // one does — the escape hatch is the reason.
  expect(countRuleIds(ruleIds)).toEqual({
    "charcuterie/require-suppression-reason": 1,
  })
}, 30_000)

test("a flex-rule disable with a reason silences it", async () => {
  const eslint = createFlexOverflowLinter()

  const reportedRuleIds = await getReportedRuleIds(
    eslint,
    "appPackage/justifiedFlexSuppression.tsx",
  )

  expect(reportedRuleIds).toEqual([])

  const suppressedRuleIds = await getSuppressedRuleIds(
    eslint,
    "appPackage/justifiedFlexSuppression.tsx",
  )

  expect(suppressedRuleIds).toEqual([
    "charcuterie/no-unconstrained-flex-text",
  ])
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

// ---------------------------------------------------------------
// The app preset
//
// `createAppConfig` is the one call an ordinary app repo makes, so
// what it needs proving is not that the rules work — the blocks
// above do that — but that composing them **as a consumer would**
// still scopes correctly. The failure this catches is the one the
// fleet actually hit: a preset that looks adopted and enforces
// nothing, because a derived glob missed the app's source.
// ---------------------------------------------------------------

const fixturesRoot = resolve(
  packageRoot,
  "src/__fixtures__",
)

const createPresetLinter = (
  options: Partial<
    Parameters<typeof createAppConfig>[0]
  > = {},
) =>
  new ESLint({
    cwd: packageRoot,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      ...createAppConfig({
        tsconfigRootDir: fixturesRoot,
        appDirectories: ["src/__fixtures__/appPackage"],
        ...options,
      }),
    ),
  })

const getCharcuterieRuleIds = async (
  eslint: ESLint,
  fixtureName: string,
) =>
  (await getReportedRuleIds(eslint, fixtureName)).filter(
    (ruleId) => ruleId?.startsWith("charcuterie/"),
  )

test("the preset enforces the picker rules and nothing else", async () => {
  const ruleIds = await getCharcuterieRuleIds(
    createPresetLinter(),
    "appPackage/rawComponentChoice.tsx",
  )

  // The default is the settled subset, not all seven. The raw
  // `<a>`, the raw `<button>`, the three hand-rolled click
  // targets and the three in-handler navigations in this fixture
  // are each a real sweep an app has not done — a preset that
  // reported them would be a preset nobody adopts.
  expect(countRuleIds(ruleIds)).toEqual({
    "charcuterie/no-raw-select": 1,
    "charcuterie/prefer-listbox-over-select": 1,
  })
}, 30_000)

test("the preset does not reach @charcuterie/ui's own source", async () => {
  // `appDirectories` is the whole scoping mechanism. The library
  // renders a raw `<select>` because rendering one correctly *is*
  // the library, so a preset that widened its own globs would
  // make the library the first thing it broke.
  const ruleIds = await getCharcuterieRuleIds(
    createPresetLinter(),
    "uiPackage/rawElements.tsx",
  )

  expect(ruleIds).toEqual([])
}, 30_000)

test("componentChoice: all widens the preset to every rule", async () => {
  const ruleIds = await getCharcuterieRuleIds(
    createPresetLinter({ componentChoice: "all" }),
    "appPackage/rawComponentChoice.tsx",
  )

  expect(countRuleIds(ruleIds)).toEqual({
    "charcuterie/no-clickable-non-interactive": 3,
    "charcuterie/no-navigation-in-click-handler": 3,
    "charcuterie/no-raw-anchor": 1,
    "charcuterie/no-raw-button": 1,
    "charcuterie/no-raw-select": 1,
    "charcuterie/prefer-listbox-over-select": 1,
  })
}, 30_000)

test("componentChoice: off leaves an app mid-migration alone", async () => {
  const ruleIds = await getCharcuterieRuleIds(
    createPresetLinter({ componentChoice: "off" }),
    "appPackage/rawComponentChoice.tsx",
  )

  expect(ruleIds).toEqual([])
}, 30_000)

test("the preset's picker escape hatch still owes a reason", async () => {
  const ruleIds = await getCharcuterieRuleIds(
    createPresetLinter(),
    "appPackage/unjustifiedSuppression.tsx",
  )

  // `require-suppression-reason` rides along with the picker
  // subset. Without it the hatch is a bare `eslint-disable-next-
  // line`, which is the loophole that makes the whole rule
  // decorative.
  expect(ruleIds).toContain(
    "charcuterie/require-suppression-reason",
  )
}, 30_000)

test("the preset carries the fleet's logical-properties rule", async () => {
  const ruleIds = await getReportedRuleIds(
    createPresetLinter({
      appDirectories: ["src/__fixtures__"],
    }),
    "physicalDirectionClassName.tsx",
  )

  expect(ruleIds).toContain("no-restricted-syntax")
}, 30_000)

test("the flex rules stay a deliberate opt-in", async () => {
  const eslint = createPresetLinter()

  const defaultRuleIds = await getCharcuterieRuleIds(
    eslint,
    "appPackage/unconstrainedFlexText.tsx",
  )

  // `no-shrink-0-with-flex-wrap` is an `error`, and this fixture
  // is four real rows the fleet had to fix. Turning that on as
  // part of "adopt the preset" would make adoption day and the
  // flex sweep the same change.
  expect(defaultRuleIds).toEqual([])

  const optedInRuleIds = await getCharcuterieRuleIds(
    createPresetLinter({ flexOverflow: "warn" }),
    "appPackage/unconstrainedFlexText.tsx",
  )

  expect(countRuleIds(optedInRuleIds)).toEqual({
    "charcuterie/no-shrink-0-with-flex-wrap": 1,
    "charcuterie/no-unconstrained-flex-text": 3,
  })
}, 30_000)

test("a repo's own ignores are added to the house list, not swapped for it", async () => {
  const [{ ignores }] = createAppConfig({
    tsconfigRootDir: fixturesRoot,
    ignores: ["scratch/**"],
  }) as [{ ignores: string[] }]

  // A repo adding one scratch directory should not have to
  // restate `dist`, `node_modules` and the generated schemas —
  // that restatement is exactly how the eight hand-written
  // configs drifted apart.
  expect(ignores).toEqual([...APP_IGNORES, "scratch/**"])
  expect(APP_IGNORES).toEqual(
    expect.arrayContaining(GENERATED_SCHEMA_GLOBS),
  )
})

test("the re-exported typescript-eslint is the instance the preset uses", async () => {
  // The `Cannot redefine plugin "@typescript-eslint"` failure,
  // pinned. A consumer composing `tseslint.configs.*` beside
  // `createAppConfig` hands ESLint a second plugin object if its
  // `typescript-eslint` resolves to a different copy than this
  // package's — which is a property of the consumer's lockfile,
  // not of its config. board-game-picker hit it (8.66.0 beside
  // 8.67.0); docket, with the same declared range, deduped and
  // did not.
  //
  // Asserting on the plugin object rather than on the version is
  // deliberate: it is object identity that flat config checks, so
  // matching version strings would prove nothing.
  const eslint = new ESLint({
    cwd: packageRoot,
    overrideConfigFile: true,
    overrideConfig: defineConfig(
      ...createAppConfig({
        tsconfigRootDir: fixturesRoot,
        appDirectories: ["src/__fixtures__/appPackage"],
      }),
      {
        files: ["**/*.{ts,tsx}"],
        extends: [reExportedTseslint.configs.base],
      },
    ),
  })

  const ruleIds = await getCharcuterieRuleIds(
    eslint,
    "appPackage/rawComponentChoice.tsx",
  )

  expect(countRuleIds(ruleIds)).toEqual({
    "charcuterie/no-raw-select": 1,
    "charcuterie/prefer-listbox-over-select": 1,
  })
}, 30_000)

test("an icon module and a test harness may declare several components", async () => {
  // Both turned up the moment real apps ran the preset, and both
  // are the same argument the story exemption already makes: the
  // file's job is to hold a set. board-game-picker's
  // `SelectMenu.test.tsx` mounts a harness to prove a picker
  // remounts; its `schemeIcons.tsx` holds three glyphs, and
  // mail-sifter's `icons.tsx` holds nineteen.
  const eslint = createPresetLinter()

  expect(
    await getReportedRuleIds(
      eslint,
      "appPackage/schemeIcons.tsx",
    ),
  ).toEqual([])

  expect(
    await getReportedRuleIds(
      eslint,
      "appPackage/pickerHarness.test.tsx",
    ),
  ).toEqual([])
}, 30_000)

test("an ordinary component file still declares only one", async () => {
  // The exemption is a list of globs, not a repeal.
  //
  // Every fixture in this package lives under `__fixtures__/`,
  // which is itself on the list — so the only honest way to show
  // the rule is on by default is to lint one of them with that
  // glob removed. If this ever goes quiet,
  // `MULTI_COMPONENT_FILE_GLOBS` has grown a pattern wide enough
  // to match production source.
  const ruleIds = await getReportedRuleIds(
    createPresetLinter({
      storyFiles: MULTI_COMPONENT_FILE_GLOBS.filter(
        (glob) => !glob.includes("__fixtures__"),
      ),
    }),
    "appPackage/rawComponentChoice.tsx",
  )

  expect(ruleIds).toContain("react/no-multi-comp")
}, 30_000)
