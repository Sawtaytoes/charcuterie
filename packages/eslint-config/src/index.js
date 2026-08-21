/**
 * The house ESLint rules.
 *
 * Biome does the formatting and the bulk of the linting. ESLint is
 * kept for exactly the rules Biome cannot express — the ones that
 * need TypeScript type information, or a custom AST query — which
 * is the same division of labour as `mux-magic/eslint.config.js`,
 * the reference app for every convention in this repo.
 *
 * Everything is exported as a factory taking `files` rather than a
 * fixed config array, because each consumer's package layout is
 * different and hard-coding `packages/web/**` here would make this
 * a mux-magic config with a shared name on it.
 */

import vitestPlugin from "@vitest/eslint-plugin"
import reactPlugin from "eslint-plugin-react"
import tseslint from "typescript-eslint"

import { PHYSICAL_DIRECTION_SELECTORS } from "./logicalProperties.js"
import { CHARCUTERIE_NAMESPACE } from "./namespace.js"
import { charcuteriePlugin } from "./plugin.js"

/**
 * `typescript-eslint` itself, re-exported.
 *
 * **A consumer that composes `tseslint.configs.*` alongside this
 * package must import it from here, never from its own
 * `typescript-eslint`.** Flat config throws
 * `Cannot redefine plugin "@typescript-eslint"` when two config
 * blocks register that namespace with two different objects — and
 * two objects is exactly what a second copy in the tree produces.
 *
 * That is not hypothetical: `board-game-picker` adopted the
 * preset with `typescript-eslint` pinned at 8.66.0 in its own
 * lockfile while this package resolved 8.67.0 beside it, and
 * `eslint .` failed outright. `docket`, with the same declared
 * range, happened to dedupe and worked. Which of those a repo
 * gets is a property of its lockfile, not of its config.
 *
 * Re-exporting removes the coin flip rather than documenting it:
 * there is one instance in play because there is one import
 * specifier for it.
 */
export { default as tseslint } from "typescript-eslint"
export {
  APP_IGNORES,
  createAppConfig,
  createPickerRules,
  PICKER_RULE_IDS,
} from "./appConfig.js"
export {
  COMPONENT_CHOICE_NAMESPACE,
  COMPONENT_CHOICE_RULE_IDS,
  COMPONENT_CHOICE_RULES,
  NO_CLICKABLE_NON_INTERACTIVE_MESSAGE,
  NO_NAVIGATION_IN_CLICK_HANDLER_MESSAGE,
  NO_RAW_ANCHOR_MESSAGE,
  NO_RAW_BUTTON_MESSAGE,
  NO_RAW_SELECT_MESSAGE,
  NON_INTERACTIVE_ELEMENTS,
  PREFER_LISTBOX_OVER_SELECT_MESSAGE,
  REQUIRE_SUPPRESSION_REASON_MESSAGE,
  SUPPRESSION_GUARDED_RULE_IDS,
  UI_PACKAGE_NAME,
} from "./componentChoice.js"
export {
  FLEX_CONTAINER_PATTERN,
  FLEX_ESCAPE_PATTERN,
  FLEX_OVERFLOW_RULE_IDS,
  FLEX_OVERFLOW_RULES,
  NO_SHRINK_0_WITH_FLEX_WRAP_MESSAGE,
  NO_UNCONSTRAINED_FLEX_TEXT_MESSAGE,
  TEXT_ELEMENTS,
} from "./flexOverflow.js"
export {
  createGeneratedIgnores,
  GENERATED_SCHEMA_GLOBS,
} from "./generatedGlobs.js"
export {
  PHYSICAL_DIRECTION_MESSAGE,
  PHYSICAL_DIRECTION_PATTERN,
  PHYSICAL_DIRECTION_SELECTORS,
} from "./logicalProperties.js"
export { CHARCUTERIE_NAMESPACE } from "./namespace.js"
export {
  charcuteriePlugin,
  componentChoicePlugin,
} from "./plugin.js"

/**
 * AGENTS.md: booleans start with `is` or `has` — including Home
 * Assistant `variables:` that render a boolean template.
 *
 * This lives in ESLint and not Biome because it keys off
 * `types: ["boolean"]`, which needs the type checker.
 *
 * The selector list is deliberately `typeProperty` and
 * `classProperty` rather than the broader `property`: object
 * literal properties are frequently an external API contract
 * (a yargs option config, a DOM `EventInit`) that cannot be
 * renamed to satisfy a house rule.
 */
export const IS_HAS_BOOLEAN_RULE = {
  selector: [
    "variable",
    "parameter",
    "typeProperty",
    "classProperty",
  ],
  types: ["boolean"],
  format: null,
  prefix: ["is", "has"],
  // `_` ignore-placeholders and `__dirname`-style globals.
  filter: { regex: "^(__|_)", match: false },
}

/**
 * ESLint types a configured rule as the tuple
 * `[Severity, ...unknown[]]`. A plain JS array literal widens to
 * `(string | object)[]` instead, which every consumer's
 * `defineConfig` call then rejects.
 *
 * Annotating at the source is the fix — it keeps the assertion
 * out of six different call sites and out of the tests, where a
 * cast would quietly hide the same mismatch rather than
 * describing it.
 *
 * @param {...unknown} options
 * @returns {["error", ...unknown[]]}
 */
const asError = (...options) => ["error", ...options]

/**
 * The type-aware base. Needs `projectService`, so the consumer has
 * to say where its tsconfig root is — there is no honest default.
 */
export const createTypedRules = ({
  files = ["**/*.{ts,tsx}"],
  tsconfigRootDir,
}) => ({
  files,
  extends: [tseslint.configs.base],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir,
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: true,
  },
  rules: {
    // Spell names out. Biome has no `id-length` equivalent.
    // `_` is the conventional ignored-parameter placeholder and
    // `$` is the conventional cheerio selector.
    "id-length": asError({
      min: 2,
      exceptions: ["_", "$"],
      // Property names often mirror an external API
      // (`DOMRect.x`), so length is enforced on variables and
      // parameters only.
      properties: "never",
    }),
    "@typescript-eslint/naming-convention": asError(
      IS_HAS_BOOLEAN_RULE,
    ),
  },
})

/** One component per file. */
export const createReactRules = ({
  files = ["**/*.tsx"],
  version = "19.0.0",
}) => ({
  files,
  plugins: { react: reactPlugin },
  settings: { react: { version } },
  rules: {
    "react/no-multi-comp": asError({
      ignoreStateless: false,
    }),
  },
})

/**
 * Stories and fixtures legitimately export several components —
 * the mandated `AllVariants` story is a grid of them, which is the
 * whole reason it exists.
 */
export const createStoryOverrides = ({
  files = [
    "**/__fixtures__/**/*.{ts,tsx}",
    "**/*.stories.tsx",
    "**/*.storyHelpers.tsx",
  ],
}) => ({
  files,
  rules: {
    // Annotated for the same reason `asError` exists: a bare
    // `"off"` widens to `string`, which `defineConfig` rejects —
    // and it only surfaced once `createAppConfig` put this block
    // in an array beside the others, where the union is inferred.
    "react/no-multi-comp": /** @type {"off"} */ ("off"),
  },
})

/**
 * `test()`, not `it()`. Auto-fixable, which is the only reason a
 * rule this cosmetic earns its place.
 */
export const createTestRules = ({
  files = ["**/*.test.{ts,tsx}"],
}) => ({
  files,
  plugins: { vitest: vitestPlugin },
  rules: {
    "vitest/consistent-test-it": asError({
      fn: "test",
    }),
  },
})

/**
 * Logical properties only. Scoped by the consumer, because the
 * rule is about *shipped component markup* — a one-off script or
 * a preview page has nobody to be RTL-correct for.
 */
export const createLogicalPropertiesRules = ({
  files = ["**/*.tsx"],
}) => ({
  files,
  rules: {
    "no-restricted-syntax": asError(
      ...PHYSICAL_DIRECTION_SELECTORS,
    ),
  },
})

/**
 * Component choice — reach for the library, not a raw element.
 *
 * **Opt-in, and deliberately not folded into the base.** Five
 * apps would go red on adoption day, and a config that turns a
 * whole repo red is a config that gets reverted rather than
 * migrated. A consumer adds this block when it is ready to fix
 * what it finds, one app at a time.
 *
 * `files` has no useful default here, and that is the point:
 * `@charcuterie/ui` renders raw `<a>`, `<button>` and `<select>`
 * because rendering them correctly *is* the library. Point
 * `files` at the app's own source (`packages/web/**\/*.tsx`) and
 * the library never matches. A `**\/*.tsx` default would have
 * made the library the first thing the rules broke, so the
 * default is the narrow one and the consumer widens it.
 */
export const createComponentChoiceRules = ({
  files = ["src/**/*.tsx"],
}) => ({
  files,
  plugins: {
    [CHARCUTERIE_NAMESPACE]: charcuteriePlugin,
  },
  // `asError()` rather than a bare `"error"` for the reason its
  // own docstring gives: a string literal in an object with a
  // computed key widens to `string`, which every consumer's
  // `defineConfig` then rejects.
  rules: {
    [`${CHARCUTERIE_NAMESPACE}/no-clickable-non-interactive`]:
      asError(),
    [`${CHARCUTERIE_NAMESPACE}/no-navigation-in-click-handler`]:
      asError(),
    [`${CHARCUTERIE_NAMESPACE}/no-raw-anchor`]: asError(),
    [`${CHARCUTERIE_NAMESPACE}/no-raw-button`]: asError(),
    [`${CHARCUTERIE_NAMESPACE}/no-raw-select`]: asError(),
    [`${CHARCUTERIE_NAMESPACE}/prefer-listbox-over-select`]:
      asError(),
    [`${CHARCUTERIE_NAMESPACE}/require-suppression-reason`]:
      asError(),
  },
})

/**
 * Flex overflow — a long unbreakable token cannot be allowed to
 * set a row's width.
 *
 * **Opt-in, and split across two severities on purpose.**
 *
 * `no-unconstrained-flex-text` is a heuristic: it can see that a
 * flex row's text child renders `{something}` and says nothing
 * about how it may shrink, but it cannot know whether that
 * something is `"OK"` or a 300-character URL. It ships as a
 * **`warn`**, because the four bugs it exists to catch were each
 * one line of CSS and a rule that turns a repo red over a
 * judgement call is a rule that gets deleted rather than
 * satisfied. A consumer that has swept its app can promote it.
 *
 * `no-shrink-0-with-flex-wrap` is not a heuristic — the two
 * classes contradict each other outright — so it is an
 * **`error`**.
 *
 * `require-suppression-reason` is enabled here too, because these
 * rules' escape hatches owe the same one line the component-choice
 * ones do. Enabling it in both blocks is harmless: flat config
 * keys rules by id, so it still runs once.
 */
export const createFlexOverflowRules = ({
  files = ["src/**/*.tsx"],
  severity = "warn",
} = {}) => ({
  files,
  plugins: {
    [CHARCUTERIE_NAMESPACE]: charcuteriePlugin,
  },
  rules: {
    [`${CHARCUTERIE_NAMESPACE}/no-unconstrained-flex-text`]:
      /** @type {["warn" | "error"]} */ ([severity]),
    [`${CHARCUTERIE_NAMESPACE}/no-shrink-0-with-flex-wrap`]:
      asError(),
    [`${CHARCUTERIE_NAMESPACE}/require-suppression-reason`]:
      asError(),
  },
})
