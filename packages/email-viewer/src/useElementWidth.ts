import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

/**
 * The measured inner width of one element, in CSS pixels, kept current as it
 * resizes. 0 until it has been measured.
 *
 * A `ResizeObserver` rather than a window listener, because the thing being
 * measured is not the window: the message frame loses a docked drawer's width
 * the moment it opens, and gains it back when it retracts — neither of which
 * is a window resize. It is a callback ref rather than an effect on a
 * `useRef`, so the first measurement happens when the node arrives instead of
 * one paint later — and because a frame inside a modal arrives through a
 * portal whose node an effect creates, an effect over a `useRef` can run
 * before the node exists and never run again.
 */
export const useElementWidth = <
  Element extends HTMLElement,
>(): [(node: Element | null) => void, number] => {
  const [width, setWidth] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)

  useEffect(() => () => observer.current?.disconnect(), [])

  const measure = useCallback((node: Element | null) => {
    observer.current?.disconnect()
    if (!node) return
    setWidth(Math.round(node.clientWidth))
    if (typeof ResizeObserver === "undefined") return
    observer.current = new ResizeObserver(([entry]) => {
      if (entry)
        setWidth(Math.round(entry.contentRect.width))
    })
    observer.current.observe(node)
  }, [])

  return [measure, width]
}
