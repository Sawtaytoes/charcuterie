# `theme.css` bridges our structural tokens onto Tailwind's own namespaces

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Tokens / Tailwind
**Supersedes:** —
**Superseded by:** —
**Related:** [The container-query scale is `--cq-*`](2026-07-29-container-query-scale-is-cq-not-container.md)

## Decision

`packages/tokens/src/buildCss.ts` publishes five bridges inside `@theme inline`, alongside
the colour roles it already published:

| Published | Reads | Effect |
| --- | --- | --- |
| `--text-{xs…2xl}` | `--font-size-*` | `text-sm` is **our** density-scaled ramp |
| `--leading-{tight,normal,relaxed}` | `--line-height-*` | `leading-normal` is ours |
| `--shadow-{low,medium,high}` | `--elevation-*` | `shadow-low` exists and is scheme-aware |
| `--ease-{standard,entrance,exit,emphasized}` | `--easing-*` | `ease-standard` exists |
| `--spacing` | `space[1]` | `p-3` is a token value, not a coincidence |

The set is pinned by `THEME_BRIDGES` and asserted in
`packages/tokens/src/tailwindCollisions.test.ts`: a namespace `theme.css` publishes that is
not declared fails, and a declared bridge that emits nothing fails.

`variables.css` keeps **our** names (`--font-size-md`, `--line-height-normal`, `--space-4`),
so a plain-CSS or Satori consumer never sees a Tailwind spelling.

**Not bridged:** `--duration-*` and `--control-*` have no Tailwind namespace at all, so
components reach them as arbitrary values — `duration-(--duration-fast)`,
`h-(--control-height-md)`.

## Context

M1 audited which of our custom-property names land in a namespace Tailwind v4 already owns,
and pinned four *implicit* collisions at `:root` — `--font-`, `--font-weight-`, `--radius-`,
`--tracking-` — as intended, because those carry a variant's visual character into
Tailwind's own utilities.

M3 needed the rest. Without a bridge, a component writing `text-sm` gets Tailwind's
0.875rem instead of the variant's ramp — and gets it **silently**, because the utility
exists either way. Worse, ours is density-aware: a component on Tailwind's `text-sm` does
not grow on the kiosk, while the prose beside it does.

## Why

**Each entry redefines an existing utility in every consumer, which is the point.** `text-sm`
has to mean our type ramp or it is not our type ramp. That is the same argument M1 accepted
for `rounded-lg` and `tracking-tight`; the only difference is that those collide implicitly
at `:root` while these are stated in one listable place.

**The alternative is an indirection in every className.** Components could write
`text-(length:--font-size-sm)` everywhere. That is noisier at every call site *and* still
leaves `text-sm` meaning Tailwind's default for anyone who forgets — the worst of both.

**`--spacing` is published to keep an agreement honest.** Tailwind's spacing is a single
multiplier and ours is a stepped 4px scale; they happen to agree today. Publishing
`space[1]` as the multiplier is what keeps `p-3` equal to `--space-3` on purpose rather than
by luck, and it is derived from the scale rather than written as `0.25rem`.

**`--shadow-none` is not bridged**, because Tailwind's own `shadow-none` already emits
`box-shadow: none` and ePaper collapses every elevation at the variable level.

## Consequences

- A consumer's `text-sm`/`leading-normal`/`p-*` change meaning the moment they import
  `@charcuterie/tokens/theme.css`. For the fleet that is desirable and was measured at M1:
  the mux-magic swap came out 99.91% pixel-identical, with every changed pixel in one
  heading that carries `tracking-tight`.
- `@charcuterie/ui`'s `tailwindCandidates.test.ts` has a mutation check for this: the same
  five candidates must **fail** to compile against bare Tailwind. If they resolve without
  our theme, the components are not reading our tokens.
- New structural namespaces are a decision, not a side effect — add to `THEME_BRIDGES` or
  the test fails.

## Evidence

The plan left this gap open, and M1 wrote it down as a known omission in the specimen it
shipped:

> Radius, spacing, and type come through `var()` rather than a utility, because `theme.css`
> currently maps only the colour namespace into `@theme`. Mapping `--radius-*`, `--space-*`,
> and `--font-size-*` onto Tailwind's `--radius-*` / `--spacing` / `--text-*` namespaces is
> a real open item; writing it as `var()` here keeps the gap visible instead of letting it
> fall back to Tailwind's defaults unnoticed.

— `packages/docs/src/TokenSpecimen.tsx`, M1.

`--radius-*` needed no bridge in the end: it collides at `:root` already, which M1's
collision audit had established as intended.
