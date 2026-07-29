/**
 * Kind 4 of 5 — **MultiplePicker**. Set membership.
 *
 * Checkbox groups, multi-select filters, the column toggles in
 * ripdeck's bay table.
 *
 * The plan asks for three invariants, and each one is a
 * representation choice rather than a rule the commands have to
 * remember:
 *
 *  - **Never duplicates** — the intent is a `Set`.
 *  - **Add/remove order-independent** — `selectedValues` is
 *    derived by filtering `registeredValues`, so it comes out in
 *    *mount* order no matter what order the user clicked in.
 *    Selecting a then b and selecting b then a produce arrays
 *    that are equal, not merely equivalent.
 *  - **Remove-then-add round-trips** — unregistering an option
 *    does not touch the intent, so an option that unmounts and
 *    remounts comes back checked.
 *
 * `selectedValues` is the checked-and-mounted subset;
 * `pendingValues` is the checked-but-not-mounted remainder. A form
 * submitting the union of the two is usually what it wants, and
 * `selectFormValues` exists for exactly that.
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

export type MultiplePickerState<Value> = {
  /** Chosen, but their options have not mounted. Selection order. */
  pendingValues: readonly Value[]
  /** Mount order. */
  registeredValues: readonly Value[]
  /** Chosen and mounted, in **mount** order. */
  selectedValues: readonly Value[]
}

export type MultiplePickerOptions<Value> = StoreOptions & {
  onChange?: (selectedValues: readonly Value[]) => void
  selectedValues?: readonly Value[]
}

export type MultiplePicker<Value> = ReadableCore<
  MultiplePickerState<Value>
> & {
  clear: () => void
  deselect: (value: Value) => void
  register: (value: Value) => Unsubscribe
  select: (value: Value) => void
  toggle: (value: Value) => void
}

export const selectSelectedValues = <Value>(
  state: MultiplePickerState<Value>,
) => state.selectedValues

/**
 * Set-membership language rather than `selectIsValueSelected`,
 * which is `SinglePicker`'s. Two selectors one `s` apart in the
 * same barrel is a bug waiting to be autocompleted.
 */
export const selectIsValueIncluded = <Value>(
  state: MultiplePickerState<Value>,
  value: Value,
) =>
  state.selectedValues.includes(value) ||
  state.pendingValues.includes(value)

/**
 * Everything chosen, mounted or not — what a form submits.
 * Mounted values come first, in mount order.
 */
export const selectFormValues = <Value>(
  state: MultiplePickerState<Value>,
) => [...state.selectedValues, ...state.pendingValues]

export const createMultiplePicker = <Value = string>({
  createStore = createDefaultStore,
  onChange,
  selectedValues = [],
}: MultiplePickerOptions<Value> = {}): MultiplePicker<Value> => {
  let registrations = emptyRegistrations<Value>()

  // Insertion-ordered, which is what makes `pendingValues`
  // deterministic. `selectedValues` does not depend on it.
  const wantedValues = new Set<Value>(selectedValues)

  const store = createStore<MultiplePickerState<Value>>(
    Object.freeze({
      pendingValues: Object.freeze([...wantedValues]),
      registeredValues: Object.freeze([] as Value[]),
      selectedValues: Object.freeze([] as Value[]),
    }),
  )

  const publish = () => {
    const previous = store.get()

    const registeredValues =
      getRegisteredKeys(registrations)

    const next: MultiplePickerState<Value> = {
      pendingValues: keepArrayIdentity(
        previous.pendingValues,
        [...wantedValues].filter(
          (value) => !hasRegistration(registrations, value),
        ),
      ),
      registeredValues: keepArrayIdentity(
        previous.registeredValues,
        registeredValues,
      ),
      // Mount order, not click order. This is the whole
      // order-independence property.
      selectedValues: keepArrayIdentity(
        previous.selectedValues,
        registeredValues.filter((value) =>
          wantedValues.has(value),
        ),
      ),
    }

    if (
      previous.pendingValues === next.pendingValues &&
      previous.registeredValues === next.registeredValues &&
      previous.selectedValues === next.selectedValues
    ) {
      return
    }

    store.set(Object.freeze(next))
  }

  /** The only path that fires `onChange`. */
  const commitIntent = (isChanged: boolean) => {
    if (!isChanged) {
      return
    }

    publish()

    onChange?.(store.get().selectedValues)
  }

  const select = (value: Value) => {
    const isChanged = !wantedValues.has(value)

    wantedValues.add(value)

    commitIntent(isChanged)
  }

  const deselect = (value: Value) => {
    commitIntent(wantedValues.delete(value))
  }

  return {
    clear: () => {
      const isChanged = wantedValues.size > 0

      wantedValues.clear()

      commitIntent(isChanged)
    },

    deselect,

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

    select,

    subscribe: store.subscribe,

    toggle: (value) => {
      if (wantedValues.has(value)) {
        deselect(value)
      } else {
        select(value)
      }
    },
  }
}
