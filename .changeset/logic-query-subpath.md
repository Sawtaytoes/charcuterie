---
"@charcuterie/logic": minor
---

Add `@charcuterie/logic/query` — the fleet's request/response data layer, so
data-fetching is edited in one place like tokens and state already are.

- `createQueryClient(config?)` — the one blessed `QueryClient` constructor. It
  keeps react-query's own defaults (**retries stay on** — a shared data layer
  should recover from a transient blip) and deep-merges any override, so a
  polling app opts out with `{ defaultOptions: { queries: { retry: false } } }`.
- `QueryProvider` — `QueryClientProvider` pre-wired to that client.
- `createApiClient` / `createApiHooks` — the `openapi-fetch` and
  `openapi-react-query` primitives re-exported at full type fidelity, so a
  `paths` type generated from the backend's OpenAPI spec makes every call
  path/params/body type-safe.

`@tanstack/react-query`, `openapi-fetch`, and `openapi-react-query` are optional
peer dependencies — a consumer that doesn't import `./query` pulls none of them.
This is the request/response counterpart to the future RxJS-based
`@charcuterie/streams` (push-only); the two are deliberately separate packages.
