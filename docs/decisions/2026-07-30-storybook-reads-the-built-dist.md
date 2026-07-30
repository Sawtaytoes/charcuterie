# Storybook reads the built `dist`, so the build runs first — and freshness is a test

**Status:** Accepted
**Date:** 2026-07-30
**Type:** Workflow
**Supersedes:** —
**Superseded by:** —

## Decision

`yarn storybook` and `yarn build:storybook` both run `yarn build` first. Do not remove
the `yarn build &&`; it is not a convenience.

`packages/tokens/src/distFreshness.test.ts` fails when `dist/theme.css` or
`dist/variables.css` differs from what the generator produces from `src` today. A stale
build is a **red test**, not something to remember.

## Context

`@charcuterie/docs` imports `@charcuterie/tokens/theme.css` and `@charcuterie/logic`,
both of which resolve through `exports` to `dist`. Nothing rebuilt them, so M4 spent an
afternoon debugging a Storybook running against a `dist` three commits old.

**Every symptom looked like something else.** A token added that afternoon simply did not
exist in the canvas — and Tailwind cannot generate a utility for a `--color-*` it never
saw, so the element rendered with the UA default and the board looked plausible. The
story asserting the new colour was present passed too, because Chromium's own
`::backdrop` is a translucent black that satisfied a loose assertion. On the `logic` side
a fix to `selectTabIndex` had no effect at all, in a Storybook whose node tests —
importing `src` directly — were green.

## Why not resolve `source` instead

Vite can be told to prefer the `source` condition, which every workspace package here
publishes, and that would make Storybook read `src` and never go stale.

It was rejected because **Storybook mirroring the consumer path is the point.** M1's
proof was that mux-magic's four-line swap resolves and looks identical; a Storybook that
quietly reads source no longer exercises `exports`, `main`, or the generator — the three
things most likely to break a real consumer. Building first keeps the path honest and
costs about two seconds.

`packages/ui/src/styles.css` stays imported from `src`, as M3 set it up, and the two are
not in conflict: that file is hand-written and has no generator to be stale against, so
importing source removes a hazard rather than hiding one.

## Why the freshness test is not skippable

If `dist` is missing, the test fails rather than skipping. A skipped freshness check on a
machine that has never built is the same silence the test exists to remove — and
Storybook cannot start without those files anyway. The failure message names the fix:
`yarn build`.
