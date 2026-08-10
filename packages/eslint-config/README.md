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
  createComponentChoiceRules,
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
  // Opt-in, and pointed at app source rather than the library.
  createComponentChoiceRules({
    files: ["packages/web/**/*.tsx"],
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
| `charcuterie/*` (component choice) | **new here, and opt-in** — see below |

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

## Component choice — opt-in

Six repos measured on 2026-08-10 keep reaching past the library for the same handful of
raw elements. Documentation has been in place the whole time and moved none of these
numbers, which is the entire argument for a lint rule: a doc is read once, a rule is
enforced on every save.

| Rule | Fires on | Reach for instead | Measured in the fleet |
| --- | --- | --- | --- |
| `charcuterie/no-raw-anchor` | `<a>` | `TextLink`, or `ButtonLink` when navigation should look like a button | 14 in mux-magic, 10 in gallery-downloader, 31 in bambuddy |
| `charcuterie/no-raw-button` | `<button>` | `Button`, or `IconButton` when the control is icon-only | every icon row in the fleet |
| `charcuterie/no-raw-select` | `<select>` | `Listbox` (short, rich) or `Combobox` (long, searchable) | **134 in bambuddy**, 19 in spoolbuddy, 2 in points-market |
| `charcuterie/prefer-listbox-over-select` | `<Select>` | `Listbox` or `Combobox` — `Select` needs a stated reason | [the 2026-08-10 demotion](../../docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md) |
| `charcuterie/no-clickable-non-interactive` | `onClick` on `<div>`/`<span>`/`<li>`/… with no `role` or `tabIndex` | `Button`/`IconButton` to act, `TextLink`/`ButtonLink` to navigate | `points-market/…/AppShell.tsx:26-28` — a header title no keyboard can reach |
| `charcuterie/no-navigation-in-click-handler` | `navigate()`, `router.push()`, `location.href =` inside an `onClick` | `TextLink`/`ButtonLink` with an `href` | all of plex-channels, and mail-sifter's whole shell |
| `charcuterie/require-suppression-reason` | a disable of any rule above with no `-- reason` | say why in one line | — |

Both link components render a **real `<a href>`**, which is the point: middle-click,
ctrl-click, open-in-new-tab, copy-link and the browser's status-bar preview all work, and
none of them work on a click handler. Links go somewhere; buttons act on this page.

`IconButton` gets its own rule for the same kind of reason — an icon-only `Button` has
nothing but a glyph for its accessible name, so `IconButton` takes a required `label`.

### Wiring it

```js
createComponentChoiceRules({
  // The app's own source. `packages/ui/**` is deliberately not
  // in here.
  files: ["packages/web/**/*.tsx"],
})
```

**It is opt-in on purpose.** Five apps would go red the day they adopted it, and a config
that turns a whole repo red is a config that gets reverted rather than migrated — so it is
its own block, added when an app is ready to fix what it finds.

`files` is also the whole mechanism keeping the rules off `@charcuterie/ui`, which renders
raw `<a>`, `<button>` and `<select>` because rendering them correctly *is* the library.
Point `files` at app source and the library never matches;
`__fixtures__/uiPackage/rawElements.tsx` asserts it, because a scoping mechanism nobody
tests is a scoping mechanism that silently stops scoping.

This block is **seven real plugin rules**, not `no-restricted-syntax` entries like the
logical-properties one — the plugin object is inline in this package, so there is still
nothing extra to install, version or publish. Two things only distinct rule ids can do:

1. **An escape hatch turns off exactly what it names.** A `no-restricted-syntax`
   suppression is all-or-nothing, so silencing a raw `<a>` on one line would also silence
   the logical-properties selectors on it.
2. **Flat config replaces rule options rather than merging them.** Two blocks that both set
   `no-restricted-syntax` over overlapping globs leave only the later one's selectors
   running, silently.

### The escape hatch

Every rule has one, and it has to carry a reason:

```tsx
// eslint-disable-next-line charcuterie/no-raw-select -- posted by the browser with no JS on the page at all
<select name="theme">…</select>
```

`charcuterie/require-suppression-reason` reports a disable of any of these rules that has no
`-- reason` after it, including a blanket `// eslint-disable-next-line` (which silences them
too). Other people's disable comments are left alone. Without the reason the rule stops
firing, nobody learns why the native element was the right call, and the next agent copies
the pattern — which is the failure this whole block exists to fix.

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
