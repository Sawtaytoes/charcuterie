# `@charcuterie/eslint-config`

Biome does the formatting and most of the linting. This package holds only what
Biome **cannot** express: rules needing TypeScript type information, and one custom
AST query.

Extracted from `mux-magic/eslint.config.js`, the reference app for every convention
in this repo, so apps consume one import instead of six copy-pasted config files.

## Installing

```sh
yarn add --dev @charcuterie/eslint-config eslint
```

Two packages, and `eslint` is one of them only because the CLI belongs to the
consumer. `typescript-eslint`, `eslint-plugin-react` and `@vitest/eslint-plugin` are
this package's own dependencies — a shared config whose adoption instructions start
"first install these four plugins" has not shared very much.

**If your config composes `tseslint.configs.*` too, import it from here:**

```js
import {
  createAppConfig,
  tseslint,
} from "@charcuterie/eslint-config"
```

Not from your own `typescript-eslint`. Flat config throws
`Cannot redefine plugin "@typescript-eslint"` when two blocks register that namespace
with two different objects, and a second copy of `typescript-eslint` in the tree is
exactly that. `board-game-picker` adopted the preset with 8.66.0 pinned in its lockfile
while this package resolved 8.67.0 beside it and `eslint .` failed outright; `docket`,
with the same declared range, deduped and worked. Which one a repo gets is a property of
its lockfile, not of its config — so the instance is re-exported and there is one import
specifier for it.

## Usage

```js
// eslint.config.js — the whole file, in an app repo
import { createAppConfig } from "@charcuterie/eslint-config"
import { defineConfig } from "eslint/config"

export default defineConfig(
  ...createAppConfig({
    tsconfigRootDir: import.meta.dirname,
  }),
)
```

`createAppConfig` is the default answer for an app. It composes the factories below
in the right order, scoped off `@charcuterie/ui`, with the house ignore list already
in place. Name where your source lives if it is not `src`:

```js
createAppConfig({
  tsconfigRootDir: import.meta.dirname,
  appDirectories: ["packages/web"],
  // Repo-specific paths are *added* to `APP_IGNORES`, not
  // swapped for it.
  ignores: ["e2e/**"],
})
```

| Option | Default | What it does |
| --- | --- | --- |
| `tsconfigRootDir` | **required** | Where the app's `tsconfig.json` lives. `projectService` has no honest default for somebody else's repo. |
| `appDirectories` | `["src"]` | The app's own source. This is the scoping that keeps the component rules off the library. |
| `ignores` | `[]` | Appended to `APP_IGNORES`. |
| `componentChoice` | `"pickers"` | `"all"` for all seven rules once the app has swept its raw anchors and buttons; `"off"` mid-migration. |
| `flexOverflow` | `"off"` | `"warn"` or `"error"` to turn the flex family on. |
| `reactVersion` | `"19.0.0"` | |
| `storyFiles` | `MULTI_COMPONENT_FILE_GLOBS` | Files that may declare more than one component. |

`react/no-multi-comp` is off for stories, `__fixtures__`, **`*.test.tsx`, and icon
modules** (`icons.tsx`, `*Icons.tsx`). The last two turned up the moment real apps ran the
preset and are the same argument the story exemption already makes — the file's job is to
hold a set. A component test that needs a wrapper declares the harness beside the
assertion, and Charcuterie ships no icons on purpose, so every app has one file of glyphs:
19 in `mail-sifter/components/icons.tsx`. Nineteen one-line files would be strictly worse,
and nobody would write them — the rule would just get switched off.

**Why the preset exists at all**, given that every factory below already takes
`files`: because eight app repos each composed them by hand, and by 2026-08-21 six
had drifted. Four hand-registered the plugin object and the two picker rules by
name — four copies of the same paragraph explaining why they were not calling
`createComponentChoiceRules` next to it — and two never wired the block at all, so
the fleet's one machine-enforced picker rule was enforced in half the fleet. A rule
the library ships but every consumer has to re-derive is a rule the fleet does not
have.

`componentChoice: "pickers"` is the default because it is the one component-choice
family with a standing decision behind it and no remaining backlog: `Select` is
deprecated, `Picker` is the drop-in, and every owned app was swept onto `Listbox` on
2026-08-21. The other five rules each name a sweep an app has not done —
`no-raw-button` alone fires on every icon row in the fleet — and a config that turns
a whole repo red is a config that gets reverted rather than migrated.

`flexOverflow` defaults to `"off"` for the same reason, one step further along:
`no-shrink-0-with-flex-wrap` is an `error`, so bundling it would make "adopt the
preset" and "sweep the flex bugs" the same change.

### Composing by hand

An app with a layout the preset cannot describe still calls the factories directly —
the preset is built out of these, so there is no second implementation to keep in
step. `mux-magic` does this, because it layers its own `no-restricted-syntax`
selectors onto the logical-properties ones.

```js
// eslint.config.js
import {
  createComponentChoiceRules,
  createFlexOverflowRules,
  createLogicalPropertiesRules,
  createPickerRules,
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
  // The settled subset — `no-raw-select`,
  // `prefer-listbox-over-select`, and the suppression guard.
  createPickerRules({
    files: ["packages/web/**/*.tsx"],
  }),
  // All seven. Opt-in, and pointed at app source rather than the
  // library.
  createComponentChoiceRules({
    files: ["packages/web/**/*.tsx"],
  }),
  // Also opt-in. Warns by default; `severity: "error"` once the
  // app has been swept.
  createFlexOverflowRules({
    files: ["packages/web/**/*.tsx"],
  }),
  createStoryOverrides({}),
  createTestRules({}),
)
```

Every export is a **factory taking `files`** rather than a fixed config array. A
shared config that hard-codes `packages/web/**` is a mux-magic config wearing a
shared name; the consumer knows its own layout and this package does not.
`createAppConfig` does not break that — it derives the globs from `appDirectories`
rather than assuming them.

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
| `charcuterie/*` (component choice) | **opt-in**, except the picker subset — see below |
| `charcuterie/*` (flex overflow) | **new here, and opt-in** — see below |

All the `charcuterie/*` rules live in **one plugin object under one namespace**, composed
in `src/plugin.js`. Flat config throws `Cannot redefine plugin` when two blocks register
a namespace with two different objects, and the two blocks below are meant to be enabled
independently — so both factories hand ESLint the same reference. A second namespace
(`charcuterie-layout`) was the alternative and was rejected: you would have to remember
which prefix each rule takes when writing a disable comment, and a wrong prefix in an
`eslint-disable` is silently a no-op.

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
| `charcuterie/prefer-listbox-over-select` | `<Select>` | `Picker` (the drop-in), `Listbox`, or `Combobox` — `Select` is **deprecated**, with no per-call-site exception left | [the 2026-08-20 deprecation](../../docs/decisions/2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md) |
| `charcuterie/no-clickable-non-interactive` | `onClick` on `<div>`/`<span>`/`<li>`/… with no `role` or `tabIndex` | `Button`/`IconButton` to act, `TextLink`/`ButtonLink` to navigate | `points-market/…/AppShell.tsx:26-28` — a header title no keyboard can reach |
| `charcuterie/no-navigation-in-click-handler` | `navigate()`, `router.push()`, `location.href =` inside an `onClick` | `TextLink`/`ButtonLink` with an `href` | all of plex-channels, and mail-sifter's whole shell |
| `charcuterie/require-suppression-reason` | a disable of any rule above with no `-- reason` | say why in one line | — |

`prefer-listbox-over-select` is the one rule whose escape hatch is **not** a call-site
judgement: `Select` is deprecated, so a disable cites a decision record rather than a
reason of its own. Everything already on a native `Select` is a conversion backlog —
`Picker` takes the same `label` / `options` / `value` / `onChange`.

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

Or just the picker subset — `no-raw-select`, `prefer-listbox-over-select`, and the
suppression guard — which is what `createAppConfig` turns on by default and what
four repos were hand-registering before it existed:

```js
createPickerRules({ files: ["packages/web/**/*.tsx"] })
```

The subset is not a compromise; it is the line between a settled decision and a
backlog. `Select` is deprecated with no per-call-site exception left and `Picker` is
a drop-in, so nothing in that pair is a judgement call. The other five each name a
sweep — `no-raw-button` fires on every icon row in the fleet — which is why they stay
behind an explicit `componentChoice: "all"`.

A repo that lints with Biome and not ESLint gets the same two mistakes caught by
[`@charcuterie/biome-config/app`](../biome-config/README.md), which expresses them
as `noRestrictedElements` and `noRestrictedImports`.

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

## Flex overflow — opt-in

**Four independent rediscoveries of one CSS rule in one day** (2026-08-11), during the
fleet-wide bump onto `@charcuterie/ui@2.11.0`. The 17px type ramp consumed the slack that
had been hiding a latent layout bug in five of eleven repos, and four were the same
shape: a flex row containing one long unbreakable token.

A flex item's automatic minimum size resolves against its content's **min-content
width**, so a token with no break opportunity becomes the row's floor and shoves its
sibling out of the container. `min-width: 0` lets the *item* shrink but does nothing to
the *text*, which then spills; only `overflow-wrap: anywhere` shrinks the min-content
size itself.

| Rule | Fires on | Default | Where it came from |
| --- | --- | --- | --- |
| `charcuterie/no-unconstrained-flex-text` | a text element (`span`, `h1`–`h6`, `p`, `label`, …) rendering `{dynamic}` text as a direct child of a flex **row**, with no escape in its `className` | **`warn`** | gallery-downloader `ErrorRow`, points-market `ShopPage` (heading + recent-buys chip) |
| `charcuterie/no-shrink-0-with-flex-wrap` | `shrink-0` and `flex-wrap` on the same element, inside a flex row | **`error`** | rip-deck `RipCard` — and it found the identical bug uncaught in `HeldBayCard` and `QuarantinedBayCard` |

**Any escape counts, because the four shipped fixes were four different fixes.**
`min-w-0 wrap-anywhere` (gallery-downloader, points-market's heading), `flex-wrap` +
`shrink-0` (points-market's price row), `truncate` + `title` (mail-sifter's host), and
*removing* `shrink-0` (rip-deck). A rule demanding one of them would be wrong about the
other three. Accepted: `min-w-*`, `truncate`, `text-ellipsis`, `line-clamp-*`,
`overflow-hidden`, `wrap-anywhere`, `break-all`, `break-anywhere`, `w-*`, `max-w-*`,
`basis-*`, `size-*`, `shrink-0`, `flex-none`, `absolute`, `fixed`.

### Two severities, on purpose

`no-unconstrained-flex-text` is a **heuristic**. It can see that a row's text child says
nothing about how it shrinks; it cannot know whether `{status}` is `"OK"` or a
300-character URL. Measured across the fleet it fires on 6/49 files in
gallery-downloader, 5/11 in points-market, 8/12 in mail-sifter, 6/36 in rip-deck and
33/341 in mux-magic — low volume, but a judgement call every time, so it **warns**. A
rule that turns a repo red over a judgement call is a rule that gets deleted rather than
satisfied. Promote it once the app is swept:

```js
createFlexOverflowRules({
  files: ["packages/web/**/*.tsx"],
  severity: "error",
})
```

`no-shrink-0-with-flex-wrap` is not a heuristic — `shrink-0` pins the item at
max-content, so the `flex-wrap` beside it can never engage — so it **errors**.

### What it deliberately does not do

- **`<div>` is not a text element.** It is the generic box and the most common child of a
  flex row by a wide margin; including it turns the rule into a noise generator.
- **Static text is skipped.** `Cancel` is never 300 characters. The bug arrives with
  data, so only `{…}` children count — and not `{children}` or `{rows.map(…)}`, which
  render somebody else's markup rather than a text run.
- **`tabular-nums` is skipped.** It is the fleet's marker for a bounded digit run.
  Without the exclusion the rule warns on rip-deck's three-character `{percentText}` even
  *after* the shipped fix.
- **A column container is out of scope**, and so is any container carrying a `flex-col`
  variant: the shape is conditional and a conditional shape is not a confident finding.
- **A `className` it cannot read statically** (a `clsx(…)` call, a variable) is skipped —
  the escape may well be in there, and reporting on what it cannot read is the fastest
  way to get switched off.
- **`shrink-0` + `flex-wrap` needs a flex-row parent.** Inside a `flex-col`, `shrink-0`
  resists shrinking down the *block* axis and has no bearing on the element's own wrap.
  mux-magic's `FileExplorerModal` title bar is exactly that, and would have been the
  rule's first false positive on the first real file it saw.

**The one case it does not catch, stated plainly:** mail-sifter's `LinkCard` host. Its
overflowing element is a block inside a grid column, not a flex item — the flex row above
it was already correctly constrained — so no flex rule can see it. That one stays a
`truncate` learned by reading.

Escape hatch, same as everywhere else, and it owes a reason:

```tsx
{/* eslint-disable-next-line charcuterie/no-unconstrained-flex-text -- a closed enum, never longer than "running" */}
<span className="text-xs uppercase">{status}</span>
```

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

`__fixtures__/appPackage/unconstrainedFlexText.tsx` and its `constrained…` twin are the
four rows the fleet actually fixed on 2026-08-11, copied from the shipping commits
(gallery-downloader `81e2c2a`, points-market `e6438b7`, mail-sifter `8ed11f4`, rip-deck
`ce66aab`) — before and after. A lint rule whose motivating bug is not in its fixtures is
a rule nobody can show catches anything.
