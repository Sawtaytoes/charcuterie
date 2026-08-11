/**
 * The MediaQuery core's guarantees, in plain Node.
 *
 * It is not in the conformance suite for the same reason
 * `createColorScheme` is not: that suite drives the *registering*
 * kinds through one adapter seam, and this core has no commands to
 * drive — its only mover is the injected matcher. So the matcher is
 * what this file pins, with a fake that flips by hand exactly where
 * `matchMedia` will be injected for real.
 */

import { expect, test, vi } from "vitest"

import type { MediaQueryMatcher } from "./createMediaQuery.ts"
import { createMediaQuery } from "./createMediaQuery.ts"

const makeMatcher = (isInitiallyMatching: boolean) => {
  let isMatching = isInitiallyMatching

  const listeners = new Set<() => void>()

  const matcher: MediaQueryMatcher = {
    get: () => isMatching,
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }

  return {
    flip: (isNextMatching: boolean) => {
      isMatching = isNextMatching

      for (const listener of [...listeners]) {
        listener()
      }
    },
    get listenerCount() {
      return listeners.size
    },
    matcher,
  }
}

test("the matcher decides the initial answer, not the option", () => {
  const { matcher } = makeMatcher(true)

  const query = createMediaQuery({
    isMatching: false,
    matcher,
  })

  expect(query.getState()).toEqual({ isMatching: true })
})

test("with no matcher the initial option stands, and start is inert", () => {
  const query = createMediaQuery({ isMatching: true })

  expect(query.getState()).toEqual({ isMatching: true })

  // No throw, and nothing to clean up — the shape a server render
  // and a non-browser host both take.
  query.start()()

  expect(query.getState()).toEqual({ isMatching: true })
})

test("start reconciles a flip that happened before it ran", () => {
  const { flip, matcher } = makeMatcher(false)

  const onChange = vi.fn()

  const query = createMediaQuery({ matcher, onChange })

  // A resize between construction and the binding's effect. Without
  // the re-read in `start` this answer would be stale for good.
  flip(true)

  query.start()

  expect(query.getState()).toEqual({ isMatching: true })

  expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
})

test("a flip while listening changes the state and fires onChange once", () => {
  const { flip, matcher } = makeMatcher(false)

  const onChange = vi.fn()

  const query = createMediaQuery({ matcher, onChange })

  query.start()

  flip(true)

  expect(query.getState()).toEqual({ isMatching: true })

  // A `change` event that does not change the answer — `matchMedia`
  // fires one per query, and two queries on one breakpoint both
  // wake up. It must not re-render every consumer.
  flip(true)

  expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
})

test("stopping removes the listener", () => {
  const store = makeMatcher(false)

  const query = createMediaQuery({ matcher: store.matcher })

  const stop = query.start()

  expect(store.listenerCount).toBe(1)

  stop()

  expect(store.listenerCount).toBe(0)
})

test("subscribers see the frozen state change identity only on a real change", () => {
  const { flip, matcher } = makeMatcher(false)

  const query = createMediaQuery({ matcher })

  query.start()

  const before = query.getState()

  flip(false)

  // Identity is what `useSyncExternalStore` re-renders on.
  expect(query.getState()).toBe(before)

  flip(true)

  expect(query.getState()).not.toBe(before)
})
