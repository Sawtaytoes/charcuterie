# `colour` in TypeScript identifiers, `--color-*` in CSS custom properties

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Naming
**Supersedes:** —
**Superseded by:** —

## Decision

TypeScript identifiers in `@charcuterie/tokens` spell it **`colour`** (`SchemeColours`,
`epaperColours`, `buildColourProperties`). Generated CSS custom properties spell it
**`--color-*`** (`--color-surface-base`, `--color-intent-danger-content`).

This inconsistency is deliberate and load-bearing. **Do not "fix" it.** Anyone who
normalises the CSS side to `--colour-*` will produce a stylesheet that silently generates
no Tailwind utilities at all.

## Context

The house rule is to match the user's existing nomenclature. The existing nomenclature for
this concept is British: `castkit/packages/views/src/viewStyles.ts` has `e6Colour`,
`colourMode`, and `getAccentColour`.

Tailwind v4 replaced `tailwind.config.js` with the `@theme` at-rule, which derives
utilities from a fixed set of namespaces. `--color-*` is the namespace that generates
`bg-*`, `text-*`, `border-*`, `fill-*`, and `stroke-*`. The namespace is part of Tailwind's
API, not a convention — a custom property under any other name is just a variable, and
produces no utilities.

Every React app in the fleet is on Tailwind v4 after the consumer-modernization track, so
this is not a corner case; it is the primary consumption path.

## Why

Both halves are constraints rather than preferences, and they point opposite ways:

- The TS side is ours to name, and the house rule says match the siblings — so `colour`.
- The CSS side is Tailwind's to name, and it is not negotiable — so `color`.

The alternative — spelling it `color` in TS to match the CSS — would make the token
package the only place in the fleet using the American spelling, and would put it at odds
with `viewStyles.ts`, which is one of the packages that consumes it.

The boundary is exactly one function (`buildColourProperties` in `src/buildCss.ts`), so
the cost of the split is one file knowing about both spellings.

## Evidence

The plan settled this before implementation:

> **Naming split, deliberate:** `colour` in TS identifiers (matches `e6Colour`/`colourMode`/
> `getAccentColour` in `castkit/packages/views/src/viewStyles.ts`, per
> match-existing-nomenclature) but `--color-*` in CSS, because **Tailwind v4's `@theme`
> requires the `--color-*` namespace** to generate `bg-*`/`text-*`. Locked in the token
> README so nobody "fixes" it later.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo.

Locked in `packages/tokens/README.md` and in the header comment of `src/buildCss.ts`.
