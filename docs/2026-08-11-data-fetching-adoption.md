# Fleet adoption: `@charcuterie/logic/query` + generated API schemas

The rollout plan for [Charcuterie owns request/response
data-fetching](decisions/2026-08-11-charcuterie-owns-data-fetching-via-query.md) and
[typed API calls via committed generated
schemas](decisions/2026-08-11-typed-api-calls-via-openapi-typescript-generated-schemas-committed.md).
This is the durable brief for the per-app fan-out — one adoption PR per repo.

## Ordering — this gates everything

App PRs **cannot merge until `@charcuterie/logic` publishes the `./query` subpath.**
Apps consume Charcuterie over npm; `@charcuterie/logic/query` does not exist on the
registry until the changeset in this branch releases. So:

1. **First:** land the foundation PR (this branch, `charcuterie-query`) → changeset
   release publishes `@charcuterie/logic` (minor) with `./query`, plus
   `@charcuterie/biome-config` + `@charcuterie/eslint-config` (minor) with the
   generated-file ignores.
2. **Then:** open each app's adoption PR against the *published* version. An adoption PR
   opened earlier is blocked on an unpublished dependency and just churns CI.

Do not fan the app PRs out before step 1 is on the registry.

## Fleet survey (2026-08-11) — who adopts what

| Repo | Web pkg | Today | Adoption |
| --- | --- | --- | --- |
| **rip-deck** | `packages/web` | react-query `^5.100.9`, `retry:false`, `@rip-deck/contracts` hand types, raw `fetch` in `httpDataSource` | Swap `createQueryClient`/`QueryProvider` in; **keep its `retry:false` as an explicit override** (`createQueryClient({ defaultOptions: { queries: { retry: false } } })`) — the shared client no longer forces retries off, and rip-deck is a polling app that wants them off. Generate schema **if** the daemon exposes OpenAPI; else keep contracts, still route through the shared client. |
| **mux-magic** | `packages/web` (+ `packages/api`) | react-query `^5.100.9`, **no** tuning; already generates OpenAPI types in `packages/api`; web still hand-rolls `fetch` | Highest-value: point web at `createApiHooks` over the schema `packages/api` already generates; adopt `createQueryClient` defaults (decide retry per its backends). Reference app for the pattern. |
| **board-games** | `packages/web` | react-query `^5.100.9`, `retry:false`, `@board-games/contracts` | Same as rip-deck — carry `retry:false` as an explicit override. Schema only if the server exposes OpenAPI. |
| **plex-channels** | `web` | hand-rolled `fetch` + ETag + SSE | Add react-query via the shared client for the request/response calls; **leave SSE** (that's the future `streams`). |
| **gallery-downloader** | `packages/web` | `fetch` in `useEffect`, manual polling | Replace poll loops with `useQuery` + `refetchInterval`; shared client. Good codegen candidate if server has OpenAPI. |
| **points-market** | `packages/web` | `fetch` in `lib/api.ts`, inline types | Shared client + hooks; generate schema if OpenAPI, else move inline types to a `contracts` boundary. |
| **mail-sifter** | `packages/web` | `fetch` in `lib/api.ts`, inline types | Same as points-market. |

**Out of scope** (not request/response, or no HTTP): **ai-usage** and **portly-controllers**
(SSE-only — future `@charcuterie/streams`), **castkit/slatecast** (Preact + WebSocket +
signals; also a 60 KB budget), **castkit/web** (mock-data Storybook), **image-viewer**
(Electron IPC / filesystem). Do not force react-query into these.

## Per-app adoption checklist

1. **Depend:** add `@tanstack/react-query` (`^5.100.9`, the fleet pin), and — if generating
   schemas — `openapi-fetch`, `openapi-react-query`, and `openapi-typescript` (dev). Ensure
   `@charcuterie/logic` is at the version that has `./query`.
2. **Client + provider:** replace the app's `new QueryClient(...)` with
   `createQueryClient(...)` and its provider with `QueryProvider` from
   `@charcuterie/logic/query`. Move any bespoke tuning into the `createQueryClient`
   override argument. The shared client keeps react-query's defaults (retries on), so a
   polling app passes `{ defaultOptions: { queries: { retry: false } } }` explicitly.
3. **Schema (if the backend exposes OpenAPI):** add
   `"generate:api": "openapi-typescript <spec-url-or-file> -o src/api/__generated__/api.gen.ts"`,
   run it, **commit** the output. The shared configs already ignore `**/*.gen.ts` /
   `**/__generated__/**`, so no per-repo lint wiring. If the app extends the shared Biome/
   ESLint configs, confirm the ignore lands; if it defines its own `files.includes`, add the
   negations.
4. **Calls:** build `const api = createApiHooks(createApiClient<paths>({ baseUrl }))` and
   move `fetch` calls to `api.useQuery(...)` / `api.useMutation(...)`. Where there's no
   OpenAPI spec, keep the typed `fetch` wrapper but still cache through the shared client.
5. **Verify:** the app's own gates (typecheck, lint, test, build). For a visible app, drive
   the changed data view and screenshot per the workspace screenshot rules.
6. **PR:** one focused PR per repo, against that repo's default branch, CI-gated. Do not
   self-merge.

## Notes for the fan-out

- Public-GitHub repos (castkit, image-viewer, mux-magic, plex-channels) → `gh` per the
  agent-container-git policy; others per their remote.
- Each adopting agent works in **its own `git worktree`** (native `git worktree add`).
- Keep the diff to the data layer — this is not a redesign; visual output should be
  unchanged.
