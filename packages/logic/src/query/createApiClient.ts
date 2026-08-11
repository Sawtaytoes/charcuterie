import createFetchClient from "openapi-fetch"
import createQueryHooks from "openapi-react-query"

/**
 * The typed HTTP seam: `openapi-fetch` for the request and
 * `openapi-react-query` for the TanStack Query binding.
 *
 * Both are re-exported *by their upstream identity* rather than
 * wrapped in a fleet function, on purpose. Their whole value is the
 * type inference driven by a generated `paths` type — a wrapper
 * with its own generics is exactly where that inference gets lost.
 * So the fleet's contribution is the single blessed import site and
 * the naming, not a re-implementation:
 *
 * ```ts
 * import {
 *   createApiClient,
 *   createApiHooks,
 * } from "@charcuterie/logic/query"
 * import type { paths } from "./__generated__/api.gen.ts"
 *
 * const fetchClient = createApiClient<paths>({ baseUrl: "/" })
 * export const api = createApiHooks(fetchClient)
 *
 * // Fully typed off the OpenAPI spec — path, params, and body:
 * const { data } = api.useQuery("get", "/jobs/{id}", {
 *   params: { path: { id } },
 * })
 * ```
 *
 * The `paths` type is generated from the backend's OpenAPI document
 * by `openapi-typescript` and committed to the repo as a `.gen.ts`
 * file that Biome and ESLint ignore — see `@charcuterie/biome-config`
 * / `@charcuterie/eslint-config` and
 * [the generated-schemas decision](../../../docs/decisions/2026-08-11-typed-api-calls-via-openapi-typescript-generated-schemas-committed.md).
 *
 * (Both packages ship their types as `export =`, so these re-export
 * the *default* under a fleet name rather than `export { default }`,
 * which a NodeNext consumer can't resolve against an export-assignment
 * module. The generic call signatures pass through unchanged.)
 */
export const createApiClient = createFetchClient
export const createApiHooks = createQueryHooks

export type {
  Client as ApiClient,
  ClientOptions as ApiClientOptions,
  FetchResponse,
  Middleware as ApiMiddleware,
} from "openapi-fetch"
export type { OpenapiQueryClient as ApiHooks } from "openapi-react-query"
