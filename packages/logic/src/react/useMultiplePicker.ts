import { useState } from "react"

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
