# `@charcuterie/eslint-config`

Biome does the formatting and most of the linting. This package holds only what
Biome **cannot** express: rules needing TypeScript type information, and one custom
AST query.

Extracted from `mux-magic/eslint.config.js`, the reference app for every convention
in this repo, so apps consume one import instead of six copy-pasted config files.

## Usage

```js
// eslint.config.js
import {
  createLogicalPropertiesRules,
  createReactRules,
  createStoryOverrides,
  createTestRules,
  createTypedRules,
} from "@charcuterie/eslint-config"
import { defineConfig } from "eslint/config"

export default defineConfig(
  { ignores: ["**/dist/**", "**/node_modules/**"] },
  createTypedRules({
    tsconfigRootDir: import.meta.dirname,
  }),
  createReactRules({ files: ["packages/ui/**/*.tsx"] }),
  createLogicalPropertiesRules({
    files: ["packages/ui/**/*.tsx"],
  }),
  createStoryOverrides({}),
  createTestRules({}),
)
```

Every export is a **factory taking `files`** rather than a fixed config array. A
shared config that hard-codes `packages/web/**` is a mux-magic config wearing a
shared name; the consumer knows its own layout and this package does not.

`createTypedRules` needs `tsconfigRootDir` because it turns on `projectService` —
there is no honest default for where somebody else's tsconfig lives.

## The rules

| Rule | Why it is here and not in Biome |
| --- | --- |
| `@typescript-eslint/naming-convention` (is/has booleans) | keys off `types: ["boolean"]`, which needs the type checker |
| `id-length` (min 2, `_` and `$` exempt) | Biome has no equivalent |
| `react/no-multi-comp` | one component per file; off for stories and `__fixtures__` |
| `vitest/consistent-test-it` (`test`, not `it`) | auto-fixable, which is the only reason a rule this cosmetic earns a slot |
| `no-restricted-syntax` (logical properties only) | **new here** — see below |

## Logical properties only

Every spatial value in this fleet is consumed logically — `ps-`/`pe-`, `ms-`/`me-`,
`start-`/`end-`, `border-s`/`border-e`, `text-start`/`text-end`. It costs nothing
today and makes RTL nearly free later, which is why it is a lint rule rather than a
preference: a preference survives until the first person in a hurry.

**Scope is deliberately narrow** — `className` string literals and template chunks
only. Physical property *names* in style objects (`left`, `paddingRight`) are not
matched, because `left` and `right` are legitimate identifiers in far too many
places: `getBoundingClientRect().left`, Floating UI placements, gradient stops. A
rule that cries wolf on those gets switched off, and a switched-off rule enforces
nothing. Same reasoning that keeps the contrast gate scoped to control boundaries
rather than every line on screen.

The pattern's anchors are load-bearing, and `__fixtures__/logicalDirectionClassName.tsx`
exists to prove it: `border-red-500` contains `border-r`, `rounded-lg` contains
`rounded-l`, `place-items-center` starts with `pl`. All three must stay clean.

## Tests

`src/houseRules.test.ts` runs the real `ESLint` class over `src/__fixtures__/`,
following `mux-magic/packages/tools/src/eslintBooleanPrefixRule.test.ts`. Asserting
against the actual engine rather than a rule-tester harness catches the failure this
repo is most likely to hit — a rule configured correctly that never *applies*,
because a `files` glob or a parser option is wrong. That silent no-op is
indistinguishable from "clean" in CI.

`src/__fixtures__/` has its own `tsconfig.json` so the type-aware rules can resolve
it, and is excluded from the package's own typecheck — the fixtures are lint input,
not source.
