/**
 * `@charcuterie/logic/openapi` — the typed HTTP seam for a backend
 * that publishes an OpenAPI document: `openapi-fetch` for the
 * request and `openapi-react-query` for the TanStack Query binding.
 *
 * This is a **separate subpath from `./query` on purpose.** `./query`
 * is the client and provider every frontend needs; the OpenAPI seam
 * is the subset that also generates a `paths` type from a spec. When
 * the two shared one barrel, importing the provider dragged
 * `openapi-fetch` and `openapi-react-query` into a consumer's type
 * graph — an app with no OpenAPI document had to install both to
 * typecheck a `QueryProvider`. See [the split
 * decision](../../../docs/decisions/2026-08-13-the-openapi-seam-is-its-own-subpath-not-part-of-query.md).
 *
 * Named for the library it binds, like the `./jotai` and `./signals`
 * adapters — not `./query-openapi`.
 *
 * Both subpaths are used together by an OpenAPI consumer; nothing
 * here re-exports the client or provider:
 *
 * ```ts
 * import { QueryProvider } from "@charcuterie/logic/query"
 * import {
 *   createApiClient,
 *   createApiHooks,
 * } from "@charcuterie/logic/openapi"
 * ```
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
