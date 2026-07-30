import type { RefObject } from "react"
import { useEffect, useRef, useState } from "react"

/**
 * The element's full text, but only while that text is wider than
 * the box it was given — i.e. only while an ellipsis is being
 * painted. `undefined` the rest of the time.
 *
 * `text-overflow: ellipsis` leaves no trace in the DOM: the glyph is
 * painted by the layout engine and the whole string stays in
 * `textContent`. That is the good news — selection, copy, and every
 * screen reader still get all of it — and the reason this hook has
 * to exist, because nothing in the DOM says "this one is cut off",
 * so a hover affordance cannot be attached declaratively.
 *
 * Measured rather than assumed, since the alternative — always
 * setting a `title` — puts a tooltip on every short status pill in a
 * bay list, which is worse than the problem it solves.
 *
 * The text is returned rather than a boolean so the caller never
 * reads `ref.current` during render.
 */
export const useIsTextClipped = (): [
  RefObject<HTMLSpanElement | null>,
  string | undefined,
] => {
  const elementRef = useRef<HTMLSpanElement>(null)

  const [clippedText, setClippedText] = useState<
    string | undefined
  >(undefined)

  // No dependency array: `children` is a `ReactNode`, so there is
  // nothing stable to compare against, and a re-render is exactly
  // when the text may have changed. `setState` bails out on an equal
  // value, so the common case costs one `scrollWidth` read.
  useEffect(() => {
    const element = elementRef.current

    if (!element) {
      return
    }

    setClippedText(
      element.scrollWidth > element.clientWidth
        ? (element.textContent ?? undefined)
        : undefined,
    )
  })

  // And a resize of the *container* changes the answer without
  // re-rendering anything — which is the container-query case this
  // whole library is built around.
  useEffect(() => {
    const element = elementRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver(() => {
      setClippedText(
        element.scrollWidth > element.clientWidth
          ? (element.textContent ?? undefined)
          : undefined,
      )
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  return [elementRef, clippedText]
}
