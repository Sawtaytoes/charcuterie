# A new subpath import must join the consumer's `optimizeDeps.include`

**Status:** Accepted
**Date:** 2026-08-15
**Type:** Consumer integration
**Supersedes:** —
**Superseded by:** —

## Decision

A repo running Vitest **browser mode** pre-declares its dependencies in
`optimizeDeps.include`. When a change adds an import from a Charcuterie subpath the
repo has not used before, **that specifier joins the list in the same change**.

**Each subpath is its own optimizer entry.** `@charcuterie/logic` in the list does *not*
cover `@charcuterie/logic/query` or `@charcuterie/logic/openapi`. Neither does `ui`
cover `logic`.

The list's source of truth is the repo's own `_metadata.json`, written to
`packages/<app>/node_modules/.vite/vitest/<hash>/deps/` after a **cold** run. Diff the
top-level keys there against the list; they should match exactly. The `vitest > …` rows
are Vite's naming for transitive deps, not entries — leave those out.

**The cache lives under the package directory, not the repo root.** Deleting
`node_modules/.vite` at the root leaves `packages/<app>/node_modules/.vite` warm, and a
warm run passes while proving nothing.

## Context

Vite discovers dependencies lazily. An unlisted one is found part-way through a run,
which triggers a re-optimization and reloads the page underneath the running tests. Both
mux-magic and rip-deck already carried a comment describing this and the list to prevent
it. Both lists had nonetheless drifted, in the same way, from the same cause.

The [fleet query adoption](2026-08-11-charcuterie-owns-data-fetching-via-query.md) added
`@charcuterie/logic/query` imports to seven repos. Neither mux-magic's nor rip-deck's
list gained the entry. Nothing failed — an unlisted entry is a **race**, not a
determinate break, and both repos kept winning it.

mux-magic lost it two days later, when [the OpenAPI split](2026-08-13-the-openapi-seam-is-its-own-subpath-not-part-of-query.md)
adoption added a *second* unlisted subpath. **16 tests** failed across a set of files
that **differed between runs** — the tell for a race rather than a broken file:

```
Caused by: TypeError: Failed to fetch dynamically imported module:
  …/deps/react_jsx-dev-runtime.js?v=4aa5959c
```

The changing `?v=` hash is the re-optimization signature. Vitest reports it as
`Failed to import test file` / `Vitest failed to find the current suite` through a
`beforeEach`/`afterEach` frame, which points at the hooks — the least informative place
to look.

Auditing both repos against `_metadata.json` found the lists short by **three** entries
(mux-magic: `logic/openapi`, `logic/query`, `ui`) and **four** (rip-deck:
`logic/query`, `tokens`, `ui`, `expect-type`).

## Why

- **Comments describing a manual invariant do not maintain it.** Both repos documented
  this hazard *and* drifted anyway, because nothing connects "I added an import" to "I
  must edit a list in a config file." Stating the rule as a decision is the minimum; a
  test asserting list-vs-`_metadata.json` parity would be better and is the obvious
  follow-up.
- **The symptom never names the cause.** Neither `useMemoCache` nor `Failed to fetch
  dynamically imported module` mentions the package that is missing, and the reported
  frame is a lifecycle hook. Recognition has to come from somewhere; this record is that
  somewhere.
- **Copying a sibling's list is how it drifts.** rip-deck's comment named "mux-magic's
  copy, filtered to what this package depends on" as its source — a snapshot that goes
  stale the moment either repo's imports change. The generated metadata cannot.
- **Green is not evidence here.** A race passes until it doesn't, and the local warm
  cache means it passes *more* locally. Only a cold run at the correct path tests
  anything.

## Evidence

mux-magic, after adding the three missing entries — exact parity and a green cold run:

```
metadata: 24  config: 24
missing from config: []   extra in config: []
Test Files  384 passed | 46 skipped (430)
      Tests  2946 passed (2946)
```

rip-deck, after adding its four (13 vs 13, no diff, 1293/1293) — committed but unpushed;
the repo was archived 2026-08-15T05:50Z.

**Five more repos took `@charcuterie/logic/query` in the same fan-out** — board-games,
mail-sifter, points-market, queuepilot, gallery-downloader. Any of them running Vitest
browser mode with an `optimizeDeps.include` list is carrying the same unlisted entry and
has simply not lost the coin flip yet. They are worth the same audit.
