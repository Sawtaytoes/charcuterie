import { useState } from "react"

import {
  createLinkedIds,
  selectAriaControls,
  selectAriaLabelledBy,
} from "../core/createLinkedIds.ts"
import type { StoreOptions } from "../core/types.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * The `aria-controls` / `aria-labelledby` wiring between a
 * trigger and the thing it opens.
 *
 * A trigger registers its own id and reads `ariaControls`; a
 * target registers its id and reads `ariaLabelledBy`. Both come
 * back `undefined` rather than `""` when there is nothing to
 * point at, because an empty `aria-controls` is itself a
 * violation and React drops an `undefined` attribute.
 *
 * The ids are held as a multiset, which is what fixes the
 * remount race v1 had: React unmounts the old subtree and mounts
 * the new one in an order nobody controls, so a naive
 * implementation ends up pointing `aria-controls` at an element
 * that no longer exists. Nothing renders differently, axe cannot
 * see it, and a screen reader announces nothing.
 */
export const useLinkedIds = (
  options: StoreOptions = {},
) => {
  const [core] = useState(() => createLinkedIds(options))

  const state = useStoreValue(core)

  return {
    ariaControls: selectAriaControls(state),
    ariaLabelledBy: selectAriaLabelledBy(state),
    registerTarget: core.registerTarget,
    registerTrigger: core.registerTrigger,
    targetIds: state.targetIds,
    triggerIds: state.triggerIds,
  }
}
