// Mirror of the React binding in `../react/useVisibilityGroup.ts`.
//
// The two are kept honest by `runConformanceSuite`, which runs
// the same model-based commands against both and expects
// identical answers. Preact is a separate file rather than a
// `preact/compat` alias because `castkit/packages/slatecast` has
// 60 KB gz to spend and compat is most of that budget.

import { useState } from "preact/hooks"

import type { VisibilityGroupOptions } from "../core/createVisibilityGroup.ts"
import { createVisibilityGroup } from "../core/createVisibilityGroup.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * Kind 2 — at most one member visible.
 *
 * The hook a `VisibilityGroupProvider` will call in M3. Members
 * call `register(key)` from an effect and get an unregister back;
 * `pendingKey` is what lets a member registering *after* the
 * `show()` that named it still come up visible.
 */
export const useVisibilityGroup = <Key = string>({
  onChange,
  visibleKey: initialVisibleKey = null,
  ...storeOptions
}: VisibilityGroupOptions<Key> = {}) => {
  const onChangeRef = useLatestRef(onChange)

  const [core] = useState(() =>
    createVisibilityGroup<Key>({
      ...storeOptions,
      onChange: (nextVisibleKey) => {
        onChangeRef.current?.(nextVisibleKey)
      },
      visibleKey: initialVisibleKey,
    }),
  )

  const { pendingKey, registeredKeys, visibleKey } =
    useStoreValue(core)

  return {
    hide: core.hide,
    hideAll: core.hideAll,
    pendingKey,
    register: core.register,
    registeredKeys,
    show: core.show,
    toggle: core.toggle,
    visibleKey,
  }
}
