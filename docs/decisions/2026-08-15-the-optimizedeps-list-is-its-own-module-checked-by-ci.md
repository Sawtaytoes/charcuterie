# The `optimizeDeps.include` list is its own module, checked by CI

- **Status:** Accepted
- **Date:** 2026-08-15
- **Type:** Convention
- **Supersedes:** —
- **Superseded by:** —

## Decision

A consumer that keeps an `optimizeDeps.include` list for its Vitest browser-mode
suite puts the array in its **own `optimizeDeps.js` module** beside the Vitest
config, and runs `charcuterie-check-optimize-deps` as a CI step **after** the
suite.

The layout, identical in every repo:

```
packages/web/optimizeDeps.js     # the array, plain JS
packages/web/optimizeDeps.d.ts   # `export declare const optimizeDepsInclude: readonly string[]`
packages/web/vitest.config.ts    # optimizeDeps: { include: [...optimizeDepsInclude] }
```

```yaml
- run: yarn vitest run
- name: Check optimizeDeps.include parity
  working-directory: packages/web
  run: >-
    yarn charcuterie-check-optimize-deps ./optimizeDeps.js
    --cache-dir node_modules/.vite
```

This does **not** replace
[the subpath rule](2026-08-15-a-new-subpath-import-must-join-the-consumers-optimizedeps-list.md);
it is the mechanism that enforces it.

## Context

The list guards a race. Vite discovers dependencies lazily, so one that is not
pre-declared gets found part-way through a run, which re-optimizes and reloads
the page underneath the running tests. In Vitest browser mode that throws away
React's compiler-runtime cache and surfaces as
`Cannot read properties of null (reading 'useMemoCache')` or
`Failed to fetch dynamically imported module: …?v=<hash>`.

Neither message names the missing dependency. Vitest reports the second through
a `beforeEach`/`afterEach` frame. And because it is a race rather than a
determinate break, **an incomplete list passes until it doesn't** — invisible
locally, where `node_modules/.vite` is warm after the first run, and only biting
on a cold runner.

## Why

**A comment asking a human to remember is not a mechanism, and we have the data
to prove it.** Two fleet repos carried a comment describing this exact hazard, in
detail, and drifted anyway. The 2026-08-11 query adoption added a
`@charcuterie/logic/query` import to seven repos and updated no list. On
2026-08-15 mux-magic lost the coin flip and took 16 tests with it; the audit that
followed found **every repo in the fleet that kept such a list had the same gap —
3 for 3** (mux-magic short three, rip-deck four, board-games four). Two of
mux-magic's three missing entries pre-dated the change that surfaced them.

Three details of the convention are load-bearing:

- **Its own module, not an inline array.** The checker runs in a plain Node
  process, which cannot load a TypeScript Vitest config. Extracting the array is
  what makes it readable by both.
- **After the suite, not during.** The optimizer writes its metadata as it
  discovers, so before a run there is nothing to compare and mid-run the picture
  is incomplete. A check that ran inside the suite would under-report.
- **The cache lives beside the package**, at
  `packages/web/node_modules/.vite/…`, not at the repo root. Clearing the wrong
  one yields a warm run that passes and proves nothing — an error made twice
  while diagnosing the original incident.

A `.d.ts` accompanies the `.js` because the list must stay plain JavaScript for
the checker while `vitest.config.ts` still needs it typed under
`recommendedTypeChecked`. The array is `readonly` and spread at the use site,
since Vite's `include` is a mutable `string[]`.

## Evidence

The user, on being told the invariant was still manual and that a comment had
already failed twice:

> I have no clue what this means, but if you need to build a feature to fix an
> issue, go ahead.

Shipped as `charcuterie-check-optimize-deps` in `@charcuterie/vitest-config@1.1.0`
(charcuterie #97), wired into rip-deck #2, board-games #9 and mux-magic #228.

Verified to fail when it should, not merely to pass: removing
`@charcuterie/logic/query` — the entry that actually went missing fleet-wide —
from rip-deck's list gives exit 1 and names it with a paste-ready fix, while the
suite itself still passed 1293/1293 on that same cold cache. That gap between
"tests green" and "list wrong" is the whole reason the check exists.
