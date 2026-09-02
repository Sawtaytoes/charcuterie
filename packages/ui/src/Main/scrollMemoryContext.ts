import { createContext } from "react"

import type { ScrollEntry } from "./scrollMemory.ts"

/**
 * How the history entry reaches `Main` without `Main` knowing a
 * router exists.
 *
 * `@charcuterie/ui`'s main entry is router-free and stays that way —
 * `sourceRules.test.ts` asserts it, and the fleet runs five
 * different routers. So the entry arrives as a plain
 * `{ key, path }`, and the one component that knows how to read it
 * from react-router lives in the `./react-router` subpath.
 *
 * A context rather than a prop, because the alternative is a prop
 * every app has to remember on every `Main` it renders. It was a
 * prop first, exactly once, and three of the four apps that needed
 * it did not have it.
 */
export const ScrollMemoryContext =
  createContext<ScrollEntry | null>(null)
