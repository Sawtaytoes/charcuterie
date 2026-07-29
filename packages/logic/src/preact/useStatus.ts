// Mirror of the React binding in `../react/useStatus.ts`.
//
// The two are kept honest by `runConformanceSuite`, which runs
// the same model-based commands against both and expects
// identical answers. Preact is a separate file rather than a
// `preact/compat` alias because `castkit/packages/slatecast` has
// 60 KB gz to spend and compat is most of that budget.

import { useState } from "preact/hooks"

import type { StatusOptions } from "../core/createStatus.ts"
import { createStatus } from "../core/createStatus.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * The Status kind — a typed finite state machine.
 *
 * `transitions` is read once, when the core is built. That is
 * deliberate: a machine whose legal edges change underneath a
 * running instance is not a state machine, and every real caller
 * passes a module-level constant anyway.
 *
 * ```ts
 * const { status, transitionTo } = useStatus({
 *   initialState: "connecting",
 *   transitions: connectionTransitions,
 * })
 * ```
 */
export const useStatus = <State extends string>({
  onChange,
  ...statusOptions
}: StatusOptions<State>) => {
  const onChangeRef = useLatestRef(onChange)

  const [core] = useState(() =>
    createStatus<State>({
      ...statusOptions,
      onChange: (nextStatus) => {
        onChangeRef.current?.(nextStatus)
      },
    }),
  )

  const { status } = useStoreValue(core)

  return {
    can: core.can,
    is: core.is,
    reset: core.reset,
    status,
    transitionTo: core.transitionTo,
  }
}
