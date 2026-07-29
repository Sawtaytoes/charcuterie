import { useSyncExternalStore } from "react"

import type { ReadableCore } from "../core/types.ts"

/**
 * The entire React half of this library, in one call.
 *
 * `useSyncExternalStore` is the correct primitive here and not
 * merely a convenient one: it is tear-free under concurrent
 * rendering, which a `useState` + `useEffect` subscription is
 * not. Two components reading the same core mid-transition would
 * otherwise be able to render different answers in the same
 * commit.
 *
 * It re-renders on reference identity, which is why every core
 * returns a frozen state object whose identity changes only when
 * the state does, and why `keepArrayIdentity` exists.
 *
 * The third argument is the server snapshot. Passing `getState`
 * again is right for this library: the cores hold UI state that
 * starts from its declared initial value on both sides, so there
 * is nothing to hydrate differently.
 */
export const useStoreValue = <State>(
  core: ReadableCore<State>,
) =>
  useSyncExternalStore(
    core.subscribe,
    core.getState,
    core.getState,
  )
