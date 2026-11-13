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
  /** The move handle; a click on it would open the move menu. */
  handle: HTMLButtonElement
  host: HTMLElement
  onDrop: ReturnType<typeof vi.fn>
  onHandleClick: ReturnType<typeof vi.fn>
  root: Root
  startDrag: (
    pointerId?: number,
    origin?: BoardDragOrigin,
  ) => void
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

  const onHandleClick = vi.fn()

  let start: Harness["startDrag"] = () => {}

  const DragHarness = () => {
    const { registerLane, startDrag } = useBoardDrag({
      onDrop,
    })

    start = (pointerId = POINTER_ID, origin = ORIGIN) => {
      const handle = host.querySelector("button")

      if (!handle) {
        throw new Error("The harness drew no handle.")
      }

      startDrag(
        {
          clientX: 20,
          clientY: 20,
          currentTarget: handle,
          pointerId,
        },
        origin,
      )
    }

    return (
      <div
        ref={registerLane("lane")}
        style={{ height: 200, width: 200 }}
      >
        <div data-board-card="" style={{ height: 40 }}>
          <button
            onClick={onHandleClick}
            ref={(element) => {
              if (element) {
                element.setPointerCapture = () => {}
              }
            }}
            type="button"
          >
            Move
          </button>
        </div>
      </div>
    )
  }

  flushSync(() => {
    root.render(<DragHarness />)
  })

  const handle = host.querySelector("button")

  if (!handle) {
    throw new Error("The harness drew no handle.")
  }

  const created: Harness = {
    handle,
    host,
    onDrop,
    onHandleClick,
    root,
    startDrag: (pointerId, origin) => {
      start(pointerId, origin)
    },
  }

  harness = created

  return created
}

const firePointer = (
  type: "pointercancel" | "pointermove" | "pointerup",
  point: { x: number; y: number },
  pointerId = POINTER_ID,
) => {
  const box = harness?.host.getBoundingClientRect()

  globalThis.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: (box?.left ?? 0) + point.x,
      clientY: (box?.top ?? 0) + point.y,
      pointerId,
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

const finishDrag = () => {
  flushSync(() => {
    firePointer("pointerup", { x: 60, y: 100 })
  })
}

test("a cancelled drag leaves the next real click alone", () => {
  const activeHarness = mountHarness()

  dragIntoLane(activeHarness)

  flushSync(() => {
    firePointer("pointercancel", { x: 60, y: 100 })
  })

  expect(activeHarness.onDrop).not.toHaveBeenCalled()

  // A cancelled gesture produces no click, so this one is real.
  activeHarness.handle.click()

  expect(activeHarness.onHandleClick).toHaveBeenCalledTimes(
    1,
  )
})

test("a finished drag swallows its own click, and only that one", () => {
  const activeHarness = mountHarness()

  dragIntoLane(activeHarness)

  finishDrag()

  expect(activeHarness.onDrop).toHaveBeenCalledTimes(1)

  // The synthetic click the gesture produced.
  activeHarness.handle.click()

  expect(activeHarness.onHandleClick).not.toHaveBeenCalled()

  activeHarness.handle.click()

  expect(activeHarness.onHandleClick).toHaveBeenCalledTimes(
    1,
  )
})

test("a finished drag's click on an ancestor of the handle is swallowed too", () => {
  const activeHarness = mountHarness()

  const onHostClick = vi.fn()

  activeHarness.host.addEventListener("click", onHostClick)

  dragIntoLane(activeHarness)

  finishDrag()

  // Without pointer capture, a release off the handle clicks the
  // nearest common ancestor.
  activeHarness.host.click()

  expect(onHostClick).not.toHaveBeenCalled()
})

test("a finished drag never eats a click on another control", () => {
  const activeHarness = mountHarness()

  const { button, onClick } = mountBystander()

  dragIntoLane(activeHarness)

  finishDrag()

  button.click()

  expect(onClick).toHaveBeenCalledTimes(1)
})

test("a finished drag with no click of its own does not eat the next press", () => {
  const activeHarness = mountHarness()

  dragIntoLane(activeHarness)

  finishDrag()

  // A touch that travelled produces no click; the next gesture
  // starts with a press.
  activeHarness.handle.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      pointerId: POINTER_ID + 1,
    }),
  )

  activeHarness.handle.click()

  expect(activeHarness.onHandleClick).toHaveBeenCalledTimes(
    1,
  )
})

test("a drag's blocker expires on its own when no click comes", () => {
  vi.useFakeTimers()

  try {
    const activeHarness = mountHarness()

    dragIntoLane(activeHarness)

    finishDrag()

    vi.advanceTimersByTime(1000)

    activeHarness.handle.click()

    expect(
      activeHarness.onHandleClick,
    ).toHaveBeenCalledTimes(1)
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

  finishDrag()

  expect(activeHarness.onDrop).toHaveBeenCalledTimes(1)
})

test("a second press replaces the drag and does not inherit its target", () => {
  const activeHarness = mountHarness()

  dragIntoLane(activeHarness)

  const secondPointer = POINTER_ID + 1

  flushSync(() => {
    activeHarness.startDrag(secondPointer, {
      fromIndex: 1,
      fromLaneKey: "lane",
      itemKey: "other-card",
    })
  })

  // Released where it was pressed: a press, not a drag.
  flushSync(() => {
    firePointer(
      "pointerup",
      { x: 20, y: 20 },
      secondPointer,
    )
  })

  // And the first pointer's late release belongs to no gesture.
  finishDrag()

  expect(activeHarness.onDrop).not.toHaveBeenCalled()
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
