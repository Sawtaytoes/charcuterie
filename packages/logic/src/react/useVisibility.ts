import { useState } from "react"

import type { VisibilityOptions } from "../core/createVisibility.ts"
import { createVisibility } from "../core/createVisibility.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * Kind 1 — a thing is shown or it is not.
 *
 * ### Uncontrolled, on purpose
 *
 * `isVisible` is an **initial** value, not a controlled prop.
 * Charcuterie owns the state; that is the whole thesis, and it is
 * why the library layers on `@floating-ui/react` rather than
 * wrapping Radix or Base UI, all of which own `open` themselves.
 *
 * A parent that needs to push a value calls `setIsVisible`. A
 * parent that needs to observe one passes `onChange`, which fires
 * on real changes only — an unconditional callback plus a parent
 * echoing it back down is an infinite loop, and the fleet has
 * several.
 */
export const useVisibility = ({
  isVisible: isInitiallyVisible = false,
  onChange,
  ...storeOptions
}: VisibilityOptions = {}) => {
  const onChangeRef = useLatestRef(onChange)

  // Lazy `useState` rather than `useRef`: the initialiser runs
  // exactly once even under StrictMode's double render, so the
  // core is never built and thrown away.
  const [core] = useState(() =>
    createVisibility({
      ...storeOptions,
      isVisible: isInitiallyVisible,
      onChange: (isNextVisible) => {
        onChangeRef.current?.(isNextVisible)
      },
    }),
  )

  const { isVisible } = useStoreValue(core)

  return {
    hide: core.hide,
    isVisible,
    setIsVisible: core.setIsVisible,
    show: core.show,
    toggle: core.toggle,
  }
}
