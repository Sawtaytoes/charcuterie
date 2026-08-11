import type { RefObject } from "react"
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { chooseVisibleCount } from "./chooseVisibleCount.ts"

/**
 * The measuring half of progressive overflow — `chooseVisibleCount`
 * is the decision, this is the tape measure.
 *
 * ## Measured, not breakpointed
 *
 * mux-magic collapses at a hardcoded `480px` and plex-channels at a
 * hardcoded `760px`, and both numbers are wrong the moment a label
 * gets longer, the density axis changes, or a rail takes half the
 * row. A measured bar has no number to be wrong: it asks the
 * elements how wide they actually are, in the font and density they
 * are actually rendered in.
 *
 * ## One instance, and cached widths
 *
 * An item that has collapsed is **not in the DOM** — that is the
 * whole point, against a mechanism that renders every action twice
 * and hides one with a CSS specificity coin-flip. So its width
 * cannot be re-read while it is away, and it is remembered from
 * when it was last in the bar instead.
 *
 * The first paint is what seeds the cache: every item starts in the
 * bar (`chooseVisibleCount` returns all of them for an unmeasured
 * container), gets measured, and the row collapses **before paint**
 * because the measuring runs in a layout effect. Any item whose
 * width is still unknown forces one more all-visible pass rather
 * than being guessed at — one extra layout pass, and it converges,
 * because a mounted item always measures.
 *
 * ⚠️ **The measured element must not be sized by its own contents.**
 * If the bar shrink-wraps its items, collapsing one narrows the box,
 * which collapses another — a loop with no error anywhere.
 * `Toolbar`'s root is `flex-1 min-w-0` for exactly this reason, the
 * same trap `useAdaptiveColumns` documents about a container capped
 * by its own answer.
 */
export const useToolbarOverflow = ({
  itemKeys,
}: {
  /** Priority order, highest first. */
  itemKeys: readonly string[]
}): {
  containerRef: RefObject<HTMLDivElement | null>
  /** Callback ref for each item's box. `null` on unmount. */
  trackItem: (
    key: string,
    element: HTMLElement | null,
  ) => void
  /** Callback ref for the overflow trigger's box. */
  trackTrigger: (element: HTMLElement | null) => void
  visibleCount: number
} => {
  const containerRef = useRef<HTMLDivElement>(null)

  const itemElements = useRef(
    new Map<string, HTMLElement>(),
  )

  const triggerElement = useRef<HTMLElement | null>(null)

  const itemInlineSizes = useRef(new Map<string, number>())

  /**
   * Zero until the trigger has been in the row once.
   *
   * A bar that has never overflowed has no trigger to measure, and
   * the very first decision to collapse is taken without one. It
   * errs the only safe way: with the trigger costed at nothing, the
   * chosen count is at worst one item too many, which resolves on
   * the next pass once the trigger exists and measures.
   */
  const triggerInlineSize = useRef(0)

  const [visibleCount, setVisibleCount] = useState(
    itemKeys.length,
  )

  /**
   * Written during render, and deliberately.
   *
   * `itemKeys` is a fresh array on every render of the caller, so
   * depending on it would give `measure` a new identity each time
   * — which re-subscribes the `ResizeObserver` on every render. A
   * ref is a pure cache here: a render React throws away and
   * re-runs writes the same value, and nothing observable happens.
   * Same reasoning as `useClonedChild`'s `useShallowStable`.
   */
  const itemKeysRef = useRef(itemKeys)

  itemKeysRef.current = itemKeys

  const measure = useCallback(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const keys = itemKeysRef.current

    for (const [key, element] of itemElements.current) {
      itemInlineSizes.current.set(
        key,
        element.getBoundingClientRect().width,
      )
    }

    if (triggerElement.current) {
      triggerInlineSize.current =
        triggerElement.current.getBoundingClientRect().width
    }

    const hasEveryWidth = keys.every((key) =>
      itemInlineSizes.current.has(key),
    )

    const next = hasEveryWidth
      ? chooseVisibleCount({
          availableInlineSize: container.clientWidth,
          gapInlineSize:
            Number.parseFloat(
              getComputedStyle(container).columnGap,
            ) || 0,
          itemInlineSizes: keys.map(
            (key) => itemInlineSizes.current.get(key) ?? 0,
          ),
          triggerInlineSize: triggerInlineSize.current,
        })
      : // An item that has never been mounted has no width. Show
        // everything for one pass so it can be measured, rather
        // than guessing a number and collapsing around it.
        keys.length

    setVisibleCount((current) =>
      current === next ? current : next,
    )
  }, [])

  /**
   * A layout effect, not an effect: it runs after the DOM is
   * written and **before the browser paints**, so the collapse that
   * follows the first measurement is never a visible flash of a bar
   * too wide for its box.
   *
   * No dependency array — it re-measures after every render, which
   * is what keeps a changed label or a new item honest. It is cheap
   * and it converges: `setVisibleCount` bails on an unchanged
   * answer, so a stable bar renders once and stops.
   */
  useLayoutEffect(measure)

  useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    /**
     * Only when the **box** changed.
     *
     * A `ResizeObserver` delivers a record on observe and again for
     * every content reflow inside the frame it fired in, and
     * measuring from each one is what raises chromium's
     * "ResizeObserver loop completed with undelivered
     * notifications" — the callback doing work that schedules more
     * observation. The item-side re-measure is already covered by
     * the layout effect above; this subscription exists for one
     * question, which is whether the container got wider or
     * narrower.
     */
    let lastInlineSize = -1

    const observer = new ResizeObserver(([entry]) => {
      const inlineSize =
        entry?.contentRect.width ??
        container.getBoundingClientRect().width

      if (inlineSize === lastInlineSize) {
        return
      }

      lastInlineSize = inlineSize

      measure()
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [measure])

  const trackItem = useCallback(
    (key: string, element: HTMLElement | null) => {
      if (element) {
        itemElements.current.set(key, element)
      } else {
        itemElements.current.delete(key)
      }
    },
    [],
  )

  const trackTrigger = useCallback(
    (element: HTMLElement | null) => {
      triggerElement.current = element
    },
    [],
  )

  return {
    containerRef,
    trackItem,
    trackTrigger,
    visibleCount,
  }
}
