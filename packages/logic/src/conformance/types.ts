/**
 * The adapter seam the conformance suite drives.
 *
 * M2's stated proof is *"suite green on all three adapters"*, and
 * this is what makes one suite able to mean that. A handle is the
 * same commands a core exposes, with two changes:
 *
 *  - **Every command is async.** React 19's `act` returns a
 *    thenable that has to be awaited, so a DOM binding cannot
 *    offer a synchronous command without either warning or
 *    lying about when the render finished. The core adapter
 *    resolves immediately.
 *  - **No `subscribe`.** The suite reads `getState()` after every
 *    command, which is a *stronger* check than subscribing: for
 *    the DOM bindings `getState()` is rebuilt from the last
 *    committed render, so a binding that failed to re-render
 *    reads stale and the model catches it on the very next
 *    assertion.
 *
 * Keys and values are `string` throughout. The cores are generic,
 * but a suite generic over its own value type buys nothing and
 * costs every assertion a type parameter.
 */

import type { LinkedIdsState } from "../core/createLinkedIds.ts"
import type { MultiplePickerState } from "../core/createMultiplePicker.ts"
import type { RovingFocusState } from "../core/createRovingFocus.ts"
import type { SinglePickerState } from "../core/createSinglePicker.ts"
import type {
  StatusState,
  StatusTransitions,
} from "../core/createStatus.ts"
import type { VisibilityState } from "../core/createVisibility.ts"
import type { VisibilityGroupState } from "../core/createVisibilityGroup.ts"

export type Release = () => Promise<void>

export type VisibilityHandle = {
  getState: () => VisibilityState
  hide: () => Promise<void>
  setIsVisible: (isVisible: boolean) => Promise<void>
  show: () => Promise<void>
  toggle: () => Promise<void>
}

export type VisibilityGroupHandle = {
  getState: () => VisibilityGroupState<string>
  hide: (key: string) => Promise<void>
  hideAll: () => Promise<void>
  register: (key: string) => Promise<Release>
  show: (key: string) => Promise<void>
  toggle: (key: string) => Promise<void>
}

export type SinglePickerHandle = {
  clear: () => Promise<void>
  getState: () => SinglePickerState<string>
  register: (value: string) => Promise<Release>
  select: (value: string) => Promise<void>
  toggle: (value: string) => Promise<void>
}

export type MultiplePickerHandle = {
  clear: () => Promise<void>
  deselect: (value: string) => Promise<void>
  getState: () => MultiplePickerState<string>
  register: (value: string) => Promise<Release>
  select: (value: string) => Promise<void>
  toggle: (value: string) => Promise<void>
}

export type RovingFocusHandle = {
  first: () => Promise<void>
  getState: () => RovingFocusState<string>
  last: () => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  register: (value: string) => Promise<Release>
  setActiveValue: (value: string | null) => Promise<void>
}

export type StatusHandle<State extends string> = {
  can: (status: State) => boolean
  getState: () => StatusState<State>
  reset: () => Promise<void>
  transitionTo: (status: State) => Promise<void>
}

export type LinkedIdsHandle = {
  getState: () => LinkedIdsState
  registerTarget: (id: string) => Promise<Release>
  registerTrigger: (id: string) => Promise<Release>
}

/**
 * Each `with*` builds one instance, hands it to `body`, and tears
 * it down afterwards — including on a thrown assertion, so a
 * failing property does not leave a React root mounted for the
 * next thousand runs to trip over.
 */
export type Adapter = {
  name: string
  withLinkedIds: (
    body: (handle: LinkedIdsHandle) => Promise<void>,
  ) => Promise<void>
  withMultiplePicker: (
    body: (handle: MultiplePickerHandle) => Promise<void>,
  ) => Promise<void>
  withRovingFocus: (
    options: { isWrapping: boolean },
    body: (handle: RovingFocusHandle) => Promise<void>,
  ) => Promise<void>
  withSinglePicker: (
    body: (handle: SinglePickerHandle) => Promise<void>,
  ) => Promise<void>
  withStatus: <State extends string>(
    options: {
      initialState: State
      transitions: StatusTransitions<State>
    },
    body: (handle: StatusHandle<State>) => Promise<void>,
  ) => Promise<void>
  withVisibility: (
    body: (handle: VisibilityHandle) => Promise<void>,
  ) => Promise<void>
  withVisibilityGroup: (
    body: (handle: VisibilityGroupHandle) => Promise<void>,
  ) => Promise<void>
}
