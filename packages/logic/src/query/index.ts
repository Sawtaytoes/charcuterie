/**
 * `@charcuterie/logic/query` — the fleet's request/response data
 * layer: a TanStack Query client carrying the fleet's defaults, and
 * the provider wired to it.
 *
 * This is the counterpart to (future) `@charcuterie/streams`, which
 * owns the *push* side (RxJS over SSE/WebSocket). Fetching, caching,
 * and request-retry live here; a server that pushes lives there. The
 * two never merged into one package — [the split was drawn
 * deliberately](../../../docs/decisions/2026-08-11-charcuterie-owns-data-fetching-via-query.md).
 *
 * The surface is intentionally thin: a client factory carrying the
 * defaults two apps had already tuned, and a provider wired to them.
 * Advanced TanStack APIs (`useQueryClient`, `useMutation`,
 * `QueryCache`, …) are imported from `@tanstack/react-query`
 * directly — it is a peer dependency the consuming app already
 * installs, and re-exporting it here would only add a second name
 * for the same thing.
 *
 * The **typed OpenAPI seam** (`createApiClient` / `createApiHooks`,
 * the `openapi-fetch` and `openapi-react-query` primitives) is
 * `@charcuterie/logic/openapi`, not this barrel. Only an app whose
 * backend publishes an OpenAPI document needs it, and keeping it out
 * of here is what lets everyone else install neither library — [the
 * split
 * decision](../../../docs/decisions/2026-08-13-the-openapi-seam-is-its-own-subpath-not-part-of-query.md).
 *
 * House convention: this barrel is the entry; deep imports stay
 * available via the package's `"./src/*"` entry for budget-sensitive
 * consumers.
 */

export {
  createQueryClient,
  DEFAULT_QUERY_OPTIONS,
} from "./createQueryClient.ts"
export {
  QueryProvider,
  type QueryProviderProps,
} from "./QueryProvider.tsx"
