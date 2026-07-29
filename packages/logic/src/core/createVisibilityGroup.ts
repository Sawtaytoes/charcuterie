/**
 * Kind 2 of 5 — **VisibilityGroup**. At most one member visible.
 *
 * This is the distinctive part of Charcuterie's model and the
 * reason the library does not wrap Radix, Base UI, or Ark UI: all
 * three own `open`/`onOpenChange` as the source of truth, so
 * wrapping any of them means the group and the library both
 * believe they hold the answer to "which one is showing".
 *
 * v1's own `NOTES.md` asked for a better name than `OnlyOne`,
 * having already rejected `VisibilityControlProvider` and
 * `SingleVisibilityProvider`. This is the answer: the thing is a
 * group of visibilities with a one-at-a-time rule, and both
 * halves of the name say so. See
 * `docs/decisions/2026-07-29-five-state-kinds.md`.
 *
 * ### Intent, registration, and the state derived from both
 *
 * The one idea shared by this kind, both pickers, and roving
 * focus: the core stores an **intent** — which key the consumer
 * asked for — and derives everything public from that intent plus
 * the set of members currently registered.
 *
 * `visibleKey` is the intent when its member is mounted.
 * `pendingKey` is the intent when it is not. So:
 *
 *  - A controlled `visibleKey` prop read on the first render
 *    survives until children register on *their* first effect,
 *    which is strictly later.
 *  - A member that unmounts and remounts — StrictMode, a route
 *    transition, a virtualised list scrolling it out and back —
 *    comes back visible, because the intent was never discarded.
 *  - "At most one visible" is true by representation rather than
 *    by bookkeeping: there is one intent field.
 *
 * `onChange` fires on intent changes only, never on registration
 * churn. A controlled consumer echoes `onChange` back down as a
 * prop, so reporting an unmount as a user action is how that echo
 * becomes an infinite loop.
 */

import { keepArrayIdentity } from "./arrays.ts"
import { createStore as createDefaultStore } from "./createStore.ts"
import {
  addRegistration,
  emptyRegistrations,
  getRegisteredKeys,
  hasRegistration,
  removeRegistration,
} from "./registrations.ts"
import type {
  ReadableCore,
  StoreOptions,
  Unsubscribe,
} from "./types.ts"

export type VisibilityGroupState<Key> = {
  /** The intent, waiting on its member to mount. */
  pendingKey: Key | null
  /** Mount order. */
  registeredKeys: readonly Key[]
  /** The intent, now that its member has mounted. */
  visibleKey: Key | null
}

export type VisibilityGroupOptions<Key> = StoreOptions & {
  onChange?: (visibleKey: Key | null) => void
  visibleKey?: Key | null
}

export type VisibilityGroup<Key> = ReadableCore<
  VisibilityGroupState<Key>
> & {
  hide: (key: Key) => void
  hideAll: () => void
  register: (key: Key) => Unsubscribe
  show: (key: Key) => void
  toggle: (key: Key) => void
}

export const selectVisibleKey = <Key>(
  state: VisibilityGroupState<Key>,
) => state.visibleKey

export const selectIsKeyVisible = <Key>(
  state: VisibilityGroupState<Key>,
  key: Key,
) => state.visibleKey === key

/**
 * True for a key that has been shown but has not mounted yet. A
 * `Modal` reads this to decide it must render its children at
 * all — otherwise they never register and the intent never
 * resolves.
 */
export const selectIsKeyPending = <Key>(
  state: VisibilityGroupState<Key>,
  key: Key,
) => state.pendingKey === key

export const createVisibilityGroup = <Key = string>({
  createStore = createDefaultStore,
  onChange,
  visibleKey = null,
}: VisibilityGroupOptions<Key> = {}): VisibilityGroup<Key> => {
  // Both kept out of the state object on purpose. Consumers care
  // about the derived view; the intent and the per-key hold
  // counts behind it are this module's business.
  let registrations = emptyRegistrations<Key>()

  let wantedKey = visibleKey

  const store = createStore<VisibilityGroupState<Key>>(
    Object.freeze({
      // Nothing has registered yet, so an initial `visibleKey`
      // starts life pending by definition.
      pendingKey: visibleKey,
      registeredKeys: Object.freeze([] as Key[]),
      visibleKey: null,
    }),
  )

  /** Rebuilds the public state from intent + registrations. */
  const publish = () => {
    const previous = store.get()

    const isMounted =
      wantedKey !== null &&
      hasRegistration(registrations, wantedKey)

    const next: VisibilityGroupState<Key> = {
      pendingKey: isMounted ? null : wantedKey,
      registeredKeys: keepArrayIdentity(
        previous.registeredKeys,
        getRegisteredKeys(registrations),
      ),
      visibleKey: isMounted ? wantedKey : null,
    }

    if (
      previous.pendingKey === next.pendingKey &&
      previous.registeredKeys === next.registeredKeys &&
      previous.visibleKey === next.visibleKey
    ) {
      return
    }

    store.set(Object.freeze(next))
  }

  /** The only path that fires `onChange`. */
  const setWantedKey = (key: Key | null) => {
    if (key === wantedKey) {
      return
    }

    wantedKey = key

    publish()

    onChange?.(store.get().visibleKey)
  }

  const hide = (key: Key) => {
    if (wantedKey === key) {
      setWantedKey(null)
    }
  }

  return {
    getState: store.get,

    hide,

    hideAll: () => {
      setWantedKey(null)
    },

    register: (key) => {
      registrations = addRegistration(registrations, key)

      publish()

      // Cleanup functions run in orders nobody controls, and
      // React calls them twice under StrictMode. Releasing a
      // handle twice must not release someone else's hold.
      let isReleased = false

      return () => {
        if (isReleased) {
          return
        }

        isReleased = true

        registrations = removeRegistration(
          registrations,
          key,
        )

        publish()
      }
    },

    show: (key) => {
      setWantedKey(key)
    },

    subscribe: store.subscribe,

    toggle: (key) => {
      setWantedKey(wantedKey === key ? null : key)
    },
  }
}
