/**
 * Kind 5 of 5 — **RovingFocus**. Which member is tabbable.
 *
 * A new first-class kind, and the smaller of the two additions to
 * the original three-kind thesis. Active-descendant is neither
 * visibility nor selection: arrowing down a listbox moves focus
 * through options **without choosing any of them**, and only
 * Enter or Space commits. Modelled as a `SinglePicker` — which is
 * where the three-kind model would have to put it — every arrow
 * key would fire the form's `onChange`.
 *
 * Focus and selection being independent is not a detail; it is
 * the difference between a listbox that announces correctly and
 * one that submits a form on every keystroke. The conformance
 * suite proves it by composing this kind with `SinglePicker` and
 * asserting that neither moves the other.
 *
 * ### Staying in range
 *
 * `activeIndex` is **derived**, never stored. Storing an index
 * means every registration and unregistration has to fix it up,
 * and the plan's invariant — in range across arbitrary
 * registration churn — becomes a rule six commands must
 * remember. Deriving it from a stored *value* makes the invariant
 * unbreakable, and has the better behaviour for free: inserting
 * an item above the active one does not move focus.
 *
 * One asymmetry, deliberate. Registration is forgiving in both
 * directions but for different reasons:
 *
 *  - Setting an active value **before** its item mounts parks it
 *    as pending, same as every other kind.
 *  - The active item **unmounting** moves focus to its
 *    neighbour rather than parking. That is what a keyboard user
 *    expects when the row they were on disappears, and it is why
 *    this kind does not simply reuse the picker's mechanism
 *    wholesale.
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

export type RovingFocusState<Value> = {
  /** `-1` when nothing is active, otherwise always in range. */
  activeIndex: number
  activeValue: Value | null
  /** Active as soon as it registers. */
  pendingValue: Value | null
  /** Mount order — the order the arrow keys travel. */
  registeredValues: readonly Value[]
}

export type RovingFocusOptions<Value> = StoreOptions & {
  activeValue?: Value | null
  /**
   * Arrowing past the end returns to the start. ARIA Authoring
   * Practices leaves this to the pattern: menus and tab lists
   * wrap, tree grids do not.
   */
  isWrapping?: boolean
  onChange?: (activeValue: Value | null) => void
}

export type RovingFocus<Value> = ReadableCore<
  RovingFocusState<Value>
> & {
  first: () => void
  last: () => void
  next: () => void
  previous: () => void
  register: (value: Value) => Unsubscribe
  setActiveValue: (value: Value | null) => void
}

export const selectActiveValue = <Value>(
  state: RovingFocusState<Value>,
) => state.activeValue

export const selectActiveIndex = <Value>(
  state: RovingFocusState<Value>,
) => state.activeIndex

/**
 * The roving-tabindex rule itself: exactly one member of the
 * group is in the tab order, and it is the active one. With
 * nothing active the first member takes the tab stop, so the
 * group is still reachable by keyboard.
 */
export const selectTabIndex = <Value>(
  state: RovingFocusState<Value>,
  value: Value,
) => {
  if (state.activeValue !== null) {
    return state.activeValue === value ? 0 : -1
  }

  return state.registeredValues[0] === value ? 0 : -1
}

export const createRovingFocus = <Value = string>({
  activeValue = null,
  createStore = createDefaultStore,
  isWrapping = true,
  onChange,
}: RovingFocusOptions<Value> = {}): RovingFocus<Value> => {
  let registrations = emptyRegistrations<Value>()

  let wantedValue = activeValue

  const store = createStore<RovingFocusState<Value>>(
    Object.freeze({
      activeIndex: -1,
      activeValue: null,
      pendingValue: activeValue,
      registeredValues: Object.freeze([] as Value[]),
    }),
  )

  const publish = () => {
    const previous = store.get()

    const registeredValues =
      getRegisteredKeys(registrations)

    const isMounted =
      wantedValue !== null &&
      hasRegistration(registrations, wantedValue)

    const next: RovingFocusState<Value> = {
      activeIndex: isMounted
        ? registeredValues.indexOf(wantedValue as Value)
        : -1,
      activeValue: isMounted ? wantedValue : null,
      pendingValue: isMounted ? null : wantedValue,
      registeredValues: keepArrayIdentity(
        previous.registeredValues,
        registeredValues,
      ),
    }

    if (
      previous.activeIndex === next.activeIndex &&
      previous.activeValue === next.activeValue &&
      previous.pendingValue === next.pendingValue &&
      previous.registeredValues === next.registeredValues
    ) {
      return
    }

    store.set(Object.freeze(next))
  }

  /** The only path that fires `onChange`. */
  const setWantedValue = (value: Value | null) => {
    if (value === wantedValue) {
      return
    }

    wantedValue = value

    publish()

    onChange?.(store.get().activeValue)
  }

  /**
   * Steps by mount-order position. With nothing active, a
   * forward step lands on the first member and a backward step
   * on the last — which is what "arrow into a group from
   * outside" should do in either direction.
   */
  const step = (offset: number) => {
    const { activeIndex, registeredValues } = store.get()

    if (registeredValues.length === 0) {
      return
    }

    if (activeIndex === -1) {
      setWantedValue(
        offset > 0
          ? (registeredValues[0] as Value)
          : (registeredValues[
              registeredValues.length - 1
            ] as Value),
      )

      return
    }

    const rawIndex = activeIndex + offset

    const nextIndex = isWrapping
      ? (rawIndex + registeredValues.length) %
        registeredValues.length
      : Math.min(
          Math.max(rawIndex, 0),
          registeredValues.length - 1,
        )

    setWantedValue(registeredValues[nextIndex] as Value)
  }

  return {
    first: () => {
      const { registeredValues } = store.get()

      if (registeredValues.length > 0) {
        setWantedValue(registeredValues[0] as Value)
      }
    },

    getState: store.get,

    last: () => {
      const { registeredValues } = store.get()

      if (registeredValues.length > 0) {
        setWantedValue(
          registeredValues[
            registeredValues.length - 1
          ] as Value,
        )
      }
    },

    next: () => {
      step(1)
    },

    previous: () => {
      step(-1)
    },

    register: (value) => {
      registrations = addRegistration(registrations, value)

      publish()

      let isReleased = false

      return () => {
        if (isReleased) {
          return
        }

        isReleased = true

        // Worked out *before* the removal, because it is the
        // pre-removal ordering that says who the neighbour was.
        const {
          activeValue: activeBefore,
          registeredValues,
        } = store.get()

        const isActive =
          activeBefore !== null && activeBefore === value

        registrations = removeRegistration(
          registrations,
          value,
        )

        // Another holder is still mounted — a StrictMode double
        // mount, or a trigger and target sharing a value — so
        // nothing has actually disappeared.
        if (
          !isActive ||
          hasRegistration(registrations, value)
        ) {
          publish()

          return
        }

        const removedIndex = registeredValues.indexOf(value)

        const survivors = registeredValues.filter(
          (registeredValue) => registeredValue !== value,
        )

        // Forward first, then backward, then nothing left.
        setWantedValue(
          survivors[removedIndex] ??
            survivors[removedIndex - 1] ??
            null,
        )

        publish()
      }
    },

    setActiveValue: setWantedValue,

    subscribe: store.subscribe,
  }
}
