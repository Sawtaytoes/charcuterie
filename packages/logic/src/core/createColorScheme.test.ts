/**
 * The ColorScheme core's guarantees, in plain Node.
 *
 * The conformance suite proves the *store* seam interchangeable
 * across kinds; this kind's novelty is the second seam — the
 * `resolver` — and its `mode` vs `resolvedScheme` split, so those
 * are what this file pins. A fake resolver with a manual trigger
 * stands in for `matchMedia`, which is exactly what the browser
 * subpath will inject for real.
 */

import { expect, test, vi } from "vitest"

import type {
  ColorSchemeMode,
  ColorSchemePersistence,
  ColorSchemeResolver,
  ResolvedColorScheme,
} from "./createColorScheme.ts"
import {
  createColorScheme,
  DEFAULT_COLOR_SCHEME_ORDER,
  nextColorSchemeMode,
} from "./createColorScheme.ts"

const makeResolver = (initial: ResolvedColorScheme) => {
  let current = initial

  const listeners = new Set<() => void>()

  const resolver: ColorSchemeResolver = {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }

  const flip = (next: ResolvedColorScheme) => {
    current = next

    for (const listener of [...listeners]) {
      listener()
    }
  }

  return { flip, resolver, get listenerCount() {
    return listeners.size
  } }
}

const makePersistence = (stored: ColorSchemeMode | null = null) => {
  let value = stored

  const persistence: ColorSchemePersistence = {
    read: () => value,
    write: (mode) => {
      value = mode
    },
  }

  return { persistence, get value() {
    return value
  } }
}

test("a fresh core with no saved choice starts on system", () => {
  const core = createColorScheme()

  expect(core.getState().mode).toBe("system")
})

test("system resolves to the resolver's answer", () => {
  const dark = createColorScheme({
    resolver: makeResolver("dark").resolver,
  })

  expect(dark.getState()).toEqual({
    mode: "system",
    resolvedScheme: "dark",
  })

  const light = createColorScheme({
    resolver: makeResolver("light").resolver,
  })

  expect(light.getState().resolvedScheme).toBe("light")
})

test("with no resolver, system falls back to light", () => {
  const core = createColorScheme()

  expect(core.getState().resolvedScheme).toBe("light")
})

test("a concrete mode ignores the resolver", () => {
  const { flip, resolver } = makeResolver("dark")

  const core = createColorScheme({
    mode: "light",
    resolver,
  })

  core.start()

  expect(core.getState().resolvedScheme).toBe("light")

  flip("dark")

  // Pinned to light — the OS flip is a no-op while not on system.
  expect(core.getState().resolvedScheme).toBe("light")
})

test("cycle order is light → dark → system → light", () => {
  const core = createColorScheme({ mode: "light" })

  expect(core.cycle()).toBe("dark")
  expect(core.cycle()).toBe("system")
  expect(core.cycle()).toBe("light")
})

test("nextColorSchemeMode wraps and tolerates an unknown current", () => {
  expect(nextColorSchemeMode("light")).toBe("dark")
  expect(nextColorSchemeMode("system")).toBe("light")
  expect([...DEFAULT_COLOR_SCHEME_ORDER]).toEqual([
    "light",
    "dark",
    "system",
  ])
})

test("setMode persists the choice and fires onChange once", () => {
  const onChange = vi.fn()

  const store = makePersistence()

  const core = createColorScheme({
    mode: "system",
    onChange,
    persistence: store.persistence,
  })

  core.setMode("dark")

  expect(core.getState().mode).toBe("dark")
  expect(store.value).toBe("dark")
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenLastCalledWith({
    mode: "dark",
    resolvedScheme: "dark",
  })

  // A no-op set does nothing — the echo-loop guard.
  core.setMode("dark")
  expect(onChange).toHaveBeenCalledTimes(1)
})

test("initial mode is read from persistence when present", () => {
  const { persistence } = makePersistence("dark")

  const core = createColorScheme({
    mode: "system",
    persistence,
  })

  expect(core.getState().mode).toBe("dark")
})

test("an OS flip re-resolves only while on system, and fires onChange", () => {
  const onChange = vi.fn()

  const { flip, resolver } = makeResolver("light")

  const core = createColorScheme({ onChange, resolver })

  const stop = core.start()

  expect(core.getState().resolvedScheme).toBe("light")

  flip("dark")

  expect(core.getState().resolvedScheme).toBe("dark")
  expect(onChange).toHaveBeenCalledTimes(1)

  // Same value again — no notification.
  flip("dark")
  expect(onChange).toHaveBeenCalledTimes(1)

  stop()
})

test("start unsubscribes on stop", () => {
  const controller = makeResolver("light")

  const core = createColorScheme({
    resolver: controller.resolver,
  })

  const stop = core.start()

  expect(controller.listenerCount).toBe(1)

  stop()

  expect(controller.listenerCount).toBe(0)
})

test("start reconciles a flip that happened before it was called", () => {
  const { flip, resolver } = makeResolver("light")

  const core = createColorScheme({ resolver })

  // Flip before start(): the constructor saw light.
  flip("dark")

  expect(core.getState().resolvedScheme).toBe("light")

  core.start()

  // start() re-reads and reconciles.
  expect(core.getState().resolvedScheme).toBe("dark")
})
