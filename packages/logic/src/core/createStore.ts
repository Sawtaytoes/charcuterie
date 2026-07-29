/**
 * The default store: an observable ref, zero dependencies.
 *
 * This is what a consumer gets when it injects nothing, and it is
 * what the model-based suite runs against first — if an invariant
 * fails here it is the core's fault, not an adapter's.
 */

import type {
  CharcuterieStore,
  CreateCharcuterieStore,
  Listener,
} from "./types.ts"

export const createStore: CreateCharcuterieStore = <Value>(
  initialValue: Value,
): CharcuterieStore<Value> => {
  let currentValue = initialValue

  const listeners = new Set<Listener>()

  return {
    get: () => currentValue,

    set: (value) => {
      // Cores already skip no-op writes, but an injected store
      // has no such guarantee, so the seam enforces it. Without
      // this, `set` to an equal value would still notify and
      // every subscriber would re-render for nothing.
      if (Object.is(value, currentValue)) {
        return
      }

      currentValue = value

      // Copied before iterating: a listener that unsubscribes
      // itself — which every `useEffect` cleanup does — would
      // otherwise mutate the set mid-iteration.
      for (const listener of [...listeners]) {
        listener()
      }
    },

    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
