import { useLayoutEffect, useRef } from "react"

import { useLatestRef } from "./useLatestRef.ts"

/**
 * The attribute an animated child is identified by.
 *
 * A key rather than a position, because position is the thing
 * that changed. Matching on index would pair every item with
 * whatever now sits where it used to be, measure a delta of
 * zero, and animate nothing — which is exactly the "no
 * animation" this hook exists to fix, arrived at the long way.
 */
export const FLIP_KEY_ATTRIBUTE = "data-flip-key"

const DEFAULT_ITEM_SELECTOR = `[${FLIP_KEY_ATTRIBUTE}]`

/*
 * Module scope, not closures inside the hook. A helper defined in
 * the body is a new identity every render, which makes it a
 * dependency the layout effect can never satisfy — and the effect
 * must depend on `signature` alone. See the note on the effect.
 */
const itemsOf = (
  containerElement: HTMLElement,
  itemSelector: string,
) =>
  containerElement.querySelectorAll<HTMLElement>(
    itemSelector,
  )

const keyOf = (itemElement: HTMLElement) =>
  itemElement.getAttribute(FLIP_KEY_ATTRIBUTE)

/** Used only when the theme's motion tokens are not on the page. */
const FALLBACK_DURATION_MS = 200
const FALLBACK_EASING = "cubic-bezier(0.2, 0, 0, 1)"

export type FlipListOptions = {
  /**
   * What identifies "the list changed". Pass a join of the keys
   * in their current order, plus anything else that re-orders
   * them.
   *
   * It is the ONLY dependency the effect has, and that is
   * deliberate: the hook must run when the order changed and
   * must not run when a sibling re-rendered.
   */
  signature: string
  /**
   * False suppresses the animation for a paint that is not a
   * re-order — switching to a different list entirely, or the
   * first paint of one. Sliding twenty items in from wherever
   * the previous list happened to leave them is motion that
   * describes nothing.
   */
  isAnimating?: boolean
  /**
   * Which descendants move. Defaults to every element carrying
   * `data-flip-key`; narrow it when a list nests another list
   * that must not be measured with its parent.
   */
  itemSelector?: string
}

/**
 * FLIP for a list React itself renders and re-orders.
 *
 * **F**irst, **L**ast, **I**nvert, **P**lay: measure where each
 * child is, let it move, measure again, then animate it from the
 * old box to the new one. The element never actually travels —
 * it is already in its final position, wearing a transform that
 * decays to nothing.
 *
 * ### Why the first measurement happens during render
 *
 * The vanilla version of this measures, mutates, and measures
 * again inside one function. React splits those apart, because
 * the mutation IS the commit. So "First" has to be read in the
 * RENDER phase, where the DOM still holds the previous commit,
 * and "Last" plus the animation happen in a layout effect.
 *
 * Measuring the DOM during render is impure and this is the one
 * place it is correct: the pre-commit boxes exist nowhere else,
 * and the read has no effect on the tree. Under StrictMode's
 * double render it measures the same unchanged DOM twice.
 *
 * ### Duration comes from the theme, and so does reduced motion
 *
 * The timing is read off `--duration-normal` / `--easing-standard`
 * rather than hard-coded, so a list moves at the same speed as
 * every transition around it. That also means
 * `prefers-reduced-motion` is already handled: `@charcuterie/tokens`
 * collapses every duration to `0ms` inside that media query, so
 * the animation resolves to an instant jump without this hook
 * running a second `matchMedia` test that could disagree with
 * the stylesheet.
 *
 * An app with no theme on the page falls back to 200ms — inert,
 * not broken.
 *
 * ### It returns the ref rather than taking one
 *
 * One argument, one call site, no ref to declare. When the
 * container already has a ref for something else, combine them
 * with `mergeRefs` from this same entry point.
 *
 * ```tsx
 * const listRef = useFlipList({ signature: ids.join(",") })
 *
 * return (
 *   <ul ref={listRef}>
 *     {ids.map((id) => (
 *       <li data-flip-key={id} key={id}>…</li>
 *     ))}
 *   </ul>
 * )
 * ```
 */
export const useFlipList = <
  ContainerElement extends HTMLElement,
>({
  isAnimating = true,
  itemSelector = DEFAULT_ITEM_SELECTOR,
  signature,
}: FlipListOptions) => {
  const containerRef = useRef<ContainerElement | null>(null)
  const firstBoxes = useRef<Map<string, DOMRect> | null>(
    null,
  )
  const lastSignature = useRef<string | null>(null)

  /*
   * Held in refs so the layout effect can depend on `signature`
   * ALONE and have that be the truth rather than a suppressed
   * lint rule. `signature` changes exactly when the list
   * re-ordered; re-running the effect because a parent passed a
   * new inline `itemSelector` string would invert every item
   * against boxes that are no longer current.
   */
  const isAnimatingRef = useLatestRef(isAnimating)
  const itemSelectorRef = useLatestRef(itemSelector)

  // "First" — see the note above on why this is a render-phase
  // read. The signature guard is what stops it re-measuring on a
  // render that did not re-order anything.
  if (
    isAnimating &&
    containerRef.current &&
    lastSignature.current !== signature
  ) {
    const boxes = new Map<string, DOMRect>()

    for (const itemElement of itemsOf(
      containerRef.current,
      itemSelector,
    )) {
      const key = keyOf(itemElement)

      if (key != null) {
        boxes.set(key, itemElement.getBoundingClientRect())
      }
    }

    firstBoxes.current = boxes
  }

  useLayoutEffect(() => {
    const containerElement = containerRef.current
    const first = firstBoxes.current

    // Consumed either way. A stale set of boxes is worse than
    // none: the next re-order would invert against positions
    // from two commits ago and throw every item across the page.
    lastSignature.current = signature
    firstBoxes.current = null

    if (
      !containerElement ||
      !first ||
      !isAnimatingRef.current
    ) {
      return
    }

    // `defaultView` rather than the global, so this file reads no
    // DOM global at module scope and stays importable from the
    // main entry. No view means no layout, which means nothing to
    // animate.
    const view = containerElement.ownerDocument.defaultView

    if (!view) {
      return
    }

    const styles = view.getComputedStyle(containerElement)
    const themeDuration = Number.parseFloat(
      styles.getPropertyValue("--duration-normal"),
    )

    /*
     * `Number.isFinite`, NOT `|| FALLBACK`.
     *
     * Reduced motion sets the token to `0ms`, `parseFloat` returns
     * `0`, and `0` is falsy — so a `||` here would swap the user's
     * explicit "no motion" for the 200ms fallback and animate
     * hardest in the one case that asked not to. The fallback is
     * for a MISSING token, which parses to `NaN`, and those are
     * different states.
     */
    const duration = Number.isFinite(themeDuration)
      ? themeDuration
      : FALLBACK_DURATION_MS
    const easing =
      styles.getPropertyValue("--easing-standard").trim() ||
      FALLBACK_EASING

    // Reduced motion zeroes the token, and a zero-duration
    // animation is a no-op with a callback attached — cheaper to
    // skip than to schedule one per item.
    if (duration <= 0) {
      return
    }

    for (const itemElement of itemsOf(
      containerElement,
      itemSelectorRef.current,
    )) {
      const key = keyOf(itemElement)
      const start = key == null ? undefined : first.get(key)

      // An item that was not in the previous commit has no box to
      // come from, so it fades in where it landed rather than
      // sliding from an invented position.
      if (!start) {
        itemElement.animate(
          [
            { opacity: 0, transform: "scale(0.92)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: duration * 0.75, easing },
        )

        continue
      }

      const last = itemElement.getBoundingClientRect()
      const deltaX = start.left - last.left
      const deltaY = start.top - last.top

      if (deltaX === 0 && deltaY === 0) {
        continue
      }

      itemElement.animate(
        [
          {
            transform: `translate(${deltaX}px, ${deltaY}px)`,
          },
          { transform: "none" },
        ],
        { duration, easing },
      )
    }
    // `signature` is the whole dependency, and the refs above are
    // why that is complete rather than suppressed.
  }, [isAnimatingRef, itemSelectorRef, signature])

  return containerRef
}
