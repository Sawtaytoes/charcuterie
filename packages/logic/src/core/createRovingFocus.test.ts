/**
 * The two roving-focus rules the model suite enforces but does
 * not *explain*: what happens when the focused member disappears,
 * and where focus lands entering a group from outside.
 *
 * Both are ARIA Authoring Practices behaviour rather than
 * implementation detail, so they get named tests a reviewer can
 * read without reconstructing a fast-check counterexample.
 */

import { expect, test } from "vitest"

import {
  createRovingFocus,
  selectTabIndex,
} from "./createRovingFocus.ts"

const withMembers = (...values: string[]) => {
  const focus = createRovingFocus({ isWrapping: true })

  const releases = values.map((value) =>
    focus.register(value),
  )

  return { focus, releases }
}

test("unregistering the focused member moves focus forward, not nowhere", () => {
  const { focus, releases } = withMembers(
    "alpha",
    "beta",
    "gamma",
  )

  focus.setActiveValue("beta")

  releases[1]?.()

  // A keyboard user whose row disappeared expects to land on the
  // next row, not to be thrown out of the group.
  expect(focus.getState().activeValue).toBe("gamma")
  expect(focus.getState().activeIndex).toBe(1)
})

test("unregistering the last member moves focus backward", () => {
  const { focus, releases } = withMembers("alpha", "beta")

  focus.last()

  expect(focus.getState().activeValue).toBe("beta")

  releases[1]?.()

  expect(focus.getState().activeValue).toBe("alpha")
})

test("unregistering the only member leaves nothing active", () => {
  const { focus, releases } = withMembers("alpha")

  focus.first()

  releases[0]?.()

  expect(focus.getState().activeValue).toBeNull()
  expect(focus.getState().activeIndex).toBe(-1)
})

test("arrowing into an untouched group lands at the end you came from", () => {
  const { focus } = withMembers("alpha", "beta", "gamma")

  focus.next()

  expect(focus.getState().activeValue).toBe("alpha")

  const backward = withMembers("alpha", "beta", "gamma")

  backward.focus.previous()

  expect(backward.focus.getState().activeValue).toBe(
    "gamma",
  )
})

test("an untouched group still has exactly one tab stop", () => {
  const { focus } = withMembers("alpha", "beta")

  const state = focus.getState()

  // Nothing active yet, so the first member carries the tab
  // stop — otherwise the group is unreachable by keyboard.
  expect(selectTabIndex(state, "alpha")).toBe(0)
  expect(selectTabIndex(state, "beta")).toBe(-1)
})

test("a group has a tab stop before anything has registered", () => {
  // The first-paint keyboard hole M4 found. Members register from
  // an effect, so on the very first render `activeValue` is null
  // *and* nothing is registered — which scored every member `-1`
  // and left a tab bar Tab could not enter. It lasted one frame
  // only because a re-render always followed.
  const focus = createRovingFocus({ activeValue: "beta" })

  const state = focus.getState()

  expect(state.activeValue).toBeNull()
  expect(state.registeredValues).toEqual([])

  expect(selectTabIndex(state, "beta")).toBe(0)
  expect(selectTabIndex(state, "alpha")).toBe(-1)
})

test("a pending value that never arrives does not strand the group", () => {
  // The other half, and why the branch above is scoped to the
  // empty case: once members exist, a wanted value nobody
  // registered must not take the tab stop away from the members
  // that did.
  const { focus } = withMembers("alpha", "beta")

  focus.setActiveValue("never-mounts")

  const state = focus.getState()

  expect(state.pendingValue).toBe("never-mounts")

  expect(selectTabIndex(state, "alpha")).toBe(0)
  expect(selectTabIndex(state, "beta")).toBe(-1)
})

test("inserting a member above the active one does not move focus", () => {
  const focus = createRovingFocus()

  focus.register("beta")
  focus.setActiveValue("beta")

  expect(focus.getState().activeIndex).toBe(0)

  focus.register("gamma")

  // The index moved because the list grew, but the *focused
  // member* did not change — which is what deriving the index
  // from a stored value buys.
  expect(focus.getState().activeValue).toBe("beta")
  expect(focus.getState().activeIndex).toBe(0)
})

test("clamping instead of wrapping stops at the ends", () => {
  const focus = createRovingFocus({ isWrapping: false })

  focus.register("alpha")
  focus.register("beta")

  focus.last()
  focus.next()

  expect(focus.getState().activeValue).toBe("beta")

  focus.first()
  focus.previous()

  expect(focus.getState().activeValue).toBe("alpha")
})
