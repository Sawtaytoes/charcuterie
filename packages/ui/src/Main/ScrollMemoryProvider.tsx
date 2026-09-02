import type { ReactNode } from "react"

import type { ScrollEntry } from "./scrollMemory.ts"
import { ScrollMemoryContext } from "./scrollMemoryContext.ts"

export type ScrollMemoryProviderProps = {
  children?: ReactNode
  /**
   * The history entry the page is showing, and the path it belongs
   * to. Under react-router both come straight off `useLocation()`.
   */
  entry: ScrollEntry
}

/**
 * Tell every `Main` below this which history entry it is showing,
 * so Back and Forward return the reader to where they were.
 *
 * An app that uses react-router should not render this directly —
 * `ReactRouterAdapter` in the `./react-router` subpath wires it,
 * along with the link seam, in one component at the root. This is
 * the router-free half, for an app on a different router:
 *
 * ```tsx
 * const [location] = useLocation()   // wouter, say
 *
 * <ScrollMemoryProvider
 *   entry={{ key: historyKey, path: location }}
 * >
 *   <App />
 * </ScrollMemoryProvider>
 * ```
 *
 * **`key` must identify the history entry, not the URL.** Two visits
 * to the same list are two entries and the reader may leave them at
 * different offsets; a key derived from the path would give the
 * second visit the first one's position and could not tell Back from
 * Forward. A router that exposes no such key can pass a counter it
 * increments on every push and restores on every pop.
 */
export const ScrollMemoryProvider = ({
  children,
  entry,
}: ScrollMemoryProviderProps): ReactNode => (
  <ScrollMemoryContext.Provider value={entry}>
    {children}
  </ScrollMemoryContext.Provider>
)
