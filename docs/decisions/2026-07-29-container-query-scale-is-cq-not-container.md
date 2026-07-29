# The container-query scale is `--cq-*`, not `--container-*`

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Naming
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/tokens` emits its five-step container-query scale as **`--cq-xs … --cq-xl`**.
The TypeScript export is **`containerQuery`**, not `container`.

Tailwind v4's `--container-*` namespace is left alone, so `max-w-md` keeps meaning what
Tailwind says it means in every consumer.

## Context

M1's token swap into mux-magic surfaced that `variables.css` declares custom properties in
namespaces Tailwind v4 already owns. Declaring one at `:root` silently re-themes
Tailwind's own utilities — no import, no `@theme` block, no error.

Four of those overrides are the point:

| Namespace | Utility it re-themes | Verdict |
| --- | --- | --- |
| `--radius-*` | `rounded-lg` | intended |
| `--tracking-*` | `tracking-tight` | intended |
| `--font-*` | `font-sans` | intended |
| `--font-weight-*` | `font-bold` | intended |
| `--container-*` | `max-w-md` | **hazard** |

A variant that cannot reach `rounded-lg` is not really a visual direction, so the first
four are the mechanism working. `--container-*` was not: ours is a five-step
container-query scale and Tailwind's is a thirteen-step `max-w-*` scale using **the same
step names at different sizes** — our `md` is 32rem against Tailwind's 28rem — so a
consumer writing `max-w-md` silently got `max-w-lg`.

M1 pinned the whole collision set in `packages/tokens/src/tailwindCollisions.test.ts` and
flagged this one rather than renaming, because renaming changes the published token API.
Kevin's call, 2026-07-29: rename ours.

## Why

**Nothing about a *visual direction* argues for changing what `max-w-md` means.** That is
the line between the four intended collisions and this one. Radius and letter-spacing
carry a variant's character; a max-width scale does not.

**It was free exactly once.** Nothing consumes the token package yet — the only integration
is `mux-magic@feat/charcuterie-tokens`, held unmerged by
[the `portal:` decision](2026-07-29-consumers-link-tokens-by-portal-until-publish.md), and
it uses no `--container-*` value. After publish this is a breaking change to a package with
consumers.

**Adopting Tailwind's values instead was the rejected alternative.** It would keep
`max-w-md` working, but it would set our container-query breakpoints to whatever Tailwind
chose for a different purpose, and it muddies the deliberate `screen.*` versus
`containerQuery.*` split that exists so nobody reaches for the wrong one.

**On the abbreviation.** `cq` is the only abbreviation in the token surface, against a
house style that otherwise spells names out (`--line-height-*`, not `--lh-*`). It earns
the exception by matching the CSS feature it exists for: `@container` queries are written
in `cqw`/`cqi`/`cqmin` units, so `--cq-md` reads as that scale to anyone writing one. The
TypeScript side has no collision and no unit convention, so it spells `containerQuery` out
in full — `container` alone no longer says which of the two scales it is.

## Evidence

`docs/2026-07-29-m1-mux-magic-token-swap.md`, Result 3, measured the collision mechanism in
a real app: the mux-magic dark UI came out 99.91% pixel-identical after the swap, and every
one of the 1,144 changed pixels was the `Sequence Builder` heading, which carries
`tracking-tight` and moved because `daylight` sets `-0.01em` where Tailwind's default is
`-0.025em`.

`tailwindCollisions.test.ts` now asserts the emitted CSS contains `--cq-md` and **no**
`--container-` at all, and still pins the remaining four collisions so a new one has to be
a decision rather than a side effect. It also records three near misses that look like
collisions and are not: Tailwind uses `--spacing` where we use `--space-*`, `--text-*`
where we use `--font-size-*`, and `--leading-*` where we use `--line-height-*`.
