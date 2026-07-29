/**
 * Adapter 2 of 3 — the React 19 binding, in a real browser.
 *
 * The host component renders `null` and does nothing but call the
 * hook. That is the point: this suite is not testing markup, it
 * is testing that the binding creates its core exactly once,
 * subscribes correctly, and re-renders when the core changes.
 *
 * `getState()` is rebuilt from the **last committed render**, so
 * a binding that failed to re-render reads stale and the model
 * catches it on the very next assertion. That is a stronger check
 * than subscribing to the core directly would be, because it
 * cannot pass by accident.
 */

import { act, createElement } from "react"
import { createRoot } from "react-dom/client"

import { useLinkedIds } from "../react/useLinkedIds.ts"
import { useMultiplePicker } from "../react/useMultiplePicker.ts"
import { useRovingFocus } from "../react/useRovingFocus.ts"
import { useSinglePicker } from "../react/useSinglePicker.ts"
import { useStatus } from "../react/useStatus.ts"
import { useVisibility } from "../react/useVisibility.ts"
import { useVisibilityGroup } from "../react/useVisibilityGroup.ts"
import type { Adapter, Release } from "./types.ts"

// React refuses to flush updates outside an act scope without
// this, and says so loudly.
//
// Written through an index signature rather than a named type
// property because the house is/has rule has no carve-out for
// `typeProperty` — deliberately, so that a real boolean cannot
// hide behind "it's an external contract". This one genuinely is
// React's name, and not naming it at all is cheaper than
// arguing.
;(
  globalThis as unknown as Record<string, boolean>
).IS_REACT_ACT_ENVIRONMENT = true

/**
 * Mounts a host calling `useHook`, hands `body` a reader for the
 * latest committed hook result, and unmounts afterwards —
 * including on a thrown assertion, so a failing property does not
 * leave hundreds of roots mounted for the rest of the run.
 */
const renderHook = async <Result>(
  useHook: () => Result,
  body: (getLatest: () => Result) => Promise<void>,
) => {
  const container = document.createElement("div")

  document.body.append(container)

  const root = createRoot(container)

  let latest: Result | undefined

  const Host = () => {
    latest = useHook()

    return null
  }

  await act(async () => {
    root.render(createElement(Host))
  })

  try {
    await body(() => latest as Result)
  } finally {
    await act(async () => {
      root.unmount()
    })

    container.remove()
  }
}

/** Runs one command inside `act` and returns whatever it produced. */
const commit = async <Value>(action: () => Value) => {
  let result: Value | undefined

  await act(async () => {
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

export const createReactAdapter = (): Adapter => ({
  name: "react",

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
