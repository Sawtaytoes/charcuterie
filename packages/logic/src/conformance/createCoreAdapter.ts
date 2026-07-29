/**
 * The framework-free adapter — and, because it takes a
 * `createStore`, also the Jotai and signals adapters.
 *
 * That reuse is the store seam paying for itself: proving
 * `@charcuterie/logic/jotai` correct costs one line at the call
 * site rather than a suite of its own.
 */

import { createLinkedIds } from "../core/createLinkedIds.ts"
import { createMultiplePicker } from "../core/createMultiplePicker.ts"
import { createRovingFocus } from "../core/createRovingFocus.ts"
import { createSinglePicker } from "../core/createSinglePicker.ts"
import { createStatus } from "../core/createStatus.ts"
import { createVisibility } from "../core/createVisibility.ts"
import { createVisibilityGroup } from "../core/createVisibilityGroup.ts"
import type { CreateCharcuterieStore } from "../core/types.ts"
import type { Adapter, Release } from "./types.ts"

/** Wraps a core's synchronous unregister as the async handle. */
const toRelease =
  (unregister: () => void): Release =>
  () => {
    unregister()

    return Promise.resolve()
  }

export const createCoreAdapter = ({
  createStore,
  name,
}: {
  createStore?: CreateCharcuterieStore
  name: string
}): Adapter => ({
  name,

  withLinkedIds: (body) => {
    const core = createLinkedIds({ createStore })

    return body({
      getState: core.getState,
      registerTarget: (id) =>
        Promise.resolve(toRelease(core.registerTarget(id))),
      registerTrigger: (id) =>
        Promise.resolve(
          toRelease(core.registerTrigger(id)),
        ),
    })
  },

  withMultiplePicker: (body) => {
    const core = createMultiplePicker<string>({
      createStore,
    })

    return body({
      clear: async () => core.clear(),
      deselect: async (value) => core.deselect(value),
      getState: core.getState,
      register: (value) =>
        Promise.resolve(toRelease(core.register(value))),
      select: async (value) => core.select(value),
      toggle: async (value) => core.toggle(value),
    })
  },

  withRovingFocus: ({ isWrapping }, body) => {
    const core = createRovingFocus<string>({
      createStore,
      isWrapping,
    })

    return body({
      first: async () => core.first(),
      getState: core.getState,
      last: async () => core.last(),
      next: async () => core.next(),
      previous: async () => core.previous(),
      register: (value) =>
        Promise.resolve(toRelease(core.register(value))),
      setActiveValue: async (value) =>
        core.setActiveValue(value),
    })
  },

  withSinglePicker: (body) => {
    const core = createSinglePicker<string>({ createStore })

    return body({
      clear: async () => core.clear(),
      getState: core.getState,
      register: (value) =>
        Promise.resolve(toRelease(core.register(value))),
      select: async (value) => core.select(value),
      toggle: async (value) => core.toggle(value),
    })
  },

  withStatus: ({ initialState, transitions }, body) => {
    const core = createStatus({
      createStore,
      initialState,
      transitions,
    })

    return body({
      can: core.can,
      getState: core.getState,
      reset: async () => core.reset(),
      transitionTo: async (status) =>
        core.transitionTo(status),
    })
  },

  withVisibility: (body) => {
    const core = createVisibility({ createStore })

    return body({
      getState: core.getState,
      hide: async () => core.hide(),
      setIsVisible: async (isVisible) =>
        core.setIsVisible(isVisible),
      show: async () => core.show(),
      toggle: async () => core.toggle(),
    })
  },

  withVisibilityGroup: (body) => {
    const core = createVisibilityGroup<string>({
      createStore,
    })

    return body({
      getState: core.getState,
      hide: async (key) => core.hide(key),
      hideAll: async () => core.hideAll(),
      register: (key) =>
        Promise.resolve(toRelease(core.register(key))),
      show: async (key) => core.show(key),
      toggle: async (key) => core.toggle(key),
    })
  },
})
