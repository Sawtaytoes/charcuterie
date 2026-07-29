/**
 * Kind 3 of 5 — **SinglePicker**. One choice out of many.
 *
 * Radio groups, `<select>`-alikes, listboxes, segmented controls,
 * the profile switcher in plex-channels. Same intent-plus-
 * registration mechanism as `createVisibilityGroup`, which is not
 * a coincidence — "which one is showing" and "which one is
 * chosen" are the same shape, and the fleet hand-rolls both.
 *
 * The plan's invariant is that `selectedValue` is always a
 * registered option or `null`. That holds here by derivation
 * rather than by validation: the intent is stored separately and
 * `selectedValue` is only ever computed from an intent whose
 * option is mounted. A `select()` of a value whose option has not
 * rendered yet parks in `pendingValue` instead of being dropped,
 * which is what makes a form's initial value survive its options
 * mounting a tick later.
 *
 * Selection is *not* focus. Arrowing through a listbox moves
 * focus without choosing anything — that is `createRovingFocus`,
 * the fourth kind, and forcing it into this one is exactly the
 * modelling error the five-kinds ADR exists to avoid.
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

export type SinglePickerState<Value> = {
  /** The intent, waiting on its option to mount. */
  pendingValue: Value | null
  /** Mount order. */
  registeredValues: readonly Value[]
  /** Always `null` or a registered value. */
  selectedValue: Value | null
}

export type SinglePickerOptions<Value> = StoreOptions & {
  onChange?: (selectedValue: Value | null) => void
  selectedValue?: Value | null
}

export type SinglePicker<Value> = ReadableCore<
  SinglePickerState<Value>
> & {
  clear: () => void
  register: (value: Value) => Unsubscribe
  select: (value: Value) => void
  toggle: (value: Value) => void
}

export const selectSelectedValue = <Value>(
  state: SinglePickerState<Value>,
) => state.selectedValue

export const selectIsValueSelected = <Value>(
  state: SinglePickerState<Value>,
  value: Value,
) => state.selectedValue === value

export const createSinglePicker = <Value = string>({
  createStore = createDefaultStore,
  onChange,
  selectedValue = null,
}: SinglePickerOptions<Value> = {}): SinglePicker<Value> => {
  let registrations = emptyRegistrations<Value>()

  let wantedValue = selectedValue

  const store = createStore<SinglePickerState<Value>>(
    Object.freeze({
      pendingValue: selectedValue,
      registeredValues: Object.freeze([] as Value[]),
      selectedValue: null,
    }),
  )

  const publish = () => {
    const previous = store.get()

    const isMounted =
      wantedValue !== null &&
      hasRegistration(registrations, wantedValue)

    const next: SinglePickerState<Value> = {
      pendingValue: isMounted ? null : wantedValue,
      registeredValues: keepArrayIdentity(
        previous.registeredValues,
        getRegisteredKeys(registrations),
      ),
      selectedValue: isMounted ? wantedValue : null,
    }

    if (
      previous.pendingValue === next.pendingValue &&
      previous.registeredValues === next.registeredValues &&
      previous.selectedValue === next.selectedValue
    ) {
      return
    }

    store.set(Object.freeze(next))
  }

  /**
   * The only path that fires `onChange`, and the reason
   * `select(value)` twice is idempotent rather than merely
   * harmless.
   */
  const setWantedValue = (value: Value | null) => {
    if (value === wantedValue) {
      return
    }

    wantedValue = value

    publish()

    onChange?.(store.get().selectedValue)
  }

  return {
    clear: () => {
      setWantedValue(null)
    },

    getState: store.get,

    register: (value) => {
      registrations = addRegistration(registrations, value)

      publish()

      let isReleased = false

      return () => {
        if (isReleased) {
          return
        }

        isReleased = true

        registrations = removeRegistration(
          registrations,
          value,
        )

        publish()
      }
    },

    select: (value) => {
      setWantedValue(value)
    },

    subscribe: store.subscribe,

    /**
     * Deselects when already chosen. Native radios cannot do
     * this, which is why it is a separate command rather than
     * `select`'s behaviour — a `Radio` never calls it, a
     * segmented filter control does.
     */
    toggle: (value) => {
      setWantedValue(wantedValue === value ? null : value)
    },
  }
}
