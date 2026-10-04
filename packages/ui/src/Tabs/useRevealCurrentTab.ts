import { useLayoutEffect, useRef } from "react"
import type { TabsOrientation } from "./tabItems.ts"

/** Reveal within the tab bar only; never scroll an ancestor or move focus. */
export function useRevealCurrentTab(
  currentKey: string | null,
  orientation: TabsOrientation,
) {
  const containerRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || currentKey === null) return
    let isActive = true
    const reveal = () => {
      if (!isActive) return
      // In manual panel mode, the focused tab can differ from the selected tab.
      const focused = container.ownerDocument.activeElement
      const current =
        focused instanceof HTMLElement &&
        container.contains(focused) &&
        focused.matches('a, [role="tab"]')
          ? focused
          : container.querySelector<HTMLElement>(
              '[aria-current="page"], [aria-selected="true"]',
            )
      if (!current) return
      const viewport = container.getBoundingClientRect()
      const target = current.getBoundingClientRect()
      const start =
        orientation === "horizontal"
          ? target.left
          : target.top
      const end =
        orientation === "horizontal"
          ? target.right
          : target.bottom
      const viewStart =
        orientation === "horizontal"
          ? viewport.left
          : viewport.top
      const viewEnd =
        orientation === "horizontal"
          ? viewport.right
          : viewport.bottom
      const hasOversize = end - start > viewEnd - viewStart
      const isRtl =
        orientation === "horizontal" &&
        getComputedStyle(container).direction === "rtl"
      const delta = hasOversize
        ? isRtl
          ? end - viewEnd
          : start - viewStart
        : start < viewStart
          ? start - viewStart
          : end > viewEnd
            ? end - viewEnd
            : 0
      if (orientation === "horizontal")
        container.scrollLeft += delta
      else container.scrollTop += delta
    }
    const frame = { id: 0 }
    const scheduleReveal = () => {
      cancelAnimationFrame(frame.id)
      frame.id = requestAnimationFrame(reveal)
    }
    const sizes = new ResizeObserver(scheduleReveal)
    const observeItems = () => {
      sizes.disconnect()
      sizes.observe(container)
      for (const child of container.children)
        sizes.observe(child)
      reveal()
    }
    const contents = new MutationObserver(observeItems)
    contents.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    container.addEventListener("focusin", reveal)
    observeItems()
    void container.ownerDocument.fonts.ready.then(reveal)
    return () => {
      isActive = false
      cancelAnimationFrame(frame.id)
      sizes.disconnect()
      contents.disconnect()
      container.removeEventListener("focusin", reveal)
    }
  }, [currentKey, orientation])
  return containerRef
}
