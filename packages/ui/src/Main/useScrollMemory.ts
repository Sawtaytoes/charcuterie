import { useCallback, useLayoutEffect, useRef } from "react"

import {
  enterScrollEntry,
  rememberScrollOffset,
  resolveScrollOffset,
  type ScrollEntry,
} from "./scrollMemory.ts"

/**
 * How long a restore keeps trying while the content is still
 * arriving.
 *
 * The offset cannot be applied until the scrollport is tall enough
 * to hold it, and on a client-rendered page it is not: the commit
 * that changes the route draws a skeleton, and the rows land a fetch
 * later. So the restore re-applies as the content grows, and gives
 * up after this. A page that takes longer than three seconds to fill
 * has already been read from the top, and moving it then is a worse
 * answer than leaving it where the reader put it.
 */
const RESTORE_WINDOW_MS = 3000

/** A scroll the reader asked for. It ends the restore at once. */
const READER_INTENT_EVENTS = [
  "keydown",
  "pointerdown",
  "touchstart",
  "wheel",
] as const

/**
 * Remember where this history entry was scrolled to, and put it back
 * when the reader returns to it.
 *
 * `scrollMemory.ts` says why the browser will not, and what an entry
 * that has never been seen should do. This is the part that has to
 * survive the two things a real page does:
 *
 *  1. **The content arrives late.** An offset applied against a
 *     600px skeleton clamps to `0` and looks like it did nothing. A
 *     `ResizeObserver` on the scrollport and on its content column
 *     re-applies the offset every time either grows, until the
 *     offset lands or the window closes.
 *  2. **The reader scrolls during all that.** Any wheel, touch, key
 *     or pointer press ends the restore immediately. The alternative
 *     is a page that jumps out from under somebody who has already
 *     started reading.
 *
 * The save is a passive `scroll` listener, suppressed while a
 * restore is in flight. Without that suppression the feature eats
 * itself: writing `scrollTop` on a still-short page clamps to `0`
 * and fires a `scroll` event reading `0`, which would be saved over
 * the very offset being restored.
 *
 * @param entry The history entry and the page it belongs to.
 *   `null` turns the memory off, which is what an app that renders
 *   no `ScrollMemoryProvider` gets.
 */
export const useScrollMemory = (
  entry: ScrollEntry | null | undefined,
) => {
  const elementRef = useRef<HTMLElement | null>(null)
  const isRestoringRef = useRef(false)

  // A ref rather than a query for the `<main>` id: the effect below
  // runs in the same commit that mounts the node, and only a ref can
  // say which node that was.
  //
  // `unknown` in, narrowed here, so the returned function is both a
  // `RefCallback<HTMLElement>` and something `mergeRefs` accepts —
  // that library's merge is typed for the prop-merging path, where
  // every value is `unknown`.
  const setElement = useCallback((node: unknown) => {
    elementRef.current =
      node instanceof HTMLElement ? node : null
  }, [])

  const key = entry?.key
  const path = entry?.path

  useLayoutEffect(() => {
    const element = elementRef.current

    if (
      !element ||
      key === undefined ||
      path === undefined
    ) {
      return undefined
    }

    const currentEntry = { key, path }

    // `null` means leave the scrollport alone: a search param
    // changed and the reader did not go anywhere. It is read BEFORE
    // this entry becomes the current one, because the answer depends
    // on the page the reader is arriving from.
    const offset = resolveScrollOffset(currentEntry)

    enterScrollEntry(currentEntry)

    // Seed the entry now rather than waiting for a `scroll` event.
    // A reader who opens a group and then follows a link never
    // scrolls in between, so without this the entry they came from
    // is one the memory has never seen — and Back would send them to
    // the top of a list they were half-way down.
    rememberScrollOffset(
      currentEntry,
      offset ?? element.scrollTop,
    )

    // The arrow defers the read of `applyOffset`, so the pieces can
    // be declared in the order they depend on each other rather than
    // in the order they are used.
    const observer = new ResizeObserver(() => {
      applyOffset()
    })

    const deadline = globalThis.setTimeout(() => {
      stopRestoring()
    }, RESTORE_WINDOW_MS)

    let isRestoring = offset !== null

    const teardown = () => {
      observer.disconnect()
      globalThis.clearTimeout(deadline)

      for (const eventName of READER_INTENT_EVENTS) {
        element.removeEventListener(
          eventName,
          stopRestoring,
        )
      }
    }

    const stopRestoring = () => {
      if (!isRestoring) {
        return
      }

      isRestoring = false
      isRestoringRef.current = false
      teardown()
    }

    const applyOffset = () => {
      if (!isRestoring || offset === null) {
        return
      }

      element.scrollTop = offset

      // Landed. Anything further would only fight the reader.
      if (element.scrollTop === offset) {
        stopRestoring()
      }
    }

    const onScroll = () => {
      if (isRestoringRef.current) {
        return
      }

      rememberScrollOffset(currentEntry, element.scrollTop)
    }

    isRestoringRef.current = isRestoring

    for (const eventName of READER_INTENT_EVENTS) {
      element.addEventListener(eventName, stopRestoring, {
        passive: true,
      })
    }

    // The scrollport's own height changes with the window; its
    // content column's changes when the rows land. Both move the
    // ceiling the offset is clamped against.
    observer.observe(element)

    for (const child of Array.from(element.children)) {
      observer.observe(child)
    }

    element.addEventListener("scroll", onScroll, {
      passive: true,
    })

    applyOffset()

    return () => {
      // Unconditional, unlike `stopRestoring` — a restore that
      // already landed still has an observer and four listeners on
      // an element the next entry is about to use, and a stale
      // observer that survives its effect applies a stale offset.
      isRestoring = false
      teardown()
      element.removeEventListener("scroll", onScroll)
    }
  }, [key, path])

  return setElement
}
