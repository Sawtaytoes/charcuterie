# `@charcuterie/tokens` is a separate zero-dependency package

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Architecture
**Supersedes:** —
**Superseded by:** —

## Decision

Tokens ship as their own published package — **zero dependencies, no React** — rather
than as a subpath of `@charcuterie/ui`.

React consumers never see two names: `@charcuterie/ui` re-exports them at
`@charcuterie/ui/tokens`. **It is a build-graph split, not an API split.**

## Context

The obvious arrangement is one `@charcuterie/ui` package with tokens inside it. Two
consumers in the fleet make that unworkable, and both were known before any code was
written.

## Why

**`castkit/packages/views` renders to PNG through Satori.** It needs colour and spacing
values with no React tree anywhere near them. If tokens live inside `ui`, reading one hex
value drags in a component library and its React peer dependency.

**`slatecast` has a 60 KB gz budget.** A package that cannot be depended on without
pulling a UI runtime cannot be depended on at all at that size.

**Different peer dependencies is the honest signal.** `ui` needs a stylesheet and a
React runtime. `tokens` needs neither, and the ePaper profile needs neither *by
construction* — it exports resolved literals precisely because Satori cannot evaluate
`var()`. Two packages with genuinely different peer requirements are two packages.

**Tree-shaking is not the argument.** It would not be a good enough one. Deep imports
via the `./src/*` export cover the budget-sensitive cases within a single package
already; what does not work within a single package is a *different dependency graph*.

**The cost is bounded and paid once.** Lockstep versioning keeps `tokens` and `ui` in
step, and the publish job runs serially in dependency order — `ui@1.4.0` depends on
`tokens@1.4.0`, which must hit the registry first.

## Evidence

The plan stated it up front:

> **Why `tokens` is split from `ui`:** `castkit/packages/views` needs colour/space values for
> Satori without pulling a React tree; `slatecast` has a 60 KB gz budget. React consumers never
> see two names — they import `@charcuterie/ui/tokens`. Build-graph split, not an API split.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo.

Held true through M1: `packages/tokens/package.json` has zero `dependencies`, and its
five source modules import nothing outside the package. `node scripts/buildTokens.ts`
runs on a clean checkout with nothing installed, which is what let the M0 bake-off ship
before this workspace existed.
