# The `cq-*` container-query variants are generated from the scale, because a query condition cannot be a variable

**Status:** Accepted
**Date:** 2026-07-29
**Type:** Tokens / CSS
**Supersedes:** —
**Superseded by:** —
**Related:** [The container-query scale is `--cq-*`](2026-07-29-container-query-scale-is-cq-not-container.md)

## Decision

1. `theme.css` emits one `@custom-variant` per step of the container-query scale, with the
   threshold as a **literal**, generated from `containerQuery` in `scales.ts`:

   ```css
   @custom-variant cq-sm (@container (min-inline-size: 24rem));
   ```

2. Components write `cq-sm:flex-row`, `cq-md:px-8`. **Not** Tailwind's own `@sm:`/`@md:`
   container variants, which read `--container-*` — the namespace M1 deliberately moved our
   scale off.
3. `min-inline-size`, never `min-width`, per the logical-properties rule.
4. **A component may not query a container it declares itself.** `@container` and any
   `cq-*:` utility must be on different elements; `sourceRules.test.ts` fails on a
   `className` holding both.

## Context

The plan requires container queries as a first-class axis ("media **and** container
queries"), and the `Responsive` story is mandated as *the only honest way to story one* —
three fixed container widths side by side, because resizing the viewport does not exercise a
container query at all.

Two CSS facts shaped the implementation:

- **A container query's condition is resolved before custom properties exist.**
  `@container (min-inline-size: var(--cq-sm))` is invalid CSS. The threshold has to be a
  literal.
- **A container query matches descendants of the container, never the container.**
  `class="@container cq-md:px-8"` on one element compiles, generates real CSS, and never
  fires.

## Why

**Generating the literal is the only way to keep one source of truth and a working query.**
Hand-writing `@custom-variant cq-sm (@container (min-inline-size: 24rem))` would put the
scale in two places, and the copy would be the one nobody updates. The generator already
exists for exactly this class of problem.

**`cq-` matches `--cq-*`**, so the variant and the variable are the same word. Adopting
Tailwind's `@sm:` would reintroduce the hazard M1 found: its scale uses the same step names
at different sizes, so `@md:` and `--cq-md` would silently disagree.

**The self-query rule is a test rather than a comment because it is invisible everywhere
else.** It cost M3 one round of screenshots: `EmptyState` shipped with
`@container … cq-md:px-8` on a single `<div>` and simply never gained its wider padding —
no error, no warning, valid classes, plausible-looking source. axe does not care and
`tailwindCandidates.test.ts` passes it, because the CSS *is* generated. Only the assertion
catches it.

## Consequences

- `EmptyState` renders an inner wrapper: `className` stays on the outer container element
  where a consumer expects it, and the size classes move inside.
- `Card` and `MediaTile` are containers whose queried elements are descendants already
  (header, figcaption), so they needed no restructuring.
- **A size container cannot be sized by its own content.** `container-type: inline-size`
  implies `contain: inline-size`, so a `Card` in a shrink-to-fit parent (`items-start`, an
  inline-flex row) collapses to min-content and wraps every line after one word. In a grid
  track, a block flow, or a `flex-1` slot — nearly every real placement — it is fine. This
  is documented in `Card.mdx` and `MediaTile.mdx`, and is why `StoryCell` has an
  `align="stretch"` option.
- Adding a step to `containerQuery` produces its variant for free.

## Evidence

> `Responsive` — renders inside three container-query wrappers side by side. The **only
> honest way to story a container query**, since viewport resizing doesn't exercise it.

> **Breakpoints AND container sizes** — two separate scales, `screen.*` and `container.*`,
> deliberately named differently so nobody reaches for the wrong one.

— `docs/research/2026-07-29-charcuterie-component-library-plan.md` in the `agentic` repo.
