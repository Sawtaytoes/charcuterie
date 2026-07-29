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

export {
  PHYSICAL_DIRECTION_MESSAGE,
  PHYSICAL_DIRECTION_PATTERN,
  PHYSICAL_DIRECTION_SELECTORS,
} from "./logicalProperties.js"

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
    "react/no-multi-comp": "off",
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
