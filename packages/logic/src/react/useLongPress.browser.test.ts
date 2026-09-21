/**
 * Press-and-hold, driven with the events a real finger produces,
 * in the same chromium the rest of the browser suite runs in.
 *
 * There is no core to prove this against — the gesture *is* the
 * event sequence, so a Node model of it would only restate the
 * implementation. What matters is the four sequences the hook
 * exists to tell apart: a held press, a press that turned into a
 * scroll, the Android `contextmenu` that arrives instead of the
 * timer, and a mouse press that must pass straight through.
 *
 * `createElement` rather than JSX, because this project has no JSX
 * plugin in its browser config — same reason as
 * `useMediaQuery.browser.test.ts`.
 */

import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { expect, test, vi } from "vitest"

import type { LongPressPoint } from "./useLongPress.ts"
import { useLongPress } from "./useLongPress.ts"

;(
  globalThis as unknown as Record<string, boolean>
).IS_REACT_ACT_ENVIRONMENT = true

const HOLD_DURATION_MS = 20

const renderPressable = async ({
  onLongPress,
  onClick,
}: {
  onClick?: () => void
  onLongPress: (point: LongPressPoint) => void
}) => {
  const container = document.createElement("div")

  document.body.append(container)

  const root = createRoot(container)

  const Host = () => {
    const handlers = useLongPress({
      holdDurationMs: HOLD_DURATION_MS,
      onLongPress,
    })

    return createElement(
      "div",
      { ...handlers, "data-testid": "surface" },
      createElement(
        "button",
        { onClick, type: "button" },
        "Open",
      ),
    )
  }

  await act(async () => {
    root.render(createElement(Host))
  })

  const surface = container.querySelector(
    "[data-testid='surface']",
  ) as HTMLElement

  const child = container.querySelector(
    "button",
  ) as HTMLElement

  return {
    child,
    surface,
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })

      container.remove()
    },
  }
}

const press = async (
  element: HTMLElement,
  {
    clientX = 100,
    clientY = 100,
    pointerType = "touch",
  }: {
    clientX?: number
    clientY?: number
    pointerType?: string
  } = {},
) => {
  await act(async () => {
    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX,
        clientY,
        pointerType,
      }),
    )
  })
}

const movePointer = async (
  element: HTMLElement,
  { clientX, clientY }: LongPressPoint,
) => {
  await act(async () => {
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX,
        clientY,
        pointerType: "touch",
      }),
    )
  })
}

const waitForHold = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, HOLD_DURATION_MS * 3)
    })
  })
}

test("a held touch press fires once, at the point it started", async () => {
  const onLongPress = vi.fn()

  const view = await renderPressable({ onLongPress })

  await press(view.surface, { clientX: 42, clientY: 84 })

  await waitForHold()

  expect(onLongPress).toHaveBeenCalledTimes(1)

  expect(onLongPress).toHaveBeenCalledWith({
    clientX: 42,
    clientY: 84,
  })

  await view.unmount()
})

/**
 * The press became a scroll. A finger is never still, so the
 * tolerance is what separates "held" from "moved" — 5px inside it
 * still fires, 40px outside it does not.
 */
test("a press that travels is a scroll, not a hold", async () => {
  const onLongPress = vi.fn()

  const view = await renderPressable({ onLongPress })

  await press(view.surface, { clientX: 100, clientY: 100 })

  await movePointer(view.surface, {
    clientX: 103,
    clientY: 100,
  })

  await movePointer(view.surface, {
    clientX: 140,
    clientY: 100,
  })

  await waitForHold()

  expect(onLongPress).not.toHaveBeenCalled()

  await view.unmount()
})

/**
 * The Android path, and the reason `contextmenu` is a trigger
 * rather than merely something to suppress: Chrome recognises its
 * own long press at about the same moment and cancels the pointer
 * sequence, which would clear the timer a beat before it ran.
 */
test("a touch contextmenu fires the press and keeps the native menu away", async () => {
  const onLongPress = vi.fn()

  const view = await renderPressable({ onLongPress })

  await press(view.surface, { clientX: 10, clientY: 20 })

  const contextMenuEvent = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
  })

  await act(async () => {
    view.surface.dispatchEvent(contextMenuEvent)
  })

  expect(onLongPress).toHaveBeenCalledTimes(1)

  expect(contextMenuEvent.defaultPrevented).toBe(true)

  // The timer must not fire a second menu for the same press.
  await waitForHold()

  expect(onLongPress).toHaveBeenCalledTimes(1)

  await view.unmount()
})

/**
 * A mouse keeps the browser's own menu — "Open link in new tab",
 * "Copy link address" — which is the half of this decision that
 * costs a desktop nothing.
 */
test("a mouse press neither fires nor takes the browser's menu", async () => {
  const onLongPress = vi.fn()

  const view = await renderPressable({ onLongPress })

  await press(view.surface, { pointerType: "mouse" })

  await waitForHold()

  const contextMenuEvent = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
  })

  await act(async () => {
    view.surface.dispatchEvent(contextMenuEvent)
  })

  expect(onLongPress).not.toHaveBeenCalled()

  expect(contextMenuEvent.defaultPrevented).toBe(false)

  await view.unmount()
})

/**
 * A long press on a link still ends in a `click`. Without the
 * capture-phase guard the menu opens and the page navigates out
 * from under it — and the handler that must not run is on a
 * **child**, which is why the guard captures rather than bubbles.
 */
test("the click that ends a fired press reaches nothing", async () => {
  const onClick = vi.fn()

  const onLongPress = vi.fn()

  const view = await renderPressable({
    onClick,
    onLongPress,
  })

  await press(view.child)

  await waitForHold()

  expect(onLongPress).toHaveBeenCalledTimes(1)

  await act(async () => {
    view.child.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    )
  })

  expect(onClick).not.toHaveBeenCalled()

  // Only the one click is swallowed: the next tap is an ordinary
  // tap, and a card that stopped answering after its first long
  // press would be the worse bug.
  await act(async () => {
    view.child.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    )
  })

  expect(onClick).toHaveBeenCalledTimes(1)

  await view.unmount()
})
