# Shared app logic and helpers unify into Charcuterie

**Status:** Accepted
**Date:** 2026-08-11
**Type:** Direction
**Supersedes:** —
**Superseded by:** —

## Decision

Charcuterie is the fleet's home for **shared application logic, not just design**. Where a
capability is currently re-solved in each app — data-fetching, helpers, cross-cutting
hooks — it moves into a Charcuterie package so it is edited once and inherited everywhere,
the same way tokens, state logic, and the shared build/lint configs already are.

Guardrails for *how* this unification happens:

1. **Prefer an existing package over a new one.** A new published package needs a manual
   first publish (OIDC can't seed a nonexistent name), which requires the owner. Extend an
   already-published package with a new subpath instead when the fit is honest. The owner:
   *"If you create a new package, that'll require me, so it's best to use existing ones."*
2. **One concern per package/subpath — don't fuse unrelated ideas.** *"react-router and
   react-query seem like 2 separate ideas."* `query` (request/response) and `streams` (RxJS
   push) stay separate; a future router home would be a third.
3. **Re-export, don't reimplement, a good third-party primitive.** The unify win is the
   single blessed import site + fleet defaults + convention, not a home-grown clone (see
   `@charcuterie/logic/query` re-exporting `openapi-fetch`/`openapi-react-query`).
4. **Bake in a learned default only when the sample is representative — otherwise keep the
   library's default and let apps opt out.** A tuning two apps share is a candidate, not a
   mandate: check whether they're the same *class* of app first. `@charcuterie/logic/query`
   nearly shipped `retry: false` fleet-wide because the two react-query apps set it — but
   both were polling apps, so it stays react-query's default (retries on) and the polling
   apps override. When in doubt, default to the primitive's own default and make the
   opinion opt-in.
5. **Record each move as its own decision**, so a later reader sees why a capability left
   the app and where it went.

## Context

Every app in the fleet re-solved the same non-visual problems independently — the
2026-08-11 survey found data-fetching split across react-query, hand-rolled `fetch`, SSE,
and WebSocket, with the react-query users each tuning the client differently and API types
authored three different ways. The design layer had already been centralized (tokens,
`logic`, `ui`, and the `tsconfig`/`vite-config`/`vitest-config`/`biome-config`/
`eslint-config`/`storybook-config` shared packages); the *logic* layer had not.

The owner's goal is maintainability with agents: thinner apps, one place to fix a pattern,
and a fleet an agent can reason about because the shared pieces behave the same everywhere.
*"I want to unify everything. Helpers, logic, etc among all my apps with Charcuterie. It'll
make updates simpler and make it easier to build apps and for me to maintain them with
agents."*

## Why

**A pattern solved N times drifts N ways.** The survey caught it happening — same library,
different tuning; same need, four transports. Centralizing turns "which app got it right?"
into "the library got it right, and an app overrides when it must."

**Thin apps are what makes agent maintenance tractable.** The less bespoke glue lives in
each app, the more an agent's change to a shared package fixes the whole fleet at once, and
the less per-app context a task needs to load.

**This is the design-system argument, extended one layer.** The same reason tokens and
state logic are shared — edit look/behaviour in one place — applies to fetching and
helpers. Nothing about that argument was ever specific to CSS.

## Evidence

- First move under this direction:
  [`@charcuterie/logic/query`](2026-08-11-charcuterie-owns-data-fetching-via-query.md) +
  [committed generated schemas](2026-08-11-typed-api-calls-via-openapi-typescript-generated-schemas-committed.md).
- Existing precedent for shared *config* packages:
  [storybook-config](2026-08-05-storybook-config-is-a-shared-package.md) and the
  `tsconfig`/`vite-config`/`vitest-config` packages on `master`.
- Rollout plan: [data-fetching adoption runbook](../2026-08-11-data-fetching-adoption.md).
