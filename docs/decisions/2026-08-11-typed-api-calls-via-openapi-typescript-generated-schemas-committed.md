# Typed API calls use `openapi-typescript`, and the generated schema is committed but lint-ignored

**Status:** Accepted
**Date:** 2026-08-11
**Type:** Convention
**Supersedes:** —
**Superseded by:** —

## Decision

An app's frontend gets type-safe API calls by generating types from the backend's OpenAPI
document with **`openapi-typescript`**, and calling through **`openapi-fetch`** /
**`openapi-react-query`** (re-exported from
[`@charcuterie/logic/query`](2026-08-11-charcuterie-owns-data-fetching-via-query.md)).

The generated file is **committed to the repo**, not produced at build time only:

- It lives at a canonical path — a single `…/__generated__/api.gen.ts` (or several files
  under `__generated__/`).
- It is **checked in**, so the types resolve on a fresh clone with no codegen step, CI
  typechecks exactly what shipped, and a schema change shows up as a reviewable diff.
- It is **excluded from Biome and ESLint**, centrally: `@charcuterie/biome-config` disables
  the linter/formatter/assist for `**/*.gen.ts`, `**/*.gen.tsx`, `**/__generated__/**`, and
  `@charcuterie/eslint-config` exports `createGeneratedIgnores()` / `GENERATED_SCHEMA_GLOBS`
  for the flat config. An app inherits both by extending the shared configs.
- A `package.json` script regenerates it — `"generate:api": "openapi-typescript <spec> -o
  <path>"` — run on demand (or in a pre-commit / CI check that fails if the committed file
  is stale), never as a hidden prerequisite of `build`.

## Context

The fleet survey (2026-08-11) found **one** app generating API types — mux-magic, via
`@hono/zod-openapi` + `openapi-typescript` — and even its web layer still hand-rolled
`fetch`. Every other frontend authored request/response types by hand: shared `contracts`
packages in three repos, and types typed inline in the web package in four more. Hand
types drift from the server the moment either side changes, silently, because nothing
checks them against the wire.

`openapi-typescript` is by the OpenAPI-TS project (Drew Powers et al.), not Chinese-origin
([provenance constraint](2026-06-23-avoid-chinese-origin-software.md)), and is the exact
companion to the `openapi-fetch` / `openapi-react-query` primitives the query module
already re-exports.

## Why

**Committed beats build-time-only.** A generated artifact that exists only during the build
can't be typechecked on a clone, can't be diffed in review, and turns every checkout into
"did you run codegen?" Committing it makes the type surface a first-class, reviewable part
of the repo — the same reason `@charcuterie/tokens` commits its generated CSS/JSON.

**Lint-ignored beats lint-fought.** House rules (`id-length`, `is`/`has` booleans, import
ordering) have no authority over machine output, and running type-aware ESLint across a
10k-line `paths` type is pure cost for zero signal. Ignoring it centrally means no app
re-litigates the ignore, and no generated file ever shows up as a lint failure that blocks
a merge.

**One canonical shape lets the rollout be mechanical.** With the path (`__generated__/`),
the tool (`openapi-typescript`), and the ignore globs fixed fleet-wide, adopting an app is
the same three steps every time — which is what makes the [rollout](../2026-08-11-data-fetching-adoption.md)
safe to fan out across repos.

## Evidence

- Ignore globs wired: `packages/biome-config/config.json` (`overrides`),
  `packages/eslint-config/src/index.js` (`GENERATED_SCHEMA_GLOBS`,
  `createGeneratedIgnores`), and dogfooded in this repo's `biome.json` / `eslint.config.js`.
  Verified: a badly-formatted `probe.gen.ts` is reported as ignored by both.
- Prior art: mux-magic `packages/api` (`generate:internal-api-schemas` →
  `openapi-typescript`, `openapi-fetch` client).
- Owner direction, 2026-08-11: *"add instructions about grabbing generated API schemas as
  part of the repo (ignored by Biome, linting, etc) to be able to make our API calls
  type-safe."*
