/**
 * Media query — one boolean, owned by the environment rather than
 * by the app.
 *
 * Not one of the five state *kinds*, and deliberately so: nothing
 * registers, nothing is picked, and **nobody may set it**. It is
 * `createColorScheme`'s shape rather than `createVisibility`'s —
 * a plain factory over an injected store with a **second injected
 * seam**, the `matcher`, which is the only thing that can move the
 * value ([decision](../../../../docs/decisions/2026-07-31-not-every-boolean-is-a-state-kind.md)).
 *
 * The seam is the whole point. `matchMedia` lives in
 * `@charcuterie/logic/browser`, so the main entry stays DOM-free
 * for Satori and React-Native, and a test injects a matcher it can
 * flip by hand instead of stubbing a global.
 *
 * ## Why the fleet needs this at all
 *
 * Four repos collapse a toolbar at a narrow width and only one of
 * them does it without rendering every action twice. plex-channels'
 * `useMediaQuery` (`web/src/hooks/useMediaQuery.ts`) is the correct
 * pattern and is generalised here — with one fix: it builds a fresh
 * `MediaQueryList` on **every** `get`, which `useSyncExternalStore`
 * calls on every render. One list, built once, is the same answer
 * for less work.
 */

import { createStore as createDefaultStore } from "./createStore.ts"
import type { ReadableCore, StoreOptions } from "./types.ts"

/**
 * The injected environment seam — the same minimal `get`/`subscribe`
 * shape as `ColorSchemeResolver` and `BlockSizeResolver`.
 * `matchMedia` satisfies it, and so does a plain object in a test.
 * `get` must be synchronous.
 */
export type MediaQueryMatcher = {
  get: () => boolean
  subscribe: (listener: () => void) => () => void
}

export type MediaQueryState = {
  isMatching: boolean
}

export type MediaQueryOptions = StoreOptions & {
  /**
   * The answer when there is no `matcher` — a server render, a
   * non-browser host, a test that does not care. Read once, and
   * overridden immediately by any matcher that is supplied.
   *
   * Default `false`, which for a `Toolbar` means "assume the wide
   * layout". The safe direction: a bar that starts whole and
   * collapses is a frame of over-drawing, where one that starts
   * collapsed and expands hides controls that were there.
   */
  isMatching?: boolean
  matcher?: MediaQueryMatcher
  /**
   * Fires only on an actual change. A controlled consumer echoing
   * this back down as a prop is the infinite loop every `onChange`
   * in this package fires selectively to avoid.
   */
  onChange?: (isMatching: boolean) => void
}

export type MediaQuery = ReadableCore<MediaQueryState> & {
  /**
   * Begin listening. Returns the unsubscribe, and re-reads the
   * matcher first, so a viewport resized between construction and
   * the binding's effect is reconciled rather than missed.
   *
   * Called from an effect rather than the constructor so a
   * discarded StrictMode core never leaks a listener — the same
   * arrangement `createColorScheme.start` uses.
   */
  start: () => () => void
}

export const selectIsMatching = (state: MediaQueryState) =>
  state.isMatching

export const createMediaQuery = ({
  createStore = createDefaultStore,
  isMatching: isInitiallyMatching = false,
  matcher,
  onChange,
}: MediaQueryOptions = {}): MediaQuery => {
  const store = createStore<MediaQueryState>(
    Object.freeze({
      isMatching: matcher?.get() ?? isInitiallyMatching,
    }),
  )

  const commit = (isNextMatching: boolean) => {
    if (isNextMatching === store.get().isMatching) {
      return
    }

    store.set(Object.freeze({ isMatching: isNextMatching }))

    onChange?.(isNextMatching)
  }

  return {
    getState: store.get,

    start: () => {
      if (!matcher) {
        return () => {}
      }

      commit(matcher.get())

      return matcher.subscribe(() => {
        commit(matcher.get())
      })
    },

    subscribe: store.subscribe,
  }
}
