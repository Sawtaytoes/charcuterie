# The `v2` root becomes a Yarn 4 workspace; v1's source parks in `packages/logic`

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Repository structure
**Supersedes:** —
**Superseded by:** —

## Decision

On the `v2` branch, the repository root is a **private Yarn 4 workspace root**
(`workspaces: ["packages/*"]`, `nodeLinker: node-modules`) carrying only shared config:
`package.json`, `.yarnrc.yml`, `tsconfig.base.json`, `biome.json`, `eslint.config.js`,
`vitest.config.ts`.

v1's tooling is **deleted** from `v2`: Yarn 3 PnP (`.pnp.cjs`, `.pnp.loader.mjs`,
`.yarn/sdks`, the 3.5.0 release), rollup, jest, babel, `.eslintrc.js`, `.browserslistrc`,
Storybook 7, and the MUI/Emotion dependency set.

v1's **source is kept**, moved intact to `packages/logic/src` (with its `NOTES.md`).
It has **no `package.json`**, so Yarn does not treat it as a workspace, and it is
excluded from Biome, ESLint, Vitest, and typecheck. M2 removes those exclusions file by
file as it ports.

`master` is untouched and still holds working v1.

## Context

M1 stands up the Yarn 4 workspace root, Vitest, Biome, and ESLint. Every one of those
conflicts with what was at the root: two package managers, two module resolvers, two
test runners, two lint configs. The `v2` branch to that point held only
`packages/tokens` bolted onto an otherwise-untouched v1 tree.

The question was what happens to the 30 files of v1 state library — the Children-First
model from Kevin's conference talk, which the plan keeps as the application-facing API
and extends from three state kinds to five.

Three options were weighed: move it to `packages/logic/src`, delete it from `v2` and
recover it at M2 via `git show master:src/...`, or leave it at the root and add ignore
entries everywhere.

## Why

**Leaving it at the root was the worst of the three.** A top-level `src/` outside
`packages/*` needs an ignore entry in Biome, ESLint, Vitest, *and* tsconfig — four
places to get wrong, for a directory that is going to move anyway.

**Deleting it makes the prior art easy to forget.** The plan is explicit that the v1
model is *kept and extended*, not replaced. Requiring a `git show` to see the thing M2
is meant to port adds a round-trip at exactly the moment somebody is deciding how the
five state kinds should fit together.

**Moving it puts it where it is going, without pretending it has arrived.** The absence
of `packages/logic/package.json` is the load-bearing detail: Yarn ignores the folder, so
nothing can accidentally build, publish, or depend on unported v1 code. It is source in
its destination, visibly not yet a package.

**Keeping the tooling would have been worse than any of them.** Two `yarn.lock`s and a
stale `.pnp.cjs` do not coexist with a `node-modules` install; they produce resolution
failures that look like bugs in the new setup.

## Evidence

Chosen by Kevin from three stated options during M1 execution
(chat `charcuterie-m1`, 2026-07-29): *"Move to `packages/logic/src`, drop v1 tooling."*

The exclusions are written in one place each and all name the same reason, so M2 can
find them by grepping for `packages/logic`:

- `biome.json` → `files.includes`
- `eslint.config.js` → `ignores`
- `vitest.config.ts` → `test.exclude`

Toolchain versions match `mux-magic`, the reference app: Yarn 4.14.1, TypeScript 6.0.3,
Vitest 4, Biome 2, ESLint 10.
