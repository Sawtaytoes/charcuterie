/**
 * The wiring behind `aria-controls` / `aria-labelledby`.
 *
 * Not a sixth state kind — it holds no user-facing state. It is
 * bookkeeping shared by every kind that has a trigger pointing at
 * a target, and it is here because the plan names it as the one
 * piece of v1 with a known correctness problem:
 *
 * > *AccessibleTrigger/Target — `aria-controls` always names an id
 * > that exists. Catches the register/unregister race
 * > `useLinkedIds` is prone to on remount.*
 *
 * That race is real and it is invisible in a browser: React
 * unmounts the old subtree and mounts the new one in an order
 * nobody controls, so a naive implementation ends up with
 * `aria-controls="popover-3"` pointing at an element that no
 * longer exists. Nothing renders differently. A screen reader
 * announces nothing, and axe cannot see it, because axe checks
 * the rendered DOM at a moment when the id is usually back.
 *
 * The fix is the same multiset every other kind uses: ids are
 * held, not set, so a remount that registers before the old
 * cleanup runs never drops to zero holders.
 */

import { keepArrayIdentity } from "./arrays.ts"
import { createStore as createDefaultStore } from "./createStore.ts"
import {
  addRegistration,
  emptyRegistrations,
  getRegisteredKeys,
  removeRegistration,
} from "./registrations.ts"
import type {
  ReadableCore,
  StoreOptions,
  Unsubscribe,
} from "./types.ts"

export type LinkedIdsState = {
  targetIds: readonly string[]
  triggerIds: readonly string[]
}

export type LinkedIds = ReadableCore<LinkedIdsState> & {
  registerTarget: (id: string) => Unsubscribe
  registerTrigger: (id: string) => Unsubscribe
}

/**
 * `undefined` rather than `""` when there is nothing to point at.
 * An empty `aria-controls` is a violation in its own right, and
 * React drops an `undefined` attribute entirely.
 */
export const selectAriaControls = (
  state: LinkedIdsState,
) =>
  state.targetIds.length > 0
    ? state.targetIds.join(" ")
    : undefined

export const selectAriaLabelledBy = (
  state: LinkedIdsState,
) =>
  state.triggerIds.length > 0
    ? state.triggerIds.join(" ")
    : undefined

export const createLinkedIds = ({
  createStore = createDefaultStore,
}: StoreOptions = {}): LinkedIds => {
  let targets = emptyRegistrations<string>()

  let triggers = emptyRegistrations<string>()

  const store = createStore<LinkedIdsState>(
    Object.freeze({
      targetIds: Object.freeze([] as string[]),
      triggerIds: Object.freeze([] as string[]),
    }),
  )

  const publish = () => {
    const previous = store.get()

    const next: LinkedIdsState = {
      targetIds: keepArrayIdentity(
        previous.targetIds,
        getRegisteredKeys(targets),
      ),
      triggerIds: keepArrayIdentity(
        previous.triggerIds,
        getRegisteredKeys(triggers),
      ),
    }

    if (
      previous.targetIds === next.targetIds &&
      previous.triggerIds === next.triggerIds
    ) {
      return
    }

    store.set(Object.freeze(next))
  }

  const registerTarget = (id: string) => {
    targets = addRegistration(targets, id)

    publish()

    let isReleased = false

    return () => {
      if (isReleased) {
        return
      }

      isReleased = true

      targets = removeRegistration(targets, id)

      publish()
    }
  }

  const registerTrigger = (id: string) => {
    triggers = addRegistration(triggers, id)

    publish()

    let isReleased = false

    return () => {
      if (isReleased) {
        return
      }

      isReleased = true

      triggers = removeRegistration(triggers, id)

      publish()
    }
  }

  return {
    getState: store.get,
    registerTarget,
    registerTrigger,
    subscribe: store.subscribe,
  }
}
