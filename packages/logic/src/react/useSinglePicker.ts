import { useState } from "react"

import type { SinglePickerOptions } from "../core/createSinglePicker.ts"
import { createSinglePicker } from "../core/createSinglePicker.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * Kind 3 — one choice out of many.
 *
 * `pendingValue` is what makes a form's initial value survive its
 * options mounting a tick later, and what makes a remounted
 * option come back chosen.
 */
export const useSinglePicker = <Value = string>({
  onChange,
  selectedValue: initialSelectedValue = null,
  ...storeOptions
}: SinglePickerOptions<Value> = {}) => {
  const onChangeRef = useLatestRef(onChange)

  const [core] = useState(() =>
    createSinglePicker<Value>({
      ...storeOptions,
      onChange: (nextSelectedValue) => {
        onChangeRef.current?.(nextSelectedValue)
      },
      selectedValue: initialSelectedValue,
    }),
  )

  const { pendingValue, registeredValues, selectedValue } =
    useStoreValue(core)

  return {
    clear: core.clear,
    pendingValue,
    register: core.register,
    registeredValues,
    select: core.select,
    selectedValue,
    toggle: core.toggle,
  }
}
