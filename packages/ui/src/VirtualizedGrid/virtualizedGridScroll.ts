import { useLayoutEffect, useRef, useState } from "react"

import type { ScrollOwner } from "./virtualizedGridTypes.ts"

/**
 * The closest ancestor that owns vertical scrolling.
 *
 * The computed value is enough. An `overflow-y:auto` ancestor can
 * be shorter than its contents only AFTER this grid installs its
 * virtual spacer, so requiring `scrollHeight > clientHeight` here
 * would miss the owner on the first commit and create the exact
 * document scrollbar this lookup prevents.
 */
export const findScrollOwner = (
  element: HTMLElement,
): ScrollOwner => {
  let ancestor = element.parentElement

  while (ancestor) {
    const overflow = getComputedStyle(ancestor).overflowY

    if (overflow === "auto" || overflow === "scroll") {
      return { element: ancestor, kind: "element" }
    }

    ancestor = ancestor.parentElement
  }

  return { kind: "window" }
}

/**
 * The offset from the scroll owner's content origin to the grid.
 *
 * Both formulas stay stable while their owner scrolls: the grid's
 * viewport-relative top falls by the same amount that `scrollY` or
 * `scrollTop` rises. The element path subtracts its border because
 * a scroll offset starts at the padding edge, not at the outer
 * border returned by `getBoundingClientRect()`.
 */
export const useScrollMargin = (
  scrollOwner: ScrollOwner,
) => {
  const gridElement = useRef<HTMLUListElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const element = gridElement.current

    if (!element) {
      return
    }

    const gridTop = element.getBoundingClientRect().top
    const next =
      scrollOwner.kind === "window"
        ? gridTop + window.scrollY
        : gridTop -
          scrollOwner.element.getBoundingClientRect().top -
          scrollOwner.element.clientTop +
          scrollOwner.element.scrollTop

    setScrollMargin((current) =>
      current === next ? current : next,
    )
  })

  return { gridElement, scrollMargin }
}
