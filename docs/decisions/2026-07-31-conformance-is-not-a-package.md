# `packages/conformance` is not a package; its assertions live where the code does

**Status:** Accepted
**Date:** 2026-07-31
**Type:** Architecture / Scope
**Supersedes:** —
**Superseded by:** —
**Related:** [ePaper removes animation outright](2026-07-29-epaper-removes-animation-not-just-shortens-it.md) ·
[ePaper is a profile, not a scheme](2026-07-29-epaper-is-a-profile-not-a-scheme.md) ·
[1.0.0 is cut at the end of M6](2026-07-31-one-point-oh-cuts-at-the-end-of-m6.md)

## Decision

**`@charcuterie/conformance` is dropped. It will not be built, and the workspace keeps
five packages plus `@charcuterie/docs`.**

Nothing it was specified to assert is dropped with it. Each of the four assertions is
accounted for, by name, in a gate that already runs:

| The plan's assertion | Where it lives now |
| --- | --- |
| the **React 19 + Tailwind v4** profile builds | `@charcuterie/docs` **is** that profile — `yarn build:storybook` plus `yarn smoke:storybook` over every entry, and `tailwindCandidates.test.ts` compiles every class name through the real Tailwind v4 design system |
| the **Preact** profile builds | `packages/logic`'s five-adapter suite, one of which is Preact in chromium — plus the new entry-point gate below, which is what stops `logic/preact` reaching `react` |
| the **Satori** profile builds and fails on unsupported CSS | **nothing to render** — see below. The ePaper *token* profile is gated by `epaper.test.ts` (renderable-hex set, no elevation, no hover delta, no motion at all) |
| **slatecast stays under 60 KB gz** | castkit's, on a bundle this repo cannot build. Measured at **19.74 KB of 60** in M5b |

One thing none of them covered, so it was added rather than assumed:
`packages/ui/src/sourceRules.test.ts` now pins **what every published entry point is
allowed to reach at runtime**, beside the dependency-direction test the plan also asked
for. `tokens` reaches nothing, `logic/core` reaches nothing, `logic/preact` never reaches
`react`, `ui/testing` reaches nothing — and every specifier that *is* reached must be a
declared dependency or peer dependency, so a phantom import cannot ride along.

## Context

The package was specified twice in the plan and once in a decision record, and the three
specifications do not describe the same thing:

> **Private (workspace-only):** … `@charcuterie/conformance` (builds React19+TWv4 /
> Preact / Satori profiles, asserts slatecast stays under its 60 KB gz budget)

> **ePaper-safe subset:** only `Text`, `Stack`, `ProgressBar`, `Badge`, `MediaTile`,
> `EmptyState` get Satori implementations, gated by a conformance test that **actually
> renders through Satori** and fails on unsupported CSS.

> **M5b** — the `packages/conformance` Satori profile should assert **no animation
> properties survive** into an ePaper render, not just that it builds.

It was listed as an M5b proof, was not built, and was carried into M6 as the one item
standing between the milestone and the 1.0.0 cut.

**The Satori half has no subject.** `Text` and `Stack` do not exist — they were never
built, in M3 or since. `ProgressBar`, `Badge`, `MediaTile` and `EmptyState` exist as React
+ Tailwind components only. M5b then settled the question the other way round: the
component layer does not reach a non-React consumer, and `castkit/packages/views` consumes
`@charcuterie/tokens/epaper` — resolved literals — and renders its own Satori JSX. So a
Satori conformance harness would render nothing, and building the six Satori
implementations first is a milestone, not a prerequisite tidied up before a version bump.

**"No animation survives an ePaper render" has no CSS to inspect, by design.** The ePaper
profile emits **zero** CSS: it is a TypeScript export of resolved literals, precisely
because Satori cannot evaluate `var()`. `epaperMotion` is six `0ms` durations and four
`linear` easings, and `epaper.test.ts` asserts exactly that. The CSS half of the same rule
— `animation: none`, not a zeroed duration — is gated under `prefers-reduced-motion` in
both `buildCss.test.ts` and `tailwindCandidates.test.ts`, which is the delivery path that
actually exists.

**The 60 KB budget is another repo's.** charcuterie cannot build `@castkit/slatecast`, and
a budget asserted against a stale vendored copy is worse than no budget.

## Why

**A conformance suite that nothing runs is worse than no conformance suite**, and the
version this repo could have shipped today is worse still: a package whose three profiles
are a rename of `@charcuterie/docs`, a subset of `packages/logic`'s existing suite, and an
empty harness. That is a second place to update every time an entry point moves, with a
failure mode of quietly rotting while reading as coverage.

**The gates already have a home, and it is the package that owns the code.** The plan's
other cross-package requirement — dependency direction is `tokens ← logic ← ui`,
"CI-enforced" — landed as a test in `packages/ui/src/sourceRules.test.ts` rather than as
infrastructure, and has been green and load-bearing since. That is the precedent, and it
is a better one: `@charcuterie/ui` sits at the top of the dependency graph, so it is the
one package whose tests can see all three at once.

**1.0.0 is a stability claim about an API, not about a build matrix.** The claim that
matters to the two consumers this package was invented for is *which runtime an import
forces you to install* — a Satori renderer must read a colour without a React tree, and a
kiosk under a 60 KB budget must not have `react` arrive through a Preact entry point.
Both were promises made in docstrings with nothing checking them. Now one test does, and
it fails on the exact regression: adding `import { useCallback } from "react"` to
`logic/preact/useVisibility.ts` turns it red.

**This is a scope cut, and it is recorded as one rather than quietly dropped.** The
alternative — building the package as written — was rejected on evidence, not on effort.
If the ePaper-safe component subset is ever built, the Satori render gate it needs belongs
beside those components, in `packages/ui`, for the same reason everything else here does.

## Evidence

- The specification: `agentic/docs/research/2026-07-29-charcuterie-component-library-plan.md`,
  the package-layout table, the "ePaper-safe subset" paragraph, and M5b's proof list.
- The deferral: [M5b handoff](../2026-07-31-m5b-castkit-the-second-consumer.md) — *"Not
  done, and the package does not exist … Carried forward."*
- The carry: [M6a handoff](../2026-07-31-m6a-the-p1-components.md), *"Carried in from M5b,
  still open"*.
- `Text` and `Stack` are absent from `packages/ui/src`, and `sourceRules.test.ts` pins the
  component count at **25** with neither in it.
- `packages/tokens/src/buildCss.ts` emits no ePaper block; `@charcuterie/tokens/epaper` is
  a TypeScript entry point, and its docstring says why: *"Consumed by the Satori profile,
  which renders to PNG and cannot evaluate `var()` — so this exports resolved literals
  only."*
- castkit's manifests: `packages/views` depends on `@charcuterie/tokens` alone,
  `packages/slatecast` on `@charcuterie/tokens` and `@charcuterie/logic`. Neither takes
  `@charcuterie/ui`, which is M5b's wall stated as a dependency graph.
