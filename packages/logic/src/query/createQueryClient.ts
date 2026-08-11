import {
  type DefaultOptions,
  QueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query"

/**
 * The fleet's TanStack Query defaults.
 *
 * Deliberately **react-query's own defaults** — retries stay **on**
 * (3 attempts with backoff), because a shared request/response layer
 * should recover from a transient network blip by default, and most
 * of the fleet talks to ordinary HTTP backends where that is exactly
 * right.
 *
 * The apps that turn retries *off* — rip-deck, board-games — do so
 * for an app-specific reason: they poll or receive pushed state, so
 * a failed request is about to be re-issued anyway and backoff would
 * *"keep a stale card on screen for tens of seconds after the daemon
 * came back"* (`rip-deck/.../AppProviders.tsx`). That is an **opt-out
 * those apps make**, not a fleet policy:
 *
 * ```ts
 * createQueryClient({
 *   defaultOptions: { queries: { retry: false } },
 * })
 * ```
 *
 * Kept as an explicit constant, merged through, so a genuinely
 * fleet-wide default has one obvious place to land later.
 */
export const DEFAULT_QUERY_OPTIONS: DefaultOptions = {
  queries: {},
  mutations: {},
}

/**
 * A `QueryClient` built through the fleet's one blessed
 * constructor — so a future fleet-wide default has a single home,
 * and so it pairs with {@link QueryProvider}.
 *
 * `config` is merged *over* {@link DEFAULT_QUERY_OPTIONS}, with
 * `queries` and `mutations` shallow-merged so an app can flip one
 * option (`retry: false`, `staleTime`) without restating the rest.
 *
 * ```ts
 * import { createQueryClient, QueryProvider }
 *   from "@charcuterie/logic/query"
 *
 * const client = createQueryClient({
 *   defaultOptions: { queries: { staleTime: 5_000 } },
 * })
 * ```
 */
export const createQueryClient = (
  config?: QueryClientConfig,
): QueryClient => {
  const { defaultOptions, ...rest } = config ?? {}

  return new QueryClient({
    ...rest,
    defaultOptions: {
      ...DEFAULT_QUERY_OPTIONS,
      ...defaultOptions,
      queries: {
        ...DEFAULT_QUERY_OPTIONS.queries,
        ...defaultOptions?.queries,
      },
      mutations: {
        ...DEFAULT_QUERY_OPTIONS.mutations,
        ...defaultOptions?.mutations,
      },
    },
  })
}
