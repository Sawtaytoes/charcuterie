/**
 * Kind 1 of 5 — **Visibility**. Binary state: a thing is shown or
 * it is not.
 *
 * The simplest kind, and the one the original Charcuterie talk
 * built its thesis on. Modals, drawers, popovers, tooltips,
 * disclosure panels and toasts are all this, and the fleet
 * currently hand-rolls a `useState(false)` for each.
 */

import { createStore as createDefaultStore } from "./createStore.ts"
import type { ReadableCore, StoreOptions } from "./types.ts"

export type VisibilityState = {
  isVisible: boolean
}

export type VisibilityOptions = StoreOptions & {
  isVisible?: boolean
  /**
   * Fires only on an actual change, never on a `show()` that was
   * already shown. A controlled consumer echoes this back down as
   * a prop, and an unconditional callback turns that echo into an
   * infinite loop.
   */
  onChange?: (isVisible: boolean) => void
}

export type Visibility = ReadableCore<VisibilityState> & {
  hide: () => void
  setIsVisible: (isVisible: boolean) => void
  show: () => void
  toggle: () => void
}

export const selectIsVisible = (state: VisibilityState) =>
  state.isVisible

export const createVisibility = ({
  createStore = createDefaultStore,
  isVisible = false,
  onChange,
}: VisibilityOptions = {}): Visibility => {
  const store = createStore<VisibilityState>(
    Object.freeze({ isVisible }),
  )

  const setIsVisible = (isNextVisible: boolean) => {
    if (isNextVisible === store.get().isVisible) {
      return
    }

    store.set(Object.freeze({ isVisible: isNextVisible }))

    onChange?.(isNextVisible)
  }

  return {
    getState: store.get,
    hide: () => {
      setIsVisible(false)
    },
    setIsVisible,
    show: () => {
      setIsVisible(true)
    },
    subscribe: store.subscribe,
    toggle: () => {
      setIsVisible(!store.get().isVisible)
    },
  }
}
