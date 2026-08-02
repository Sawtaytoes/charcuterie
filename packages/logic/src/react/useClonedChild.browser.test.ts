/**
 * What a clone owes the element it clones — the React binding.
 *
 * `cloneElement` replaces, key by key. That is right for an `id` and
 * an `aria-*`, and it is destructive for the two props that are not
 * values: a `ref` is a subscription and an `on*` is a listener. The
 * defect this file pins down had **no symptom at all** — no throw,
 * no warning, no failing assertion anywhere in the suite; a ref that
 * simply stayed `null` and a handler that simply never ran.
 *
 * `createElement` rather than JSX, because this project has no JSX
 * plugin (`vitest.browser.config.ts` says why) — and it suits: the
 * subject is what `cloneElement` does to a props object, so writing
 * the props objects out is the honest spelling.
 */

import type { ReactElement } from "react"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { expect, test } from "vitest"

import { useClonedChild } from "./useClonedChild.ts"

;(
  globalThis as unknown as Record<string, boolean>
).IS_REACT_ACT_ENVIRONMENT = true

/**
 * Mounts a slot — a component that clones `child` and injects
 * `injectedProps` — and hands back the mounted DOM plus an unmount.
 */
const renderSlot = async (
  child: ReactElement,
  injectedProps: Record<string, unknown>,
) => {
  const container = document.createElement("div")

  document.body.append(container)

  const root = createRoot(container)

  const Slot = () => useClonedChild(child, injectedProps)

  await act(async () => {
    root.render(createElement(Slot))
  })

  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })

      container.remove()
    },
  }
}

test("the slot's ref does not replace the child's own", async () => {
  const seenByChild: (Element | null)[] = []

  const seenBySlot: (Element | null)[] = []

  const { container, unmount } = await renderSlot(
    createElement("button", {
      ref: (node: Element | null) => {
        seenByChild.push(node)
      },
      type: "button",
    }),
    {
      ref: (node: Element | null) => {
        seenBySlot.push(node)
      },
    },
  )

  const button = container.querySelector("button")

  // Both refs, the same node. Before the fix `seenByChild` was
  // empty — the caller's ref was never called at all, and nothing
  // anywhere said so.
  expect(seenByChild).toEqual([button])

  expect(seenBySlot).toEqual([button])

  await unmount()

  // And both are told when it goes away, or the second one is a
  // subscription with no way to end.
  expect(seenByChild).toEqual([button, null])

  expect(seenBySlot).toEqual([button, null])
})

test("an object ref composes with a callback ref", async () => {
  const childRef: { current: Element | null } = {
    current: null,
  }

  const seenBySlot: (Element | null)[] = []

  const { container, unmount } = await renderSlot(
    createElement("button", {
      ref: childRef,
      type: "button",
    }),
    {
      ref: (node: Element | null) => {
        seenBySlot.push(node)
      },
    },
  )

  expect(childRef.current).toBe(
    container.querySelector("button"),
  )

  expect(seenBySlot).toHaveLength(1)

  await unmount()

  expect(childRef.current).toBeNull()
})

test("both handlers run, the child's first", async () => {
  const calls: string[] = []

  const { container, unmount } = await renderSlot(
    createElement("button", {
      onClick: () => {
        calls.push("child")
      },
      type: "button",
    }),
    {
      onClick: () => {
        calls.push("slot")
      },
    },
  )

  await act(async () => {
    container.querySelector("button")?.click()
  })

  // The child's handler is the one the caller wrote on the element
  // they can see, so it runs first — a wrapper reading
  // `defaultPrevented` needs it to have already run.
  expect(calls).toEqual(["child", "slot"])

  await unmount()
})

test("a value the slot injects still wins", async () => {
  // The other half of the contract, and the reason this is a merge
  // rather than a swap of precedence: for everything that *is* a
  // value, the slot is the later writer and the later writer wins.
  // `Field`'s `id` is the whole point of `Field`.
  const { container, unmount } = await renderSlot(
    createElement("button", {
      id: "written-by-the-caller",
      type: "button",
    }),
    { id: "written-by-the-slot" },
  )

  expect(container.querySelector("button")?.id).toBe(
    "written-by-the-slot",
  )

  await unmount()
})
