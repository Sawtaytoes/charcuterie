/**
 * `@charcuterie/logic/jotai` — an optional store adapter.
 *
 * Thirty lines, and that is the point. Jotai is deliberately not
 * a hard dependency: every state kind is already scoped to a
 * provider subtree, which React context gives free, so atoms buy
 * scoping that is already paid for — while costing ~5–6 KB that
 * `slatecast` will not pay.
 *
 * But mux-magic already runs on Jotai, and a consumer that has
 * one store wants one store. Passing `createStore` here puts
 * every Charcuterie core's state into that store, where the Jotai
 * devtools can see it and where a `Provider` boundary resets it.
 *
 * ```ts
 * const store = createJotaiStore()
 *
 * useVisibility({ createStore: createStoreFromJotai(store) })
 * ```
 *
 * The seam has exactly three members, so there is nothing here
 * to get subtly wrong — and `runConformanceSuite` runs the full
 * model-based suite against this adapter to prove it.
 */

import type { createStore as createJotaiStore } from "jotai"
import { atom } from "jotai"

import type {
  CharcuterieStore,
  CreateCharcuterieStore,
} from "../core/types.ts"

type JotaiStore = ReturnType<typeof createJotaiStore>

export const createStoreFromJotai =
  (jotaiStore: JotaiStore): CreateCharcuterieStore =>
  <Value>(initialValue: Value): CharcuterieStore<Value> => {
    // One primitive atom per core instance, created eagerly so
    // the atom identity is stable for the store's lifetime.
    const valueAtom = atom(initialValue)

    return {
      get: () => jotaiStore.get(valueAtom),

      set: (value) => {
        jotaiStore.set(valueAtom, value)
      },

      // Jotai's `sub` already skips notifying on an unchanged
      // value, so this needs no de-duplication of its own.
      subscribe: (listener) =>
        jotaiStore.sub(valueAtom, listener),
    }
  }
