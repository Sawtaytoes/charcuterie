import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import { expect } from "storybook/test"
import { afterEach, test, vi } from "vitest"

import type { BoardDropTarget } from "./boardMove.ts"
import {
  type BoardDragOrigin,
  useBoardDrag,
} from "./useBoardDrag.ts"

/**
 * The hook's gesture lifecycle, driven by hand.
 *
 * Mounted bare rather than through a story, because what is under
 * test is what happens AFTER a gesture ends — a click elsewhere on
 * the page, an unmount mid-drag — and neither has a story. The drag
 * is started by calling `startDrag` directly with a handle whose
 * `setPointerCapture` is a no-op: a dispatched `PointerEvent` has no
 * active pointer behind it, and the real method would throw before
 * a listener was registered.
 */

const POINTER_ID = 7

type Harness = {
  host: HTMLElement
  onDrop: ReturnType<typeof vi.fn>
  root: Root
  startDrag: () => void
}

let harness: Harness | null = null

afterEach(() => {
  // A test that ends on a finished drag leaves its click blocker
  // armed for the next test; a press is what disarms it.
  globalThis.dispatchEvent(new PointerEvent("pointerdown"))

  if (harness) {
    harness.root.unmount()

    harness.host.remove()

    harness = null
  }
})

const ORIGIN: BoardDragOrigin = {
  fromIndex: 0,
  fromLaneKey: "lane",
  itemKey: "card",
}

const mountHarness = (): Harness => {
  const host = document.createElement("div")

  document.body.append(host)

  const root = createRoot(host)

  const onDrop =
    vi.fn<
      (
        origin: BoardDragOrigin,
        target: BoardDropTarget,
      ) => void
    >()

  const handle = document.createElement("div")

  handle.setPointerCapture = () => {}

  let start: (() => void) | null = null

  const DragHarness = () => {
    const { registerLane, startDrag } = useBoardDrag({
      onDrop,
    })

    start = () => {
      startDrag(
        {
          clientX: 20,
          clientY: 20,
          currentTarget: handle,
          pointerId: POINTER_ID,
        },
        ORIGIN,
      )
    }

    return (
      <div
        ref={registerLane("lane")}
        style={{ height: 200, width: 200 }}
      >
        <div data-board-card="" style={{ height: 40 }} />
      </div>
    )
  }

  flushSync(() => {
    root.render(<DragHarness />)
  })

  const created: Harness = {
    host,
    onDrop,
    root,
    startDrag: () => {
      start?.()
    },
  }

  harness = created

  return created
}

const firePointer = (
  type: "pointercancel" | "pointermove" | "pointerup",
  point: { x: number; y: number },
) => {
  const box = harness?.host.getBoundingClientRect()

  globalThis.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: (box?.left ?? 0) + point.x,
      clientY: (box?.top ?? 0) + point.y,
      pointerId: POINTER_ID,
    }),
  )
}

/** A real button elsewhere on the page, and whether it heard a click. */
const mountBystander = () => {
  const button = document.createElement("button")

  button.textContent = "Elsewhere"

  const onClick = vi.fn()

  button.addEventListener("click", onClick)

  harness?.host.append(button)

  return { button, onClick }
}

const dragIntoLane = (activeHarness: Harness) => {
  activeHarness.startDrag()

  // Past the four-pixel threshold, and inside the registered lane.
  flushSync(() => {
    firePointer("pointermove", { x: 60, y: 100 })
  })
}

test("a cancelled drag leaves the next real click alone", () => {
  const activeHarness = mountHarness()

  const { button, onClick } = mountBystander()

  dragIntoLane(activeHarness)

  flushSync(() => {
    firePointer("pointercancel", { x: 60, y: 100 })
  })

  expect(activeHarness.onDrop).not.toHaveBeenCalled()

  button.click()

  expect(onClick).toHaveBeenCalledTimes(1)
})

test("a finished drag swallows its own click, and only that one", () => {
  const activeHarness = mountHarness()

  const { button, onClick } = mountBystander()

  dragIntoLane(activeHarness)

  flushSync(() => {
    firePointer("pointerup", { x: 60, y: 100 })
  })

  expect(activeHarness.onDrop).toHaveBeenCalledTimes(1)

  // The synthetic click the gesture produced.
  button.click()

  expect(onClick).not.toHaveBeenCalled()

  button.click()

  expect(onClick).toHaveBeenCalledTimes(1)
})

test("a finished drag with no click of its own does not eat the next press", () => {
  const activeHarness = mountHarness()

  const { button, onClick } = mountBystander()

  dragIntoLane(activeHarness)

  flushSync(() => {
    firePointer("pointerup", { x: 60, y: 100 })
  })

  // A touch that travelled produces no click; the next gesture
  // starts with a press.
  button.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      pointerId: POINTER_ID + 1,
    }),
  )

  button.click()

  expect(onClick).toHaveBeenCalledTimes(1)
})

test("a drag's blocker expires on its own when no click comes", () => {
  vi.useFakeTimers()

  try {
    const activeHarness = mountHarness()

    const { button, onClick } = mountBystander()

    dragIntoLane(activeHarness)

    flushSync(() => {
      firePointer("pointerup", { x: 60, y: 100 })
    })

    vi.advanceTimersByTime(1000)

    button.click()

    expect(onClick).toHaveBeenCalledTimes(1)
  } finally {
    vi.useRealTimers()
  }
})

test("another pointer's cancel does not end this drag", () => {
  const activeHarness = mountHarness()

  dragIntoLane(activeHarness)

  globalThis.dispatchEvent(
    new PointerEvent("pointercancel", {
      pointerId: POINTER_ID + 1,
    }),
  )

  flushSync(() => {
    firePointer("pointerup", { x: 60, y: 100 })
  })

  expect(activeHarness.onDrop).toHaveBeenCalledTimes(1)
})

test("unmounting mid-drag removes the pointer listeners", () => {
  const activeHarness = mountHarness()

  const { onDrop } = activeHarness

  dragIntoLane(activeHarness)

  activeHarness.root.unmount()

  activeHarness.host.remove()

  harness = null

  firePointer("pointerup", { x: 60, y: 100 })

  expect(onDrop).not.toHaveBeenCalled()

  // And nothing was armed to eat the page's next click.
  const button = document.createElement("button")

  const onClick = vi.fn()

  button.addEventListener("click", onClick)

  document.body.append(button)

  try {
    button.click()

    expect(onClick).toHaveBeenCalledTimes(1)
  } finally {
    button.remove()
  }
})
