import {
  type QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { type ReactNode, useState } from "react"

import { createQueryClient } from "./createQueryClient.ts"

export type QueryProviderProps = {
  /**
   * The client to provide. Omit it and the provider mints one from
   * {@link createQueryClient} — the common case for an app with a
   * single client and no need to reach it outside React.
   */
  client?: QueryClient
  children?: ReactNode
}

/**
 * `QueryClientProvider` pre-wired with the fleet's
 * {@link createQueryClient} defaults.
 *
 * The fallback client is minted once per mount via `useState`'s lazy
 * initializer, so a re-render never throws the cache away. Pass
 * `client` when the app already owns a `QueryClient` (to seed it, to
 * call `invalidateQueries` from outside a component, or to share one
 * across providers).
 */
export const QueryProvider = ({
  client,
  children,
}: QueryProviderProps) => {
  const [fallbackClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={client ?? fallbackClient}>
      {children}
    </QueryClientProvider>
  )
}
