# The house lint config is a preset an app adopts, not blocks it composes

**Status:** Accepted
**Date:** 2026-08-21
**Type:** Architecture · Tooling
**Supersedes:** —
**Superseded by:** —

## Decision

**`@charcuterie/eslint-config` ships `createAppConfig()`, and `@charcuterie/biome-config`
ships `/app`. An ordinary app repo's lint setup is one import and one `extends`.**

```js
// eslint.config.js — the whole file
import { createAppConfig } from "@charcuterie/eslint-config"
import { defineConfig } from "eslint/config"

export default defineConfig(
  ...createAppConfig({ tsconfigRootDir: import.meta.dirname }),
)
```

```jsonc
// biome.json — an app extends /app, the library extends the base
{ "extends": ["@charcuterie/biome-config/app"] }
```

Four things follow, and each one is a mistake the fleet already made:

- **`componentChoice: "pickers"` is the default.** `createPickerRules()` names the settled
  subset — `no-raw-select`, `prefer-listbox-over-select`, `require-suppression-reason` —
  and the preset turns it on without being asked. The other five component-choice rules
  stay behind `componentChoice: "all"`.
- **`flexOverflow` defaults to `"off"`.** `no-shrink-0-with-flex-wrap` is an `error`, so
  bundling it would make "adopt the preset" and "sweep the flex bugs" one change.
- **`appDirectories`, not `files` globs.** The consumer says `["src"]` or
  `["packages/web"]`; the preset derives which blocks want `.tsx` and which want
  `.{ts,tsx}`. That derivation is where four of the hand-written configs differed.
- **`typescript-eslint` moves from a peer dependency to a real one.** Adoption is
  `yarn add --dev @charcuterie/eslint-config eslint`, and `eslint` is in that list only
  because the CLI belongs to the consumer.

The per-`files` factories are **not** deprecated and the preset is built out of them, so
there is no second implementation. `mux-magic` keeps composing by hand, because it layers
its own `no-restricted-syntax` selectors onto the logical-properties ones and flat config
replaces rule options rather than merging them.

## Context

`@charcuterie/eslint-config` was built on a principle that is still right: every export is
a factory taking `files`, because a shared config that hard-codes `packages/web/**` is a
mux-magic config wearing a shared name.

What it did not account for is that **eight repos then wrote the same config eight times.**
On 2026-08-21, after the fleet-wide `Listbox` migration, the state was:

| Repo | Picker rule enforced? | How |
| --- | --- | --- |
| mux-magic | yes | hand-registered plugin + two rule ids, 12-line comment |
| portly-controllers | yes | hand-registered plugin + two rule ids, 10-line comment |
| gallery-downloader | yes | hand-registered plugin + two rule ids |
| image-viewer | yes | hand-registered plugin + two rule ids |
| board-game-picker | **no** | config never wired |
| docket | **no** | config never wired |
| mail-sifter | **no** | no ESLint in the repo at all |
| queuepilot | **no** | lints with Biome; the rules are ESLint-only |

Four of the eight duplicated the same block because `createComponentChoiceRules` turns on
seven rules and five of them are a real sweep the app has not done — so each repo
independently reached past the factory, registered the plugin object by hand, named two
rule ids, and wrote a paragraph explaining why it was not calling the factory sitting next
to it. Two never got there. Two could not: one had no ESLint, one had no ESLint *and* no
intention of adopting a second linter for two rules.

That is the same failure the 2026-08-20 deprecation record diagnosed one level up — a
decision that cannot reach an app repo does not bind it — arriving one level down. The
library shipped the rule; half the fleet did not have it.

## Why

**A subset had to be nameable.** The four hand-rolled copies were not working around a
missing rule; they were working around all-or-nothing severity. `createPickerRules` is
that subset with a name, and the line it draws is real: `Select` is deprecated with no
per-call-site exception left and `Picker` is a drop-in, so nothing in the pair is a
judgement call. `no-raw-button` fires on every icon row in the fleet, and that is a
judgement call plus a sweep. One belongs in a default; the other does not.

**"A config that turns a whole repo red is a config that gets reverted rather than
migrated"** is the existing rule and the preset does not break it. It is why the default
is two rules and not seven, and why the flex family — whose `error` half found real bugs
in three repos — is still an explicit opt-in. The preset's job is to make the settled
things automatic, not to make every open backlog blocking.

**Biome needed a native path, not an ESLint bridge.** `correctness/noRestrictedElements`
matches JSX components as well as HTML elements, so `<select>` and `<Select>` are both
catchable, and `style/noRestrictedImports` catches the import. queuepilot's alternative
was adopting ESLint, `typescript-eslint`, a parser and a plugin set for two rules — which
is not a thing anybody does, which is why it had gone undone. A repo running both linters
now gets the message twice; that is noise, not a defect.

**The base Biome config stays style-only.** `@charcuterie/ui` extends it, and the library
renders a raw `<select>` because rendering one correctly *is* the library. Putting the ban
in the base would have made the library the first thing the rule broke — the same reason
`createComponentChoiceRules` has no useful `files` default.

**`typescript-eslint` as a peer was a paper cut with real consequences.** mail-sifter had
no linter, and the honest cost of adding one was four packages and a config file; that is
enough friction to lose to anything more urgent, and it did, for as long as the repo has
existed.

## Evidence

Owner, on being shown the wrap-up of the fleet-wide `Listbox` migration and its list of
repos still needing lint enforcement wired by hand:

> "I swear we made it so Charcuterie has all the build tooling and rules for it, so you
> wouldn't need to hand set that up in each repo. Let's fix that."

He was right that the tooling exists — `tsconfig`, `vite-config`, `vitest-config`,
`playwright-config`, `storybook-config`, `biome-config`, `eslint-config` and `server` are
all published — and right that adopting it was still hand work. The gap was between
"shipped as a package" and "adoptable in one line", and it was invisible from inside the
library, where the config is composed once and looks fine.

`packages/eslint-config/src/houseRules.test.ts` asserts the preset the way a consumer
wires it: the picker rules fire on the app fixture, the other five do not, and neither
reaches `__fixtures__/uiPackage/rawElements.tsx`. The last of those is the one that
matters — a preset that looks adopted and silently scopes to nothing is indistinguishable
from a clean repo.
