import type { ReactNode } from "react"
import { useCallback, useState } from "react"

import { SegmentedControl } from "../SegmentedControl/SegmentedControl.tsx"
import { toClassName } from "../toClassName.ts"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import type { BoardLane } from "./BoardLaneList.tsx"
import { BoardLaneList } from "./BoardLaneList.tsx"
import {
  describeMove,
  getIsMoveMeaningful,
  toSettledIndex,
} from "./boardMove.ts"
import { useBoardDrag } from "./useBoardDrag.ts"

export type BoardMove = {
  /** Where the card was, in `fromLane.items`. */
  fromIndex: number
  fromLaneKey: string
  itemKey: string
  /**
   * Where it goes, **already corrected for its own removal** — so a
   * consumer's handler is `splice(fromIndex, 1)` then
   * `splice(toIndex, 0, item)` with no arithmetic of its own. A
   * within-lane move quoted against the un-spliced list is one too
   * high for every position below the origin, and that off-by-one is
   * the single most common bug in a hand-rolled board.
   */
  toIndex: number
  toLaneKey: string
}

export type BoardProps = {
  className?: string
  /**
   * What level the lane headings are. The caller's, because only the
   * caller knows what the board sits under: a board directly below a
   * page `<h1>` wants `2`, and one inside an already-deep section
   * wants `4`. Getting it wrong is an axe `heading-order` failure and
   * a broken screen-reader outline.
   */
  headingLevel?: 2 | 3 | 4 | 5
  /** The board's accessible name. Required — it is a landmark. */
  label: string
  lanes: readonly BoardLane[]
  /**
   * What the move handle shows **while the lanes are side by side**.
   * Below `cq-lg` the handle says "Move" whatever this is, because
   * there is nowhere to drag to — see `BoardCard`.
   *
   * The library ships no icons and no symbol glyphs in a default —
   * they render as nothing where the font lacks them, which
   * includes this sandbox's chromium, the kiosk image and the
   * ePaper build — so the default is a word and an app that owns a
   * glyph set passes one. On a dense board it is worth ~35px a row.
   */
  moveIcon?: ReactNode
  /**
   * Which lane is on screen below `cq-lg`. **Initial only** — the
   * segmented control owns it from then on, matching every other
   * uncontrolled control in this library.
   */
  narrowLaneKey?: string
  /**
   * The one thing that makes a board a board. **Absent means
   * read-only**: no handles, no menus, no drag, and nothing
   * announcing itself. A board with no `onMove` is a legitimate
   * thing — a dashboard, an ePaper render — and it should not be
   * carrying affordances that do nothing.
   */
  onMove?: (move: BoardMove) => void
}

/**
 * Lanes of cards, sized by their **container**, moved by keyboard or
 * by pointer.
 *
 * ### The container rule, which is the whole point
 *
 * There is no media query in this component, and adding one would be
 * a defect rather than a shortcut. Two facts make window width
 * useless here and they compound:
 *
 *  - **A lane in a three-up board is narrow on any monitor.** Three
 *    lanes across 1600px is ~500px each, which is a phone's worth of
 *    room, on a 4K display, in a maximised window.
 *  - **The owner browses zoomed in.** A 1500px window at 175% zoom
 *    is ~860 effective CSS pixels, so the number a media query reads
 *    is not the number of pixels anything actually has.
 *
 * So there are **two nested containers**, and they answer two
 * different questions:
 *
 *  - The board's own box decides *how many lanes are on screen* —
 *    three-up at `cq-lg` and wider, one lane plus a segmented
 *    control below it.
 *  - Each lane's list decides *what shape a card is* — two lines,
 *    one line, or its own card. See `BoardCard`.
 *
 * Both are `@container`, and neither is queried by the element that
 * declares it, because a container query matches descendants only.
 *
 * ### There is no horizontal scroll, at any width
 *
 * *"No horizontal scroll, ever. The board becomes a segmented
 * control, never a pan surface."* A board that pans sideways hides
 * lanes behind a gesture with no affordance, and on a trackpad it
 * fights the browser's own back-navigation. So the narrow layout
 * shows one lane at a time and names the others in a `radiogroup`
 * that says how many cards each holds.
 *
 * ### Moving a card is a first-class operation, and it is not a drag
 *
 * The move is a **`Menu` on every card**, listing the other lanes.
 * That is the primary path, not an accessibility fallback: it is the
 * only one that works from the keyboard, the only one a screen
 * reader can drive, and the only one available in the Narrow View
 * where the other lanes are not on screen to drop onto. Pointer
 * dragging is layered on the same handle and commits through the
 * same callback.
 *
 * **No drag-and-drop dependency is taken.** The reasoning — licence,
 * provenance, bundle cost, and what a general DnD library would
 * actually be buying for one card going into one lane — is in
 * [the decision](../../../docs/decisions/2026-08-19-the-board-owns-the-move-and-takes-no-drag-and-drop-dependency.md).
 *
 * ### What this component deliberately does not do
 *
 * Lanes, counts, truncation, empty states and the move; **not**
 * data, not virtualisation, and not the cross-lane "needs attention"
 * summary. A board is a view of a list the consumer owns, the lane
 * truncates by construction so there is nothing to virtualise, and a
 * panel that reaches across every lane is not a lane — it is an
 * `Alert` above the board, which is how the docs page composes it.
 */
export const Board = ({
  className,
  headingLevel = 3,
  label,
  lanes,
  moveIcon,
  narrowLaneKey,
  onMove,
}: BoardProps): ReactNode => {
  const [visibleLaneKey, setVisibleLaneKey] = useState(
    narrowLaneKey ?? lanes[0]?.key ?? "",
  )

  /**
   * What the live region last said. A string rather than a boolean
   * plus a lookup, because the region's job is to have the sentence
   * ready the moment it changes — and because a move announced as
   * "moved" with no destination tells a screen-reader user strictly
   * less than watching the card land tells everyone else.
   */
  const [moveAnnouncement, setMoveAnnouncement] =
    useState("")

  const commitMove = useCallback(
    (move: BoardMove) => {
      const toLane = lanes.find(
        (one) => one.key === move.toLaneKey,
      )

      if (!toLane) {
        return
      }

      const item = lanes
        .flatMap((one) => one.items)
        .find((one) => one.key === move.itemKey)

      setMoveAnnouncement(
        describeMove({
          index: move.toIndex,
          laneLabel: toLane.label,
          laneSize:
            move.fromLaneKey === move.toLaneKey
              ? (toLane.itemCount ?? toLane.items.length)
              : (toLane.itemCount ?? toLane.items.length) +
                1,
          title: item?.title ?? move.itemKey,
        }),
      )

      onMove?.(move)
    },
    [lanes, onMove],
  )

  const { drag, registerLane, startDrag } = useBoardDrag({
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

      commitMove({
        fromIndex: origin.fromIndex,
        fromLaneKey: origin.fromLaneKey,
        itemKey: origin.itemKey,
        toIndex: toSettledIndex({
          fromIndex: origin.fromIndex,
          fromLaneKey: origin.fromLaneKey,
          toIndex: target.index,
          toLaneKey: target.laneKey,
        }),
        toLaneKey: target.laneKey,
      })
    },
  })

  return (
    <section
      aria-label={label}
      /*
       * `@container/board`, and the NAME is what a card's move
       * handle needs.
       *
       * An unnamed container query matches the nearest ancestor
       * container, and between this box and a card there is a
       * second one — the lane's, one level down, which decides what
       * shape a card is. So a `cq-lg:` written inside `BoardCard`
       * asks about the LANE, and the answer is inverted against the
       * question the handle has to ask: in a three-up board a lane
       * is ~280px, and in the Narrow View the single lane is the
       * whole board. Naming this one lets the handle query past the
       * lane to the box that actually decides how many lanes are on
       * screen. Naming changes nothing else — a named container
       * still answers an unnamed query, which is why the segmented
       * control and the lanes below keep their plain `cq-lg:`.
       */
      className={toClassName("@container/board", className)}
    >
      <div className="flex flex-col gap-3">
        {/*
         * Hidden rather than unmounted above `cq-lg`, and that is
         * not laziness. Rendering it conditionally would need the
         * board's own width in JavaScript, which means a
         * `ResizeObserver`, which means the first paint is wrong and
         * a kiosk Pi shows it. `display: none` is invisible to
         * assistive technology as well as to the eye, so the wide
         * board has no stray radiogroup in it.
         */}
        <SegmentedControl
          className="max-w-full flex-wrap cq-lg:hidden"
          items={lanes.map((lane) => ({
            // Stacked rather than `Todo (6)`, because the count is
            // the reason to look: a lane picker that reads
            // "In Progress (5)" on one line is a long label with a
            // number in it, and at 15rem three of them do not fit
            // on any line at all.
            label: (
              <span className="flex flex-col items-center leading-tight">
                <span>{lane.label}</span>

                <span className="font-normal text-content-muted text-xs">
                  {String(
                    lane.itemCount ?? lane.items.length,
                  )}
                </span>
              </span>
            ),
            value: lane.key,
          }))}
          label={`${label} lanes`}
          onChange={(value) => {
            setVisibleLaneKey(value ?? "")
          }}
          selectedValue={visibleLaneKey}
        />

        <div className="flex flex-col gap-4 cq-lg:flex-row cq-lg:items-start">
          {lanes.map((lane) => (
            <BoardLaneList
              headingLevel={headingLevel}
              dropIndicatorOffset={
                drag?.target?.laneKey === lane.key
                  ? drag.indicatorOffset
                  : null
              }
              isVisibleWhenNarrow={
                lane.key === visibleLaneKey
              }
              key={lane.key}
              lane={lane}
              moveIcon={moveIcon}
              moveTargets={lanes
                .filter((one) => one.key !== lane.key)
                .map((one) => ({
                  key: one.key,
                  label: one.label,
                }))}
              onMoveToLane={
                onMove
                  ? (itemKey, toLaneKey) => {
                      const toLane = lanes.find(
                        (one) => one.key === toLaneKey,
                      )

                      commitMove({
                        fromIndex: lane.items.findIndex(
                          (one) => one.key === itemKey,
                        ),
                        fromLaneKey: lane.key,
                        itemKey,
                        // A menu move appends. There is no pointer
                        // to read a position off, and "the end of
                        // the lane you just sent it to" is the one
                        // answer that needs no second question.
                        toIndex: toLane?.items.length ?? 0,
                        toLaneKey,
                      })
                    }
                  : undefined
              }
              onStartDrag={
                onMove
                  ? (pointerEvent, origin) => {
                      startDrag(pointerEvent, {
                        ...origin,
                        fromLaneKey: lane.key,
                      })
                    }
                  : undefined
              }
              registerListElement={registerLane(lane.key)}
            />
          ))}
        </div>
      </div>

      {/*
       * `aria-label` on a `role="status"`, per the library's own
       * rule — a live region with no name is announced with no
       * context, and this one fires while the user's attention is on
       * a card rather than on the board.
       */}
      <VisuallyHidden
        aria-label={`${label} activity`}
        role="status"
      >
        {moveAnnouncement}
      </VisuallyHidden>
    </section>
  )
}
