/**
 * The same contract as `../react/useClonedChild.browser.test.ts`,
 * against the Preact binding — where it is a *different* mechanism
 * with the same consequence: Preact keeps a ref on the vnode rather
 * than in its props, and `cloneElement` resolves it as
 * `ref || vnode.ref`, so an injected ref replaces the caller's
 * outright.
 */

import type { VNode } from "preact"
import { createElement, render } from "preact"
import { act } from "preact/test-utils"
import { expect, test } from "vitest"

import { useClonedChild } from "./useClonedChild.ts"

/**
 * `VNode<P>` is **invariant in `P`**, so a `<button>` written with
 * its props spelled out is not assignable to the `VNode` this hook
 * takes — which is a real edge on the Preact signature and not
 * something this test is here to litigate. The cast is one place,
 * named, rather than at every call.
 */
const buttonElement = (props: Record<string, unknown>) =>
  createElement("button", props) as VNode

const renderSlot = async (
  child: VNode,
  injectedProps: Record<string, unknown>,
) => {
  const container = document.createElement("div")

  document.body.append(container)

  const Slot = () => useClonedChild(child, injectedProps)

  await act(() => {
    render(createElement(Slot, null), container)
  })

  return {
    container,
    unmount: async () => {
      await act(() => {
        render(null, container)
      })

      container.remove()
    },
  }
}

test("the slot's ref does not replace the child's own", async () => {
  const seenByChild: (Element | null)[] = []

  const seenBySlot: (Element | null)[] = []

  const { container, unmount } = await renderSlot(
    buttonElement({
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

  expect(seenByChild).toEqual([button])

  expect(seenBySlot).toEqual([button])

  await unmount()

  expect(seenByChild).toEqual([button, null])

  expect(seenBySlot).toEqual([button, null])
})

test("both handlers run, the child's first", async () => {
  const calls: string[] = []

  const { container, unmount } = await renderSlot(
    buttonElement({
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

  await act(() => {
    container.querySelector("button")?.click()
  })

  expect(calls).toEqual(["child", "slot"])

  await unmount()
})
