/**
 * `@charcuterie/logic/signals` — an optional store adapter.
 *
 * The counterpart to the Jotai adapter, and the reason the store
 * seam exists at all. `castkit/packages/slatecast` already ships
 * `@preact/signals` inside a 60 KB gz budget; making it also carry
 * Jotai to use this library would be absurd, and making it carry
 * a second observable mechanism alongside signals only slightly
 * less so.
 *
 * `@preact/signals-core` is the framework-free half of signals —
 * no Preact import, no renderer integration — which is all a
 * store needs.
 *
 * ```ts
 * useVisibility({ createStore: createStoreFromSignals })
 * ```
 */

import { effect, signal } from "@preact/signals-core"

import type {
  CharcuterieStore,
  CreateCharcuterieStore,
} from "../core/types.ts"

export const createStoreFromSignals: CreateCharcuterieStore =
  <Value>(initialValue: Value): CharcuterieStore<Value> => {
    const valueSignal = signal(initialValue)

    return {
      get: () => valueSignal.value,

      set: (value) => {
        valueSignal.value = value
      },

      subscribe: (listener) => {
        // `effect` runs its body once immediately to work out what
        // it depends on. A store subscription must not fire on
        // subscribe — React's `useSyncExternalStore` would treat
        // that as a change that happened during subscription — so
        // the first run is swallowed after touching `.value`,
        // which is what registers the dependency.
        let hasRunOnce = false

        return effect(() => {
          // Read unconditionally: this is the dependency
          // registration, and skipping it inside the guard would
          // mean the effect never re-runs.
          void valueSignal.value

          if (!hasRunOnce) {
            hasRunOnce = true

            return
          }

          listener()
        })
      },
    }
  }
