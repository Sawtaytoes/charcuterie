import { useId } from "react"

/**
 * An id for wiring `aria-controls` / `aria-labelledby`, or the
 * caller's own id when it has one.
 *
 * Uses React's `useId` rather than v1's `createRandomString`.
 * `Math.random()` ids are not stable across a server render and
 * its hydration, so every `aria-controls` in a server-rendered
 * app pointed at an id that existed only on one side. `useId` is
 * the primitive that exists to fix exactly that.
 *
 * `createRandomString` survives in `@charcuterie/logic/core` for
 * the framework-free path, which has no `useId` to reach for.
 */
export const useUniqueId = (existingId?: string) => {
  // Called unconditionally, then discarded when the caller
  // supplied an id — hooks cannot be skipped, and generating an
  // unused id costs nothing.
  const generatedId = useId()

  return existingId ?? generatedId
}
