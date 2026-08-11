/**
 * The React binding for a media query, in the same chromium the
 * conformance suite runs in.
 *
 * The core's guarantees are proven in Node
 * (`../core/createMediaQuery.test.ts`); what only a real render can
 * show is the binding's one effect — the matcher subscribed on
 * mount, torn down on unmount, and a flip re-rendering the
 * component rather than merely moving a store nobody reads.
 *
 * `createElement` rather than JSX, because this project has no JSX
 * plugin in its browser config — same reason as
 * `useColorScheme.browser.test.ts`.
 */

import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { expect, test } from "vitest"

import type { MediaQueryMatcher } from "../core/createMediaQuery.ts"
import { useMediaQuery } from "./useMediaQuery.ts"

;(
  globalThis as unknown as Record<string, boolean>
).IS_REACT_ACT_ENVIRONMENT = true

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

const renderHook = async (matcher: MediaQueryMatcher) => {
  const container = document.createElement("div")

  document.body.append(container)

  const root = createRoot(container)

  let renderCount = 0

  let handle: { isMatching: boolean } | null = null

  const Host = () => {
    renderCount += 1

    handle = useMediaQuery({ matcher })

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
    get renderCount() {
      return renderCount
    },
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })

      container.remove()
    },
  }
}

test("reads the matcher on first paint", async () => {
  const { matcher } = makeMatcher(true)

  const view = await renderHook(matcher)

  expect(view.current.isMatching).toBe(true)

  await view.unmount()
})

test("a flip re-renders the component", async () => {
  const controller = makeMatcher(false)

  const view = await renderHook(controller.matcher)

  expect(view.current.isMatching).toBe(false)

  await act(async () => {
    controller.flip(true)
  })

  expect(view.current.isMatching).toBe(true)

  await view.unmount()
})

test("a change event that does not change the answer re-renders nothing", async () => {
  const controller = makeMatcher(false)

  const view = await renderHook(controller.matcher)

  const before = view.renderCount

  await act(async () => {
    controller.flip(false)
  })

  // `matchMedia` fires a `change` per query, so two queries on one
  // breakpoint both wake up — and a `Toolbar` re-measuring on every
  // one of those is the cost this guards.
  expect(view.renderCount).toBe(before)

  await view.unmount()
})

test("the matcher subscription is torn down on unmount", async () => {
  const controller = makeMatcher(false)

  const view = await renderHook(controller.matcher)

  expect(controller.listenerCount).toBe(1)

  await view.unmount()

  expect(controller.listenerCount).toBe(0)
})
