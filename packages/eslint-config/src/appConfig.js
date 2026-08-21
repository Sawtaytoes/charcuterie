/**
 * The whole ESLint config an app repo needs, in one call.
 *
 * Every factory in `index.js` takes `files` because a shared
 * config that hard-codes `packages/web/**` is a mux-magic config
 * wearing a shared name. That is still true, and those factories
 * are still the answer for an app with a bespoke layout — but it
 * left every ordinary app hand-composing the same seven blocks,
 * and six of them drifted:
 *
 *   - `portly-controllers`, `gallery-downloader`, `mux-magic` and
 *     `image-viewer` each hand-registered the plugin object and
 *     the two picker rules by name, with four different comments
 *     explaining the same reasoning.
 *   - `board-game-picker` and `docket` never got the block wired
 *     at all, so the fleet's one machine-enforced picker rule was
 *     enforced in four repos out of eight.
 *
 * A rule the library ships but half the fleet has to re-derive
 * is a rule the fleet does not have. `createAppConfig` is the
 * default answer: name where your source lives, and the house
 * rules arrive already composed, already scoped off the library,
 * already in the right order.
 *
 * It composes the same exported factories a bespoke config would
 * call, so there is no second implementation to keep in step.
 */

import { GENERATED_SCHEMA_GLOBS } from "./generatedGlobs.js"
/**
 * The rule factories live in `index.js`, which also re-exports
 * this module — a cycle. It is safe because every binding below is
 * read inside `createAppConfig`'s body, which nobody calls during
 * module evaluation; by then `index.js` has finished. The one
 * value needed *at* evaluation time, `GENERATED_SCHEMA_GLOBS`, is
 * imported from `generatedGlobs.js` above for exactly that reason.
 */
import {
  createComponentChoiceRules,
  createFlexOverflowRules,
  createLogicalPropertiesRules,
  createReactRules,
  createStoryOverrides,
  createTestRules,
  createTypedRules,
} from "./index.js"
import { CHARCUTERIE_NAMESPACE } from "./namespace.js"
import { charcuteriePlugin } from "./plugin.js"

/**
 * Build output, dependencies, and the scratch directories the
 * workspace conventions put in every repo.
 *
 * Collected from what the eight app repos were each ignoring by
 * hand on 2026-08-21; the union is short because they were
 * ignoring the same things. `**\/public/**` is in here because a
 * Vite app's `public/` holds vendored scripts nobody in this
 * fleet wrote.
 */
export const APP_IGNORES = [
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
  "**/playwright-report/**",
  "**/public/**",
  "**/storybook-static/**",
  ".claude/**",
  ".yarn/**",
  "__screenshots__/**",
  "worktrees*/**",
  ...GENERATED_SCHEMA_GLOBS,
]

/**
 * The picker rules, and only those.
 *
 * `createComponentChoiceRules` turns on seven rules at once, and
 * for five of them that is a real sweep an app has not done —
 * `no-raw-button` alone fires on every icon row in the fleet. So
 * every repo that wanted the picker rule hand-registered the
 * plugin and named two rule ids, and wrote a paragraph explaining
 * why it was not calling the factory next to it. Four repos, four
 * copies of that paragraph.
 *
 * This is that subset, named. It is the one component-choice rule
 * family with a standing fleet decision behind it and no
 * remaining backlog: `Select` is deprecated, `Picker` is the
 * drop-in, and every owned app was swept onto `Listbox` on
 * 2026-08-21. Nothing here is a judgement call, which is why the
 * preset can turn it on by default and the other five stay opt-in.
 *
 * `require-suppression-reason` comes along because a disable with
 * no `-- why` is what makes the escape hatch decorative. Enabling
 * it here and in `createComponentChoiceRules` is harmless: flat
 * config keys rules by id, so it still runs once.
 *
 * @see docs/decisions/2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md
 */
export const PICKER_RULE_IDS = [
  "no-raw-select",
  "prefer-listbox-over-select",
  "require-suppression-reason",
].map((ruleName) => `${CHARCUTERIE_NAMESPACE}/${ruleName}`)

/**
 * Same scoping contract as `createComponentChoiceRules`: point
 * `files` at the app's own markup, never at `@charcuterie/ui`,
 * which renders a raw `<select>` because rendering one correctly
 * *is* the library.
 */
export const createPickerRules = ({
  files = ["src/**/*.tsx"],
} = {}) => ({
  files,
  plugins: {
    [CHARCUTERIE_NAMESPACE]: charcuteriePlugin,
  },
  rules: Object.fromEntries(
    PICKER_RULE_IDS.map((ruleId) => [
      ruleId,
      /** @type {["error"]} */ (["error"]),
    ]),
  ),
})

/**
 * Files that legitimately declare more than one component, so
 * `react/no-multi-comp` is off for them.
 *
 * `createStoryOverrides` already exempts stories and
 * `__fixtures__` — a mandated `AllVariants` story is a grid of
 * components, which is the whole reason it exists. Two more
 * shapes turned up the moment real apps ran the preset, and both
 * are the same argument rather than a new one:
 *
 *   - **`*.test.tsx`.** A component test that needs a wrapper
 *     declares a harness beside the assertion.
 *     `board-game-picker`'s `SelectMenu.test.tsx` mounts an
 *     `OutsideHarness` to prove a picker remounts when its value
 *     changes from outside — the harness *is* the test. Splitting
 *     it into a second file to satisfy a rule about production
 *     modules puts the setup somewhere the reader is not.
 *   - **An icon module.** Charcuterie ships no icons on purpose,
 *     so every app brings its own, and in this fleet that is one
 *     file of glyphs: `mail-sifter/components/icons.tsx` (19 of
 *     them), `board-game-picker/components/schemeIcons.tsx`
 *     (three). Nineteen one-line files would be strictly worse,
 *     and nobody would write them — the rule would just get
 *     switched off, which is the outcome this list exists to
 *     avoid.
 *
 * It is a **preset-level** decision and not a change to
 * `createStoryOverrides`, whose defaults a hand-composed config
 * still owns. Pass your own `storyFiles` to `createAppConfig` to
 * replace it.
 */
export const MULTI_COMPONENT_FILE_GLOBS = [
  "**/__fixtures__/**/*.{ts,tsx}",
  "**/*.stories.tsx",
  "**/*.storyHelpers.tsx",
  "**/*.test.tsx",
  "**/icons.tsx",
  "**/*Icons.tsx",
]

/**
 * `["src"]` becomes `["src/**\/*.tsx"]`. Directories rather than
 * globs is the whole ergonomic difference between this and
 * calling the factories by hand — an app knows it keeps its
 * source in `src` or `packages/web`; it should not also have to
 * know which blocks want `.tsx` and which want `.{ts,tsx}`, which
 * is precisely what the four hand-rolled configs each got
 * slightly differently.
 *
 * @param {readonly string[]} directories
 * @param {string} extensions
 */
const toGlobs = (directories, extensions) =>
  directories.map(
    (directory) =>
      `${directory.replace(/\/+$/, "")}/**/*.${extensions}`,
  )

/**
 * The house ESLint config for an app repo.
 *
 * ```js
 * // eslint.config.js
 * import { createAppConfig } from "@charcuterie/eslint-config"
 * import { defineConfig } from "eslint/config"
 *
 * export default defineConfig(
 *   ...createAppConfig({
 *     tsconfigRootDir: import.meta.dirname,
 *   }),
 * )
 * ```
 *
 * Returns an **array of config objects**, spread into
 * `defineConfig` by the consumer. It has to go through
 * `defineConfig` rather than being exported as a finished flat
 * config: `createTypedRules` uses `extends`, which is a
 * `defineConfig` feature and not a flat-config one.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir Where the app's
 *   `tsconfig.json` lives — almost always `import.meta.dirname`.
 *   Required, because `projectService` has no honest default for
 *   somebody else's repo.
 * @param {readonly string[]} [options.appDirectories] Where the
 *   app's own source lives, as directories: `["src"]` for a
 *   single-package app, `["packages/web"]` for a monorepo. This
 *   is the scoping that keeps the component rules off
 *   `@charcuterie/ui`.
 * @param {readonly string[]} [options.ignores] Extra paths this
 *   repo ignores, **appended** to `APP_IGNORES` rather than
 *   replacing it — a repo adding one scratch directory should not
 *   have to restate the other eleven.
 * @param {"pickers" | "all" | "off"} [options.componentChoice]
 *   `"pickers"` (default) is the settled subset. `"all"` turns on
 *   all seven component-choice rules — correct once an app has
 *   swept its raw anchors and buttons, and red on adoption day
 *   before that. `"off"` for an app mid-migration.
 * @param {"off" | "warn" | "error"} [options.flexOverflow]
 *   Default `"off"`. The flex rules ship a `warn` heuristic and
 *   one `error`, and that error can land on adoption day in a repo
 *   that has never seen it — so the preset leaves the whole family
 *   to a deliberate opt-in rather than making "adopt the preset"
 *   and "sweep the flex bugs" the same change.
 * @param {string} [options.reactVersion]
 * @param {readonly string[]} [options.storyFiles] Files that may
 *   declare more than one component. Defaults to
 *   `MULTI_COMPONENT_FILE_GLOBS`.
 */
export const createAppConfig = ({
  tsconfigRootDir,
  appDirectories = ["src"],
  ignores = [],
  componentChoice = "pickers",
  flexOverflow = "off",
  reactVersion = "19.0.0",
  storyFiles = MULTI_COMPONENT_FILE_GLOBS,
}) => {
  const componentGlobs = toGlobs(appDirectories, "tsx")
  const sourceGlobs = toGlobs(appDirectories, "{ts,tsx}")

  return [
    { ignores: [...APP_IGNORES, ...ignores] },

    createTypedRules({ tsconfigRootDir }),

    createReactRules({
      files: sourceGlobs,
      version: reactVersion,
    }),

    createLogicalPropertiesRules({
      files: componentGlobs,
    }),

    ...(componentChoice === "off"
      ? []
      : [
          componentChoice === "all"
            ? createComponentChoiceRules({
                files: componentGlobs,
              })
            : createPickerRules({ files: componentGlobs }),
        ]),

    ...(flexOverflow === "off"
      ? []
      : [
          createFlexOverflowRules({
            files: componentGlobs,
            severity: flexOverflow,
          }),
        ]),

    // After the blocks above, because a story legitimately
    // exports the grid of components `react/no-multi-comp`
    // otherwise forbids — and flat config's last word wins.
    createStoryOverrides({ files: storyFiles }),

    createTestRules({}),
  ]
}
