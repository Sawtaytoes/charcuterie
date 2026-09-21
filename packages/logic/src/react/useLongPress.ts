import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import { useEffect, useRef } from "react"

import { useLatestRef } from "./useLatestRef.ts"

/**
 * Where the press happened, in viewport coordinates — the two
 * numbers a context menu needs to open at the finger rather than
 * at the corner of whatever was pressed.
 *
 * `clientX`/`clientY` are the platform's own names, carried
 * through unchanged: every caller reads them off a
 * `PointerEvent`, and a rename here would only add a step that
 * translates one spelling into another.
 */
export type LongPressPoint = {
  clientX: number
  clientY: number
}

export type LongPressOptions = {
  /**
   * How long the press must be held still. 500ms is the platform
   * figure — Android's own long-press threshold, and close enough
   * to iOS's — so a gesture learnt in one app works here at the
   * speed the hand already expects.
   */
  holdDurationMs?: number
  /**
   * How far the pointer may travel before the press becomes a
   * scroll and the timer is dropped. A finger is never still, so
   * zero tolerance fires for nobody; 10px is roughly the slop a
   * resting thumb produces on a phone.
   */
  moveTolerancePx?: number
  /** Fired once per press, at the point the press started. */
  onLongPress: (point: LongPressPoint) => void
  /**
   * Which pointer kinds arm the timer. **Touch and pen only, and
   * that is the decision rather than an oversight.**
   *
   * A mouse already has a context menu — the right button — and
   * the browser's own is the one that carries "Open link in new
   * tab", "Copy link address" and the page translation a
   * consumer cannot reproduce. Taking it over to show four app
   * actions is a net loss on a desktop and a net gain on a phone,
   * where the native long-press menu offers a link preview and
   * nothing else. Pass `["mouse"]` deliberately, for a surface
   * that is not a link and has no native menu worth keeping.
   */
  pointerTypes?: readonly string[]
}

/**
 * What the hook returns, to spread on the element that should
 * answer a press-and-hold. Every one of these is needed, and the
 * reasons are in the hook's own notes below.
 */
export type LongPressHandlers = {
  onClickCapture: (
    event: ReactMouseEvent<HTMLElement>,
  ) => void
  onContextMenu: (
    event: ReactMouseEvent<HTMLElement>,
  ) => void
  onPointerCancel: (
    event: ReactPointerEvent<HTMLElement>,
  ) => void
  onPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
  ) => void
  onPointerMove: (
    event: ReactPointerEvent<HTMLElement>,
  ) => void
  onPointerUp: (
    event: ReactPointerEvent<HTMLElement>,
  ) => void
}

const DEFAULT_HOLD_DURATION_MS = 500
const DEFAULT_MOVE_TOLERANCE_PX = 10
const DEFAULT_POINTER_TYPES = ["pen", "touch"] as const

/**
 * Press and hold — the touch gesture that opens a context menu,
 * picks a row, or otherwise does the second thing a tap does not.
 *
 * ### Two ways to fire, because one of them is not reliable
 *
 * The obvious implementation is a timer started on `pointerdown`
 * and cleared on move, up or cancel. That is here, and on its own
 * it misses presses on Android: Chrome recognises its **own**
 * long-press gesture at about the same 500ms and fires
 * `pointercancel` at the sequence, which clears the timer a beat
 * before it would have run. The press that felt longest is the
 * one most likely to do nothing.
 *
 * So the native `contextmenu` event is a **second trigger**, not
 * merely something to suppress: whichever arrives first fires the
 * callback, and `hasFiredRef` keeps it to one per press. The
 * default is prevented in the same breath, which is what stops
 * Chrome's menu and iOS's link callout from appearing over the
 * app's own.
 *
 * ⚠️ `contextmenu` carries no `pointerType`, so the kind of the
 * press is remembered from `pointerdown`. A right-click with a
 * mouse therefore passes straight through to the browser while
 * the default `pointerTypes` is in force — see the option.
 *
 * ### The click after the press
 *
 * A long press on a link still ends in a `click`, so without
 * `onClickCapture` the menu opens and the page navigates out from
 * under it. Suppressing it in the **capture** phase is what
 * reaches a handler on a child — a card whose whole body is an
 * anchor is the case this was written for.
 *
 * ### The CSS half
 *
 * Handlers cannot switch off iOS's callout; only
 * `-webkit-touch-callout: none` on the pressed element does. A
 * link without it shows the system preview sheet **over** the
 * menu this hook opened, and `preventDefault` on `contextmenu`
 * does not reach it, because Safari does not fire one.
 */
export const useLongPress = ({
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
  moveTolerancePx = DEFAULT_MOVE_TOLERANCE_PX,
  onLongPress,
  pointerTypes = DEFAULT_POINTER_TYPES,
}: LongPressOptions): LongPressHandlers => {
  const onLongPressRef = useLatestRef(onLongPress)

  const timerRef = useRef<number | null>(null)

  const hasFiredRef = useRef(false)

  const isArmedRef = useRef(false)

  const startPointRef = useRef<LongPressPoint>({
    clientX: 0,
    clientY: 0,
  })

  const clearTimer = () => {
    if (timerRef.current === null) {
      return
    }

    window.clearTimeout(timerRef.current)

    timerRef.current = null
  }

  // A press that is still being held when the element unmounts —
  // a card that leaves the queue under the finger — would
  // otherwise fire into a callback whose component is gone.
  //
  // Written out rather than returning `clearTimer`, which is a new
  // identity every render: as a dependency it would tear down and
  // re-arm this effect on each one, and as a missing dependency it
  // is a lint error. The ref is the only thing it needs.
  useEffect(
    () => () => {
      if (timerRef.current === null) {
        return
      }

      window.clearTimeout(timerRef.current)
    },
    [],
  )

  const fire = () => {
    clearTimer()

    if (hasFiredRef.current) {
      return
    }

    hasFiredRef.current = true

    onLongPressRef.current(startPointRef.current)
  }

  return {
    onClickCapture: (event) => {
      if (!hasFiredRef.current) {
        return
      }

      // The press has already done its work. This is the click the
      // browser synthesises on release, and following it would
      // navigate away from the menu that just opened.
      event.preventDefault()
      event.stopPropagation()

      hasFiredRef.current = false
    },

    onContextMenu: (event) => {
      if (!isArmedRef.current) {
        return
      }

      event.preventDefault()

      fire()
    },

    onPointerCancel: () => {
      isArmedRef.current = false

      clearTimer()
    },

    onPointerDown: (event) => {
      hasFiredRef.current = false

      isArmedRef.current = pointerTypes.includes(
        event.pointerType,
      )

      clearTimer()

      if (!isArmedRef.current) {
        return
      }

      startPointRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      }

      timerRef.current = window.setTimeout(
        fire,
        holdDurationMs,
      )
    },

    onPointerMove: (event) => {
      if (timerRef.current === null) {
        return
      }

      const { clientX, clientY } = startPointRef.current

      const hasTravelled =
        Math.abs(event.clientX - clientX) >
          moveTolerancePx ||
        Math.abs(event.clientY - clientY) > moveTolerancePx

      if (!hasTravelled) {
        return
      }

      // The press turned into a scroll or a drag. It is no longer
      // a candidate, and `isArmedRef` going false is what lets a
      // late `contextmenu` reach the browser again.
      isArmedRef.current = false

      clearTimer()
    },

    onPointerUp: () => {
      isArmedRef.current = false

      clearTimer()
    },
  }
}
