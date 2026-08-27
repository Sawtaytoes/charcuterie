import type { ReactNode, Ref } from "react"
import { useCallback, useState } from "react"

import {
  getIsMoveMeaningful,
  toSettledIndex,
} from "../Board/boardMove.ts"
import { useBoardDrag } from "../Board/useBoardDrag.ts"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"

/**
 * The attribute the drag's hit test reads on a row. A `data-`
 * attribute rather than a class, the same contract `BoardCard` and
 * `DropRail` already write down: a class is a style and a
 * consumer's tooling may rename it.
 */
const ITEM_ATTRIBUTE = "data-reorder-item"

/**
 * The single lane this component registers with the board's drag.
 * A reorder list is a board with one lane and no lane picker, so
 * the key is a constant and never leaves this file.
 */
const LANE_KEY = "reorder-list"

export type ReorderListItem = {
  key: string
  /**
   * Plain text, and it is not optional. Every accessible name the
   * component writes is built from it — "Move <label> earlier" —
   * and so is the sentence the live region reads after a move. A
   * button announced as "↑" names nothing.
   */
  label: string
}

export type ReorderListRenderArguments<
  TItem extends ReorderListItem,
> = {
  /**
   * Spread onto whatever the host wants the drag to start FROM.
   * Absent — as an empty object — when the list is too short to
   * reorder, so a one-row list has no dead handle on it.
   *
   * It is a **handle**, never the whole row: a row holds links,
   * and a link is draggable already.
   */
  gripProps: {
    onPointerDown?: (event: {
      clientX: number
      clientY: number
      currentTarget: EventTarget & Element
      pointerId: number
    }) => void
    style?: { touchAction: "none" }
    title?: string
  }
  index: number
  isDragged: boolean
  isFirst: boolean
  isLast: boolean
  item: TItem
  /**
   * The KEYBOARD path, and it is the primary one. The host draws
   * the two buttons because only the host knows where they sit in
   * its own row; the component supplies what they do and whether
   * each end is disabled.
   */
  moveBy: (offset: -1 | 1) => void
  /** 1-based, for printing. */
  position: number
}

export type ReorderListProps<
  TItem extends ReorderListItem,
> = {
  className?: string
  /**
   * The container element. `ul` by default, because an ordered
   * pile of rows is a list; `div` for a host whose own CSS grid
   * owns the shape and would have to undo list semantics to get
   * it.
   */
  elementType?: "div" | "ol" | "ul"
  /**
   * The container element, for a host that needs it too.
   *
   * The component keeps its own hold on that element — the drag
   * measures its rows off it — so this is MERGED rather than
   * forwarded. Docket plays a FLIP animation off the same
   * element, and without this the two uses would have to fight
   * over one `ref`.
   */
  elementRef?: Ref<HTMLElement>
  itemClassName?: string
  items: readonly TItem[]
  /** The list's accessible name. */
  label: string
  /**
   * `fromIndex` and `toIndex` are both indexes into `items`, and
   * `toIndex` is already corrected for the row's own removal — so
   * a handler is `splice(from, 1)` then `splice(to, 0, row)` with
   * no arithmetic of its own.
   */
  onReorder: (fromIndex: number, toIndex: number) => void
  renderItem: (
    renderArguments: ReorderListRenderArguments<TItem>,
  ) => ReactNode
}

/**
 * A vertical list whose rows can be put in a different order — by
 * two buttons, or by dragging a handle.
 *
 * ### Why it is not a fourth hand-rolled reorder
 *
 * Docket wrote this twice: a subtask checklist on HTML5
 * `draggable`, and a phase queue with the buttons and no drag at
 * all. `Board` wrote a third, properly, on Pointer Events. Three
 * implementations of one shape is the case the workspace's
 * component rule exists for, so the geometry here is **`Board`'s
 * own** — `useBoardDrag` with a single registered lane and the
 * item selector pointed at this component's rows. Nothing about
 * the measuring, the snapshot, the threshold or the pointer
 * capture is written twice.
 *
 * ### The buttons are primary, the drag is the enhancement
 *
 * WCAG 2.5.7 requires a single-pointer alternative to any dragging
 * movement, and the board's decision already argues the stronger
 * version: the buttons are not a fallback bolted onto a drag, they
 * are the only path that works from a keyboard, under a screen
 * reader, or under a thumb in the Narrow View. So `renderItem`
 * receives `moveBy` before it receives `gripProps`, and a host
 * that draws no handle at all is a supported host.
 *
 * ### It takes no drag-and-drop dependency
 *
 * The board priced four libraries at 7–32 KB gzipped and took none
 * of them, because a published library's dependency list is
 * inherited by every consumer
 * ([decision](../../../docs/decisions/2026-08-19-the-board-owns-the-move-and-takes-no-drag-and-drop-dependency.md)).
 * This adds nothing to that arithmetic — it is the same 1.4 KB,
 * called twice.
 *
 * ### `draggable="true"` is the instinct this replaces
 *
 * Native HTML5 drag-and-drop **does not fire on touch at all**, so
 * the checklist Docket shipped on it cannot be reordered on the
 * tablet its owner reads it on. Pointer Events are one code path
 * for mouse, touch and pen, and `setPointerCapture` keeps the drag
 * alive once the row has moved out from under the finger.
 *
 * ### What it deliberately does not do
 *
 * It renders no row, no handle, no buttons and no glyph. The host
 * renders all four through `renderItem`, which is what lets one
 * component serve a checklist, a queue and a card list whose CSS
 * grids have nothing in common.
 */
export const ReorderList = <TItem extends ReorderListItem>({
  className,
  elementRef,
  elementType = "ul",
  itemClassName,
  items,
  label,
  onReorder,
  renderItem,
}: ReorderListProps<TItem>): ReactNode => {
  const [announcement, setAnnouncement] = useState("")

  /**
   * A single row cannot be put anywhere else, so it gets no grip
   * and no buttons. This is checked here rather than in every
   * host, because "hide the control when it can do nothing" is the
   * part each hand-rolled copy forgot.
   */
  const isReorderable = items.length > 1

  const commit = useCallback(
    (fromIndex: number, toIndex: number) => {
      setAnnouncement(
        `Moved ${items[fromIndex]?.label ?? ""} to position ${String(toIndex + 1)} of ${String(items.length)}.`,
      )

      onReorder(fromIndex, toIndex)
    },
    [items, onReorder],
  )

  const { drag, registerLane, startDrag } = useBoardDrag({
    itemSelector: `[${ITEM_ATTRIBUTE}]`,
    onDrop: (origin, target) => {
      if (
        !getIsMoveMeaningful({
          fromIndex: origin.fromIndex,
          fromLaneKey: origin.fromLaneKey,
          toIndex: target.index,
          toLaneKey: target.laneKey,
        })
      ) {
        return
      }

      commit(
        origin.fromIndex,
        toSettledIndex({
          fromIndex: origin.fromIndex,
          fromLaneKey: origin.fromLaneKey,
          toIndex: target.index,
          toLaneKey: target.laneKey,
        }),
      )
    },
  })

  const ListElement = elementType

  const ItemElement =
    elementType === "div" ? "div" : ("li" as const)

  return (
    <>
      <ListElement
        aria-label={label}
        className={toClassName("relative", className)}
        ref={(element: HTMLElement | null) => {
          registerLane(LANE_KEY)(element)

          if (typeof elementRef === "function") {
            elementRef(element)

            return
          }

          if (elementRef) {
            elementRef.current = element
          }
        }}
      >
        {items.map((item, index) => (
          <ItemElement
            className={itemClassName}
            key={item.key}
            {...{ [ITEM_ATTRIBUTE]: item.key }}
          >
            {renderItem({
              gripProps: isReorderable
                ? {
                    onPointerDown: (pointerEvent) => {
                      startDrag(pointerEvent, {
                        fromIndex: index,
                        fromLaneKey: LANE_KEY,
                        itemKey: item.key,
                      })
                    },
                    /*
                     * Without it the browser claims the gesture
                     * for a scroll and the `pointermove` stream
                     * stops one frame in — which reads as "drag
                     * works on the desktop and not on the
                     * tablet", the exact bug this component
                     * exists to end.
                     */
                    style: { touchAction: "none" },
                    title: "Drag to reorder",
                  }
                : {},
              index,
              isDragged: drag?.itemKey === item.key,
              isFirst: index === 0,
              isLast: index === items.length - 1,
              item,
              moveBy: (offset) => {
                const toIndex = index + offset

                if (
                  !isReorderable ||
                  toIndex < 0 ||
                  toIndex > items.length - 1
                ) {
                  return
                }

                commit(index, toIndex)
              },
              position: index + 1,
            })}
          </ItemElement>
        ))}

        {/*
         * A real element rather than a border on a row, and
         * absolutely positioned against a snapshot taken at grab.
         * Inserting it must not move the rows below it: that
         * feedback loop is what makes an indicator jump, and the
         * reasoning is written out in `useBoardDrag.ts`.
         */}
        {drag?.indicatorOffset == null ? null : (
          <ItemElement
            aria-hidden="true"
            className="pointer-events-none absolute end-0 start-0 h-0.5 rounded-full bg-intent-accent-solid"
            style={{
              insetBlockStart: `${String(drag.indicatorOffset)}px`,
            }}
          />
        )}
      </ListElement>

      {/*
       * `aria-label` on a `role="status"`, per the library's own
       * rule — a live region with no name is announced with no
       * context, and this one fires while the reader's attention
       * is on a row rather than on the list.
       *
       * It names the POSITION, because "moved" leaves a
       * screen-reader user unable to tell the top of a list from
       * the bottom of thirty. That is the one piece of feedback a
       * sighted user gets free from watching the row land.
       */}
      <VisuallyHidden
        aria-label={`${label} activity`}
        role="status"
      >
        {announcement}
      </VisuallyHidden>
    </>
  )
}
