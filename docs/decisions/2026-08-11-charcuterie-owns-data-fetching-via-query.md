# Charcuterie owns request/response data-fetching, via `@charcuterie/logic/query`

**Status:** Accepted
**Date:** 2026-08-11
**Type:** Scope
**Supersedes:** the "Fetching, caching, request-retry → the consumer's react-query" row of [`streams` is a browser package, and push-only](2026-07-31-streams-is-a-browser-package-and-push-only.md) (that decision otherwise stands)
**Superseded by:** the packaging only — [the OpenAPI seam is its own subpath](2026-08-13-the-openapi-seam-is-its-own-subpath-not-part-of-query.md) moved `createApiClient`/`createApiHooks` out of `./query` and onto `./openapi` in `@charcuterie/logic@2.0.0`. Everything else here — including which defaults the client carries and that retries stay on — stands.

## Decision

Data-fetching is a **Charcuterie** concern, not a per-app one. It lives in the existing
`@charcuterie/logic` package under a new `./query` subpath:

- `createQueryClient(config?)` — the one blessed TanStack `QueryClient` constructor. It
  keeps react-query's own defaults (retries **on**) and deep-merges any override, so a
  polling app opts *out* of retries rather than everyone opting in.
- `QueryProvider` — `QueryClientProvider` pre-wired to that client.
- `createApiClient` / `createApiHooks` — the `openapi-fetch` and `openapi-react-query`
  primitives re-exported at full type fidelity, so a `paths` type generated from the
  backend's OpenAPI spec makes every call type-safe. See [the generated-schemas
  decision](2026-08-11-typed-api-calls-via-openapi-typescript-generated-schemas-committed.md).

The three libraries (`@tanstack/react-query`, `openapi-fetch`, `openapi-react-query`) are
**optional peer dependencies** — a consumer that never imports `./query` pulls none of
them.

This **revises the 2026-07-31 `streams` decision**, whose scope table put "Fetching,
caching, request-retry" under *"`@tanstack/react-query` — the consumer's"*. That row is
struck; fetching now has a Charcuterie home. **Everything else in that decision stands**:
`streams` is still browser-only and push-only, still owns SSE/WebSocket + RxJS operators,
and is still a **separate package** from this one — `query` is request/response, `streams`
is push. react-router, if it ever gets a shared home, is a third, unrelated concern.

## Context

The 2026-07-31 decision was right for its moment: only two apps used react-query, one had
tuned it and one hadn't, and a *"charcuterie package that retried requests would be a
second answer to a question two apps have answered."* The owner has since set a broader
direction — **unify helpers, logic, and data-fetching across the fleet into Charcuterie**,
so apps get thinner and are easier to build and maintain with agents
([the umbrella decision](2026-08-11-unify-app-shared-logic-into-charcuterie.md)). Under
that goal the earlier scoping inverts: the point is no longer "don't duplicate the two
apps that answered" but "give the other apps the answer so they stop each inventing one."

The fleet survey (2026-08-11) found the sprawl the unify goal targets: **3** frontends on
react-query at the same `^5.100.9` (rip-deck, mux-magic, board-games), with *different*
`QueryClient` tuning; **4** more hand-rolling `fetch` (plex-channels, gallery-downloader,
points-market, mail-sifter); and **1** generating typed API schemas (mux-magic) whose web
layer *still* calls raw `fetch`. Type provenance ranged from generated-from-OpenAPI to
shared hand-authored contracts to types typed inline in each web package.

## Why

**The shared client keeps react-query's defaults; it does not invent a fleet retry
policy.** An earlier draft made `retry: false` the fleet default, generalizing from the two
apps that set it — but both are *polling* apps that turn retries off because backoff keeps
stale data on screen, a biased sample. The apps this rollout converts (plex-channels,
gallery-downloader, points-market, mail-sifter) are ordinary request/response apps where
react-query's default retries are exactly the resilience wanted. So retries stay **on** by
default and the polling apps opt out — `createQueryClient` is the one construction point
and the future home for any default that is genuinely fleet-wide, not a place to bake one
sample's preference in.

**"Don't duplicate an existing owner" is satisfied by re-export, not re-implementation.**
The module does not reimplement caching or a fetch client — it re-exports `openapi-fetch`
and `openapi-react-query` at full type fidelity and adds only the client factory, the
provider, and the naming. The 2026-07-31 worry (a *second* retry implementation) never
materializes because there is no retry implementation here at all.

**It reuses a package instead of creating one.** A new published package needs a manual
first publish (OIDC can't seed a nonexistent name — see
[storybook-config](2026-08-05-storybook-config-is-a-shared-package.md)), which requires the
owner. A new **subpath on the already-published `@charcuterie/logic`** ships on the normal
changeset release with no manual step. `logic` is the right host: it is literally "shared
state logic as framework-free cores with React and Preact bindings," and a cache-bound
data hook is state logic.

## Evidence

- The polling opt-out (why it's an app choice, not the fleet default):
  `rip-deck/packages/web/src/components/AppProviders.tsx` (`retry: false` + the stale-card
  comment), `board-games/packages/web/src/app.tsx` (`retry: false`).
- Fleet survey 2026-08-11 (recorded in [the rollout runbook](../2026-08-11-data-fetching-adoption.md)):
  react-query in rip-deck / mux-magic / board-games; hand-rolled `fetch` in plex-channels,
  gallery-downloader, points-market, mail-sifter; OpenAPI codegen only in mux-magic
  (`packages/api`).
- Module: `packages/logic/src/query/`, exported as `@charcuterie/logic/query`.
- Owner direction, 2026-08-11: *"I want to unify everything. Helpers, logic, etc among all
  my apps with Charcuterie. It'll make updates simpler and make it easier to build apps and
  for me to maintain them with agents."* And on scope: *"react-router and react-query seem
  like 2 separate ideas"*; `streams` *"specific to RxJS"*; on packaging: *"If you create a
  new package, that'll require me, so it's best to use existing ones."*
