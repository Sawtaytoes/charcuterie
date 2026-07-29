/**
 * Adapter 3 of 3 — the Preact binding, in the same real browser.
 *
 * Identical in shape to the React adapter below the `renderHook`
 * line, which is exactly what the suite is there to check: the
 * two bindings are mirrors, and the only place they genuinely
 * differ is `useStoreValue` — React has `useSyncExternalStore`,
 * `preact/hooks` does not, and routing through `preact/compat` to
 * borrow it is what `slatecast`'s 60 KB gz budget rules out.
 *
 * No `preact/compat` and no aliasing here either: this really is
 * Preact rendering Preact.
 */

import { createElement, render } from "preact"
import { act } from "preact/test-utils"

import { useLinkedIds } from "../preact/useLinkedIds.ts"
import { useMultiplePicker } from "../preact/useMultiplePicker.ts"
import { useRovingFocus } from "../preact/useRovingFocus.ts"
import { useSinglePicker } from "../preact/useSinglePicker.ts"
import { useStatus } from "../preact/useStatus.ts"
import { useVisibility } from "../preact/useVisibility.ts"
import { useVisibilityGroup } from "../preact/useVisibilityGroup.ts"
import type { Adapter, Release } from "./types.ts"

/**
 * Mounts a host calling `useHook`, hands `body` a reader for the
 * latest rendered hook result, and unmounts afterwards —
 * including on a thrown assertion.
 *
 * Preact unmounts by rendering `null` into the same container
 * rather than through a root handle; there is no `createRoot`.
 */
const renderHook = async <Result>(
  useHook: () => Result,
  body: (getLatest: () => Result) => Promise<void>,
) => {
  const container = document.createElement("div")

  document.body.append(container)

  let latest: Result | undefined

  const Host = () => {
    latest = useHook()

    return null
  }

  await act(() => {
    render(createElement(Host, {}), container)
  })

  try {
    await body(() => latest as Result)
  } finally {
    await act(() => {
      render(null, container)
    })

    container.remove()
  }
}

/** Runs one command inside `act` and returns whatever it produced. */
const commit = async <Value>(action: () => Value) => {
  let result: Value | undefined

  await act(() => {
    result = action()
  })

  return result as Value
}

/** Runs one command inside `act`, discarding the result. */
const run = async (action: () => unknown) => {
  await commit(action)
}

const toRelease =
  (unregister: () => void): Release =>
  () =>
    run(unregister)

export const createPreactAdapter = (): Adapter => ({
  name: "preact",

  withLinkedIds: (body) =>
    renderHook(
      () => useLinkedIds(),
      (getLatest) =>
        body({
          getState: () => ({
            targetIds: getLatest().targetIds,
            triggerIds: getLatest().triggerIds,
          }),
          registerTarget: async (id) =>
            toRelease(
              await commit(() =>
                getLatest().registerTarget(id),
              ),
            ),
          registerTrigger: async (id) =>
            toRelease(
              await commit(() =>
                getLatest().registerTrigger(id),
              ),
            ),
        }),
    ),

  withMultiplePicker: (body) =>
    renderHook(
      () => useMultiplePicker<string>(),
      (getLatest) =>
        body({
          clear: () => run(getLatest().clear),
          deselect: (value) =>
            run(() => getLatest().deselect(value)),
          getState: () => ({
            pendingValues: getLatest().pendingValues,
            registeredValues: getLatest().registeredValues,
            selectedValues: getLatest().selectedValues,
          }),
          register: async (value) =>
            toRelease(
              await commit(() =>
                getLatest().register(value),
              ),
            ),
          select: (value) =>
            run(() => getLatest().select(value)),
          toggle: (value) =>
            run(() => getLatest().toggle(value)),
        }),
    ),

  withRovingFocus: ({ isWrapping }, body) =>
    renderHook(
      () => useRovingFocus<string>({ isWrapping }),
      (getLatest) =>
        body({
          first: () => run(getLatest().first),
          getState: () => ({
            activeIndex: getLatest().activeIndex,
            activeValue: getLatest().activeValue,
            pendingValue: getLatest().pendingValue,
            registeredValues: getLatest().registeredValues,
          }),
          last: () => run(getLatest().last),
          next: () => run(getLatest().next),
          previous: () => run(getLatest().previous),
          register: async (value) =>
            toRelease(
              await commit(() =>
                getLatest().register(value),
              ),
            ),
          setActiveValue: (value) =>
            run(() => getLatest().setActiveValue(value)),
        }),
    ),

  withSinglePicker: (body) =>
    renderHook(
      () => useSinglePicker<string>(),
      (getLatest) =>
        body({
          clear: () => run(getLatest().clear),
          getState: () => ({
            pendingValue: getLatest().pendingValue,
            registeredValues: getLatest().registeredValues,
            selectedValue: getLatest().selectedValue,
          }),
          register: async (value) =>
            toRelease(
              await commit(() =>
                getLatest().register(value),
              ),
            ),
          select: (value) =>
            run(() => getLatest().select(value)),
          toggle: (value) =>
            run(() => getLatest().toggle(value)),
        }),
    ),

  withStatus: ({ initialState, transitions }, body) =>
    renderHook(
      () => useStatus({ initialState, transitions }),
      (getLatest) =>
        body({
          can: (status) => getLatest().can(status),
          getState: () => ({ status: getLatest().status }),
          reset: () => run(getLatest().reset),
          transitionTo: (status) =>
            run(() => getLatest().transitionTo(status)),
        }),
    ),

  withVisibility: (body) =>
    renderHook(
      () => useVisibility(),
      (getLatest) =>
        body({
          getState: () => ({
            isVisible: getLatest().isVisible,
          }),
          hide: () => run(getLatest().hide),
          setIsVisible: (isVisible) =>
            run(() => getLatest().setIsVisible(isVisible)),
          show: () => run(getLatest().show),
          toggle: () => run(getLatest().toggle),
        }),
    ),

  withVisibilityGroup: (body) =>
    renderHook(
      () => useVisibilityGroup<string>(),
      (getLatest) =>
        body({
          getState: () => ({
            pendingKey: getLatest().pendingKey,
            registeredKeys: getLatest().registeredKeys,
            visibleKey: getLatest().visibleKey,
          }),
          hide: (key) => run(() => getLatest().hide(key)),
          hideAll: () => run(getLatest().hideAll),
          register: async (key) =>
            toRelease(
              await commit(() => getLatest().register(key)),
            ),
          show: (key) => run(() => getLatest().show(key)),
          toggle: (key) =>
            run(() => getLatest().toggle(key)),
        }),
    ),
})
