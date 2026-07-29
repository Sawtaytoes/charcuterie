/**
 * The store seam, plus the identity contract every core depends
 * on.
 *
 * Identity is tested here rather than in the conformance suite
 * because it is a **core-only** property: the DOM adapters
 * rebuild their state object from the last committed render, so
 * `toBe` there would compare two fresh objects and always fail.
 * It still has to be right, because `useSyncExternalStore`
 * re-renders on identity — a core that returned a fresh-but-equal
 * array on every read would re-render a whole listbox whenever
 * anything unrelated changed, and in the worst case loop.
 */

import { expect, test } from "vitest"

import { createMultiplePicker } from "./createMultiplePicker.ts"
import { createStore } from "./createStore.ts"
import { createVisibilityGroup } from "./createVisibilityGroup.ts"

test("a set to an equal value notifies nobody", () => {
  const store = createStore("idle")

  let notificationCount = 0

  store.subscribe(() => {
    notificationCount += 1
  })

  store.set("idle")

  expect(notificationCount).toBe(0)

  store.set("busy")

  expect(notificationCount).toBe(1)
})

test("a listener that unsubscribes itself does not break the notification loop", () => {
  const store = createStore(0)

  const seen: string[] = []

  const unsubscribeFirst = store.subscribe(() => {
    seen.push("first")

    // Every `useEffect` cleanup does exactly this. Iterating the
    // live set instead of a copy would skip `second`.
    unsubscribeFirst()
  })

  store.subscribe(() => {
    seen.push("second")
  })

  store.set(1)

  expect(seen).toEqual(["first", "second"])
})

test("a command that changes nothing leaves the state object identical", () => {
  const group = createVisibilityGroup()

  group.register("alpha")

  const before = group.getState()

  // Hiding something that was never shown.
  group.hide("beta")

  expect(group.getState()).toBe(before)

  group.show("alpha")

  expect(group.getState()).not.toBe(before)
})

test("derived arrays keep their identity when their contents do not", () => {
  const picker = createMultiplePicker()

  picker.register("alpha")
  picker.register("beta")

  picker.select("alpha")

  const { registeredValues, selectedValues } =
    picker.getState()

  // Selecting a second value must not hand back a new
  // `registeredValues` — nothing about the registrations moved.
  picker.select("beta")

  expect(picker.getState().registeredValues).toBe(
    registeredValues,
  )
  expect(picker.getState().selectedValues).not.toBe(
    selectedValues,
  )
})
