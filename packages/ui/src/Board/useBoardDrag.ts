import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import type {
  BoardDropLane,
  BoardDropTarget,
  BoardRect,
} from "./boardMove.ts"
import { chooseDropTarget } from "./boardMove.ts"

/**
 * Pointer dragging for the board — **on Pointer Events, with no
 * drag-and-drop dependency**, and the reasoning is written down in
 * `docs/decisions/2026-08-19-the-board-owns-the-move-and-takes-no-drag-and-drop-dependency.md`.
 *
 * The short version: a published design system's dependency list is
 * inherited by every consumer, `castkit/packages/slatecast` has 60 KB
 * gzipped to spend in total, and the two candidates cost 12–30 KB
 * before a card has been drawn. What they buy is sensors, collision
 * strategies, and sortable animation — a general solution to a
 * problem this component has a specific version of: one card, from
 * one lane, into one other lane.
 *
 * ### Pointer Events rather than HTML5 drag-and-drop
 *
 * `draggable="true"` is the zero-dependency instinct and it is the
 * wrong one. It does not fire on touch at all — so the Narrow View,
 * the kiosk density, and the tablet the owner actually reads this on
 * get nothing — its drag image is a browser-drawn ghost with no
 * styling hook worth using, and `dataTransfer` is readable only
 * inside a real `drop`, which makes a live drop indicator awkward.
 * Pointer Events are one code path for mouse, touch and pen, and
 * `setPointerCapture` means the drag survives the pointer leaving the
 * card, the lane, and the window.
 *
 * ### Every rectangle is measured once, at grab
 *
 * Re-measuring on each `pointermove` reads more correct and is
 * worse. The drop indicator is a real element; inserting it moves
 * the cards below it; the next move measures the moved cards and
 * computes a different index; the indicator jumps back. That
 * feedback loop is why the indicator here is `position: absolute`
 * against a snapshot taken at grab — the layout under the pointer
 * is frozen for the length of the drag, so the number the person
 * sees and the number that gets committed are the same number.
 *
 * The cost is honest and small: a lane that reflows mid-drag (a live
 * agent-run line wrapping to two lines) is measured stale. A board
 * where that matters wants a re-snapshot on `ResizeObserver`, which
 * is a change to this file and to nothing else.
 */

/**
 * How far the pointer has to travel before a press becomes a drag.
 *
 * Without it the handle is a button that cannot be clicked: every
 * mouse-down/up pair carries a pixel or two of movement, and a
 * "drag" of one pixel would commit a move and swallow the click that
 * was meant to open the move menu. Four device-independent pixels is
 * the usual figure and it is comfortably below a deliberate drag.
 */
const DRAG_THRESHOLD_PX = 4

export type BoardDragOrigin = {
  fromIndex: number
  fromLaneKey: string
  itemKey: string
}

export type BoardDragState = BoardDragOrigin & {
  /**
   * Where the indicator is drawn, in pixels from the top of the
   * target lane's list box. `null` while the pointer is over no
   * lane the snapshot knows about.
   */
  indicatorOffset: number | null
  target: BoardDropTarget | null
}

type LaneSnapshot = BoardDropLane & {
  gap: number
  listTop: number
}

const toRect = (element: Element): BoardRect => {
  const rect = element.getBoundingClientRect()

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  }
}

/**
 * Where the line goes for a given insertion index — the midpoint of
 * the gap the card would be dropped into, in the list's own
 * coordinates.
 *
 * Split out and exported because it is the one piece of this file
 * that is pure arithmetic over the snapshot, and the three cases
 * (before everything, between two, after everything) are exactly
 * where an off-by-one lives.
 */
export const getIndicatorOffset = (
  lane: LaneSnapshot,
  index: number,
): number => {
  const { cardRects, gap, listTop } = lane

  if (cardRects.length === 0) {
    return 0
  }

  const previous = cardRects[index - 1]

  const next = cardRects[index]

  if (!previous) {
    return (
      (cardRects[0]?.top ?? listTop) - listTop - gap / 2
    )
  }

  if (!next) {
    return (
      previous.top + previous.height - listTop + gap / 2
    )
  }

  return (
    (previous.top + previous.height + next.top) / 2 -
    listTop
  )
}

export const useBoardDrag = ({
  onDrop,
}: {
  onDrop: (
    origin: BoardDragOrigin,
    target: BoardDropTarget,
  ) => void
}): {
  drag: BoardDragState | null
  registerLane: (
    laneKey: string,
  ) => (element: HTMLElement | null) => void
  startDrag: (
    pointerEvent: {
      clientX: number
      clientY: number
      currentTarget: EventTarget & Element
      pointerId: number
    },
    origin: BoardDragOrigin,
  ) => void
} => {
  const laneElements = useRef(
    new Map<string, HTMLElement>(),
  )

  const snapshot = useRef<LaneSnapshot[]>([])

  const [drag, setDrag] = useState<BoardDragState | null>(
    null,
  )

  /**
   * The live drag, readable from a listener that was registered
   * once. The listeners below are attached for the whole life of the
   * component rather than added and removed per drag — re-attaching
   * on every state change is how a `pointerup` gets missed — so they
   * cannot close over `drag` itself.
   */
  const dragRef = useRef<BoardDragState | null>(null)

  const setDragState = useCallback(
    (next: BoardDragState | null) => {
      dragRef.current = next

      setDrag(next)
    },
    [],
  )

  const registerLane = useCallback(
    (laneKey: string) => (element: HTMLElement | null) => {
      if (element) {
        laneElements.current.set(laneKey, element)

        return
      }

      laneElements.current.delete(laneKey)
    },
    [],
  )

  const takeSnapshot = useCallback(() => {
    snapshot.current = Array.from(
      laneElements.current,
      ([key, element]) => {
        const cardElements = Array.from(
          element.querySelectorAll("[data-board-card]"),
        )

        return {
          cardRects: cardElements.map(toRect),
          gap:
            Number.parseFloat(
              globalThis.getComputedStyle(element).rowGap,
            ) || 0,
          key,
          listTop: element.getBoundingClientRect().top,
          rect: toRect(element),
        }
      },
    )
  }, [])

  const moveTo = useCallback(
    (point: { x: number; y: number }) => {
      const origin = dragRef.current

      if (!origin) {
        return
      }

      const target = chooseDropTarget(
        snapshot.current,
        point,
      )

      const lane = snapshot.current.find(
        (one) => one.key === target?.laneKey,
      )

      setDragState({
        ...origin,
        indicatorOffset:
          lane && target
            ? getIndicatorOffset(lane, target.index)
            : null,
        target,
      })
    },
    [setDragState],
  )

  const startDrag = useCallback(
    (
      pointerEvent: {
        clientX: number
        clientY: number
        currentTarget: EventTarget & Element
        pointerId: number
      },
      origin: BoardDragOrigin,
    ) => {
      const handle = pointerEvent.currentTarget

      const startX = pointerEvent.clientX

      const startY = pointerEvent.clientY

      // The capture goes on the handle, so `pointermove` keeps
      // arriving after the pointer has left it — which it does
      // immediately, because the card it is dragging moves out from
      // under it.
      if (handle instanceof HTMLElement) {
        handle.setPointerCapture?.(pointerEvent.pointerId)
      }

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (
          moveEvent.pointerId !== pointerEvent.pointerId
        ) {
          return
        }

        if (
          !dragRef.current &&
          Math.hypot(
            moveEvent.clientX - startX,
            moveEvent.clientY - startY,
          ) < DRAG_THRESHOLD_PX
        ) {
          return
        }

        if (!dragRef.current) {
          takeSnapshot()

          setDragState({
            ...origin,
            indicatorOffset: null,
            target: null,
          })
        }

        // A touch drag scrolls the page unless something says
        // otherwise, and `touch-action: none` on the handle only
        // covers the handle. This covers the rest of the gesture.
        moveEvent.preventDefault()

        moveTo({
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        })
      }

      const finish = (isCommitted: boolean) => {
        globalThis.removeEventListener(
          "pointermove",
          onPointerMove,
        )

        globalThis.removeEventListener("pointerup", onUp)

        globalThis.removeEventListener(
          "pointercancel",
          onCancel,
        )

        const live = dragRef.current

        setDragState(null)

        if (!live) {
          return
        }

        /**
         * A pointer sequence that ends on the element it started
         * from still fires a `click`, and the element it started
         * from is a button that opens the move menu. Without this,
         * every completed drag lands the card and then opens a menu
         * on top of it.
         *
         * Swallowed in the **capture** phase and `once`, so it
         * consumes exactly the synthetic click this gesture
         * produced and nothing after it. A `hasDragged` flag on the
         * card would be the same idea with a lifetime nobody owns.
         */
        globalThis.addEventListener(
          "click",
          (clickEvent) => {
            clickEvent.preventDefault()

            clickEvent.stopPropagation()
          },
          { capture: true, once: true },
        )

        if (isCommitted && live.target) {
          onDrop(origin, live.target)
        }
      }

      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId === pointerEvent.pointerId) {
          finish(true)
        }
      }

      const onCancel = () => {
        finish(false)
      }

      globalThis.addEventListener(
        "pointermove",
        onPointerMove,
        { passive: false },
      )

      globalThis.addEventListener("pointerup", onUp)

      globalThis.addEventListener("pointercancel", onCancel)
    },
    [moveTo, onDrop, setDragState, takeSnapshot],
  )

  /**
   * Escape abandons the drag, and it is registered for the life of
   * the component rather than for the life of a drag. A listener
   * added when a drag starts is a listener that leaks when the
   * component unmounts mid-drag — which is exactly what a route
   * change during a drag does.
   */
  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape" && dragRef.current) {
        keyEvent.preventDefault()

        setDragState(null)
      }
    }

    globalThis.addEventListener("keydown", onKeyDown)

    return () => {
      globalThis.removeEventListener("keydown", onKeyDown)
    }
  }, [setDragState])

  return { drag, registerLane, startDrag }
}
