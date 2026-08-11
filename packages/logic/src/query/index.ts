/**
 * `@charcuterie/logic/query` — the fleet's request/response data
 * layer: TanStack Query for caching and a `paths`-typed
 * `openapi-fetch` client for the wire.
 *
 * This is the counterpart to (future) `@charcuterie/streams`, which
 * owns the *push* side (RxJS over SSE/WebSocket). Fetching, caching,
 * and request-retry live here; a server that pushes lives there. The
 * two never merged into one package — [the split was drawn
 * deliberately](../../../docs/decisions/2026-08-11-charcuterie-owns-data-fetching-via-query.md).
 *
 * The surface is intentionally thin: a client factory carrying the
 * defaults two apps had already tuned, a provider wired to them, and
 * a re-export of the `openapi-fetch` / `openapi-react-query`
 * primitives at full type fidelity. Advanced TanStack APIs
 * (`useQueryClient`, `useMutation`, `QueryCache`, …) are imported
 * from `@tanstack/react-query` directly — it is a peer dependency
 * the consuming app already installs, and re-exporting it here would
 * only add a second name for the same thing.
 *
 * House convention: this barrel is the entry; deep imports stay
 * available via the package's `"./src/*"` entry for budget-sensitive
 * consumers.
 */

export {
  type ApiClient,
  type ApiClientOptions,
  type ApiHooks,
  type ApiMiddleware,
  createApiClient,
  createApiHooks,
  type FetchResponse,
} from "./createApiClient.ts"
export {
  createQueryClient,
  DEFAULT_QUERY_OPTIONS,
} from "./createQueryClient.ts"
export {
  QueryProvider,
  type QueryProviderProps,
} from "./QueryProvider.tsx"
