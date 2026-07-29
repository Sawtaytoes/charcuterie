// Mirror of the React binding in `../react/useMultiplePicker.ts`.
//
// The two are kept honest by `runConformanceSuite`, which runs
// the same model-based commands against both and expects
// identical answers. Preact is a separate file rather than a
// `preact/compat` alias because `castkit/packages/slatecast` has
// 60 KB gz to spend and compat is most of that budget.

import { useState } from "preact/hooks"

import type { MultiplePickerOptions } from "../core/createMultiplePicker.ts"
import { createMultiplePicker } from "../core/createMultiplePicker.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * Kind 4 — set membership.
 *
 * `selectedValues` comes back in **mount** order rather than
 * click order, so a checkbox group renders its value the same way
 * however the user got there.
 */
export const useMultiplePicker = <Value = string>({
  onChange,
  selectedValues: initialSelectedValues,
  ...storeOptions
}: MultiplePickerOptions<Value> = {}) => {
  const onChangeRef = useLatestRef(onChange)

  const [core] = useState(() =>
    createMultiplePicker<Value>({
      ...storeOptions,
      onChange: (nextSelectedValues) => {
        onChangeRef.current?.(nextSelectedValues)
      },
      selectedValues: initialSelectedValues,
    }),
  )

  const {
    pendingValues,
    registeredValues,
    selectedValues,
  } = useStoreValue(core)

  return {
    clear: core.clear,
    deselect: core.deselect,
    pendingValues,
    register: core.register,
    registeredValues,
    select: core.select,
    selectedValues,
    toggle: core.toggle,
  }
}
