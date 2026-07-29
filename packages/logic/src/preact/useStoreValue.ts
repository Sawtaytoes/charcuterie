import { useEffect, useState } from "preact/hooks"

import type { ReadableCore } from "../core/types.ts"

/**
 * The Preact half, hand-written rather than mirrored.
 *
 * `preact/hooks` has no `useSyncExternalStore` — it lives in
 * `preact/compat`, and routing `slatecast` through compat is what
 * its 60 KB gz budget exists to prevent. So this is the
 * subscribe-in-an-effect pattern, which is correct here for a
 * reason that does not hold in React: Preact has no concurrent
 * rendering, so there is no interrupted render to tear against.
 *
 * The `setState(core.getState)` before subscribing is not
 * belt-and-braces. Between this component rendering and its
 * effect running, anything can have called a command — a parent
 * effect, an event, another member of the same group registering
 * — and without this line that change is simply lost until the
 * next unrelated one.
 *
 * `core.getState` is passed as the *updater*: Preact calls it
 * with the previous state, `getState` ignores the argument, and
 * the returned frozen object is compared by identity. That is
 * also what makes an equal state a no-op instead of a re-render.
 */
export const useStoreValue = <State>(
  core: ReadableCore<State>,
) => {
  const [state, setState] = useState(core.getState)

  useEffect(() => {
    setState(core.getState)

    return core.subscribe(() => {
      setState(core.getState)
    })
  }, [core])

  return state
}
