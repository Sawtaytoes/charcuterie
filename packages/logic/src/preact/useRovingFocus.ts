// Mirror of the React binding in `../react/useRovingFocus.ts`.
//
// The two are kept honest by `runConformanceSuite`, which runs
// the same model-based commands against both and expects
// identical answers. Preact is a separate file rather than a
// `preact/compat` alias because `castkit/packages/slatecast` has
// 60 KB gz to spend and compat is most of that budget.

import { useState } from "preact/hooks"

import type { RovingFocusOptions } from "../core/createRovingFocus.ts"
import { createRovingFocus } from "../core/createRovingFocus.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * Kind 5 — which member is tabbable.
 *
 * Pair with `selectTabIndex` to implement the roving-tabindex
 * pattern: exactly one member of the group carries `tabIndex={0}`
 * and the rest carry `-1`, so Tab enters and leaves the group
 * once while the arrow keys move within it.
 *
 * Moving focus deliberately does **not** move selection. Compose
 * with `useSinglePicker` when Enter should choose the focused
 * option — the conformance suite asserts the two never disturb
 * each other.
 */
export const useRovingFocus = <Value = string>({
  activeValue: initialActiveValue = null,
  onChange,
  ...rovingOptions
}: RovingFocusOptions<Value> = {}) => {
  const onChangeRef = useLatestRef(onChange)

  const [core] = useState(() =>
    createRovingFocus<Value>({
      ...rovingOptions,
      activeValue: initialActiveValue,
      onChange: (nextActiveValue) => {
        onChangeRef.current?.(nextActiveValue)
      },
    }),
  )

  const {
    activeIndex,
    activeValue,
    pendingValue,
    registeredValues,
  } = useStoreValue(core)

  return {
    activeIndex,
    activeValue,
    first: core.first,
    last: core.last,
    next: core.next,
    pendingValue,
    previous: core.previous,
    register: core.register,
    registeredValues,
    setActiveValue: core.setActiveValue,
  }
}
