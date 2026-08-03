/**
 * The React binding for colour scheme, in the same chromium the
 * conformance suite runs in.
 *
 * The core's own guarantees are proven in Node
 * (`../core/createColorScheme.test.ts`); what only a real render can
 * show is the binding's three effects — the resolver subscription
 * torn down on unmount, `apply` called on first paint and on every
 * resolved-scheme change, and an OS flip re-rendering the component.
 *
 * `createElement` rather than JSX, because this project has no JSX
 * plugin in its browser config — same reason as
 * `useClonedChild.browser.test.ts`.
 */

import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { expect, test, vi } from "vitest"

import type {
  ColorSchemeApplier,
  ColorSchemePersistence,
  ColorSchemeResolver,
  ResolvedColorScheme,
} from "../core/createColorScheme.ts"
import { useColorScheme } from "./useColorScheme.ts"

;(
  globalThis as unknown as Record<string, boolean>
).IS_REACT_ACT_ENVIRONMENT = true

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

  return {
    flip: (next: ResolvedColorScheme) => {
      current = next

      for (const listener of [...listeners]) {
        listener()
      }
    },
    get listenerCount() {
      return listeners.size
    },
    resolver,
  }
}

type Handle = ReturnType<typeof useColorScheme>

const renderHook = async (options: {
  apply?: ColorSchemeApplier
  persistence?: ColorSchemePersistence
  resolver: ColorSchemeResolver
}) => {
  const container = document.createElement("div")

  document.body.append(container)

  const root = createRoot(container)

  let handle: Handle | null = null

  const Host = () => {
    handle = useColorScheme(options)

    return null
  }

  await act(async () => {
    root.render(createElement(Host))
  })

  return {
    get current() {
      if (!handle) {
        throw new Error("hook did not render")
      }

      return handle
    },
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })

      container.remove()
    },
  }
}

test("applies the resolved scheme on first paint", async () => {
  const apply = vi.fn()

  const { resolver } = makeResolver("dark")

  const view = await renderHook({ apply, resolver })

  expect(view.current.mode).toBe("system")
  expect(view.current.resolvedScheme).toBe("dark")
  expect(apply).toHaveBeenLastCalledWith("dark")

  await view.unmount()
})

test("cycle advances mode and re-applies", async () => {
  const apply = vi.fn()

  const { resolver } = makeResolver("dark")

  const view = await renderHook({ apply, resolver })

  await act(async () => {
    view.current.cycle()
  })

  // system → light
  expect(view.current.mode).toBe("light")
  expect(view.current.resolvedScheme).toBe("light")
  expect(apply).toHaveBeenLastCalledWith("light")

  await view.unmount()
})

test("an OS flip re-renders while on system", async () => {
  const apply = vi.fn()

  const controller = makeResolver("light")

  const view = await renderHook({
    apply,
    resolver: controller.resolver,
  })

  expect(view.current.resolvedScheme).toBe("light")

  await act(async () => {
    controller.flip("dark")
  })

  expect(view.current.resolvedScheme).toBe("dark")
  expect(apply).toHaveBeenLastCalledWith("dark")

  await view.unmount()
})

test("the resolver subscription is torn down on unmount", async () => {
  const controller = makeResolver("light")

  const view = await renderHook({
    resolver: controller.resolver,
  })

  expect(controller.listenerCount).toBe(1)

  await view.unmount()

  expect(controller.listenerCount).toBe(0)
})
