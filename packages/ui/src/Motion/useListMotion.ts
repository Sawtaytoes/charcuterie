import type { HTMLAttributes } from "react"
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import {
  getAnimationLengthMs,
  getTransitionLengthMs,
} from "./usePresence.ts"

/**
 * Motion for a list an action changes: an added item enters, a
 * removed one leaves, and the items around them slide to their new
 * places instead of jumping.
 *
 * ```tsx
 * const { entries } = useListMotion({ items: purchases, getKey: (p) => p.id })
 *
 * <AdaptiveGrid>
 *   {entries.map(({ item, key, motionProps }) => (
 *     <div key={key} {...motionProps}>
 *       <PurchaseCard purchase={item} />
 *     </div>
 *   ))}
 * </AdaptiveGrid>
 * ```
 *
 * ### The wrapper is the hook's
 *
 * `motionProps` go on an element the hook owns — usually a plain
 * wrapper `div` that is the list's direct child. The hook writes that
 * element's `translate` and `transition` inline while it slides, so it
 * must not be an element whose own styles carry those.
 *
 * ### Only what an action changed moves
 *
 * Items present on the first render do not animate in: a page that
 * loads should not perform. After that, a key the list has not seen
 * enters; a key that disappears stays in the list, `inert` and
 * `aria-hidden`, at the index it had, until its exit animation ends;
 * and when the order of keys changes, every item that moved slides
 * from where it was. A re-render that changes no key moves nothing,
 * so a window resize is never animated after the fact.
 *
 * ### The same three renderings as every other motion
 *
 * Exit lengths are read from the computed style (see `usePresence`),
 * and the slide is a CSS transition on the `--duration-normal` token.
 * Under reduced motion, in the frozen suites, and in a DOM with no CSS
 * engine, an exit is removed in the same commit and a slide has no
 * length.
 *
 * ### Why not `useFlipList`
 *
 * `@charcuterie/logic`'s `useFlipList` slides a list React re-orders,
 * and this hook measures the same way it does: the "before" positions
 * are read during the render that changes the order, from the commit
 * the user is looking at. It does not use that hook, for three
 * reasons. `useFlipList` animates with the Web Animations API, which
 * the suites' motion freeze cannot reach, so a frozen suite would
 * still shoot items mid-slide; it animates `transform`, which a
 * caller's own transform would fight; and it has no exits, which are
 * most of what this hook is for. The slide here is a CSS transition,
 * so the freeze and reduced motion remove it like every other motion.
 *
 * ### Enter classes come off when they finish
 *
 * An element that goes from `display: none` back to shown restarts
 * its CSS animation. So the enter class comes off when its animation
 * ends, or switching back to a hidden tab would replay "added" on an
 * item no action added.
 */
export type ListMotionProps = Pick<
  HTMLAttributes<HTMLElement>,
  "aria-hidden" | "className" | "inert"
> & {
  "data-motion-key": string
  ref: (node: HTMLElement | null) => void
}

export type ListMotionEntry<Item> = {
  /**
   * The item's index in `items`. A leaving item keeps the index it had
   * when it was removed, so a row that shows its position does not
   * read "0" while it leaves.
   */
  index: number
  /** Removed, and leaving. Already `inert` through `motionProps`. */
  isExiting: boolean
  item: Item
  key: string
  motionProps: ListMotionProps
}

export type UseListMotionOptions<Item> = {
  getKey: (item: Item) => string
  items: readonly Item[]
}

type ExitingItem<Item> = {
  index: number
  item: Item
  key: string
}

type Position = {
  left: number
  top: number
}

const ENTER_CLASS = "charcuterie-item-enter"

const ENTER_ANIMATION = "charcuterie-item-in"

const EXIT_CLASS = "charcuterie-item-exit"

const SLIDE_TRANSITION =
  "translate var(--duration-normal) var(--easing-standard)"

/** As in `usePresence`: a margin past the computed length, not a
 * design duration. */
const SAFETY_MARGIN_MS = 50

const readPosition = (element: HTMLElement): Position => ({
  left: element.offsetLeft,
  top: element.offsetTop,
})

export const useListMotion = <Item>({
  getKey,
  items,
}: UseListMotionOptions<Item>): {
  entries: ListMotionEntry<Item>[]
} => {
  // Compared by key, never by array identity. Callers routinely build
  // the array during render (`groupPurchases(recent)`), so an identity
  // check would see a "change" on every render — and this block sets
  // state during render, so that would re-render forever.
  const keySignature = JSON.stringify(items.map(getKey))

  const [previousKeySignature, setPreviousKeySignature] =
    useState(keySignature)

  // The items as of the last commit, so a removed item leaves showing
  // its latest content rather than what it held when the keys last
  // changed.
  const committedItemsRef = useRef(items)

  useLayoutEffect(() => {
    committedItemsRef.current = items
  })

  // The keys the last commit showed, in order, leaving items included.
  const shownKeysRef = useRef<readonly string[]>(
    items.map(getKey),
  )

  const [exiting, setExiting] = useState<
    ExitingItem<Item>[]
  >([])

  // Keys that arrived after the first render. They keep the enter
  // class while they are mounted; it only animates once, on mount.
  const [enteredKeys, setEnteredKeys] = useState<
    ReadonlySet<string>
  >(() => new Set())

  if (keySignature !== previousKeySignature) {
    // Read during render on purpose: the last committed list is the
    // one the user is looking at, and so the one items leave from.
    const previousItems = committedItemsRef.current

    const currentKeys = new Set(items.map(getKey))

    const previousKeys = new Set(previousItems.map(getKey))

    const removed = previousItems
      .map((item, index) => ({
        index,
        item,
        key: getKey(item),
      }))
      .filter((one) => !currentKeys.has(one.key))

    const added = items
      .map(getKey)
      .filter((key) => !previousKeys.has(key))

    setPreviousKeySignature(keySignature)

    if (removed.length > 0 || exiting.length > 0) {
      setExiting((previous) => [
        // A key that came back stops leaving.
        ...previous.filter(
          (one) => !currentKeys.has(one.key),
        ),
        ...removed.filter(
          (one) =>
            !previous.some(
              (exitingOne) => exitingOne.key === one.key,
            ),
        ),
      ])
    }

    if (added.length > 0) {
      setEnteredKeys(
        (previous) => new Set([...previous, ...added]),
      )
    }
  }

  const elementsRef = useRef(new Map<string, HTMLElement>())

  const refCallbacksRef = useRef(
    new Map<string, (node: HTMLElement | null) => void>(),
  )

  const getRef = useCallback((key: string) => {
    const existing = refCallbacksRef.current.get(key)

    if (existing) {
      return existing
    }

    let stopListening: (() => void) | undefined

    const callback = (node: HTMLElement | null) => {
      stopListening?.()

      stopListening = undefined

      if (node === null) {
        elementsRef.current.delete(key)

        // Dropped on detach, so a list whose keys keep changing does
        // not keep a callback for every key it ever showed. A key
        // that comes back gets a new one. Only this callback's own
        // entry: React detaches an old callback after a new one for
        // the same key may already be in the map.
        if (refCallbacksRef.current.get(key) === callback) {
          refCallbacksRef.current.delete(key)
        }

        return
      }

      elementsRef.current.set(key, node)

      // StrictMode detaches and re-attaches the same callback; put it
      // back so the next render hands React the same identity.
      if (!refCallbacksRef.current.has(key)) {
        refCallbacksRef.current.set(key, callback)
      }

      const onAnimationEnd = (event: AnimationEvent) => {
        if (
          event.target === node &&
          event.animationName === ENTER_ANIMATION
        ) {
          setEnteredKeys((previous) => {
            if (!previous.has(key)) {
              return previous
            }

            const next = new Set(previous)

            next.delete(key)

            return next
          })
        }
      }

      node.addEventListener("animationend", onAnimationEnd)

      stopListening = () => {
        node.removeEventListener(
          "animationend",
          onAnimationEnd,
        )
      }
    }

    refCallbacksRef.current.set(key, callback)

    return callback
  }, [])

  const exitingKeys = new Set(exiting.map((one) => one.key))

  // Each leaving item stays where the user last saw it: after the item
  // that was shown just before it, whether that one stayed, left too,
  // or was added in front of it since. A stored index would not hold:
  // in a newest-first list capped at three, `[A, B, C]` becoming
  // `[X, A, B]` would put the leaving C between A and B.
  const itemKeys = items.map(getKey)

  const itemKeySet = new Set(itemKeys)

  const exitingByKey = new Map(
    exiting.map((one) => [one.key, one]),
  )

  // Leaving items, by the key of the staying item they follow. `null`
  // holds the ones that were shown before every staying item.
  const exitingAfter = new Map<
    string | null,
    ExitingItem<Item>[]
  >()

  const placedKeys = new Set<string>()

  let lastStayingKey: string | null = null

  for (const key of shownKeysRef.current) {
    const one = exitingByKey.get(key)

    if (one !== undefined) {
      exitingAfter.set(lastStayingKey, [
        ...(exitingAfter.get(lastStayingKey) ?? []),
        one,
      ])

      placedKeys.add(key)
    } else if (itemKeySet.has(key)) {
      lastStayingKey = key
    }
  }

  // A leaving item the last commit did not show (removed in the same
  // batch that would have shown it) goes at the end.
  const unplaced = exiting.filter(
    (one) => !placedKeys.has(one.key),
  )

  const toExitingEntry = (
    one: ExitingItem<Item>,
  ): ListMotionEntry<Item> => ({
    index: one.index,
    isExiting: true,
    item: one.item,
    key: one.key,
    motionProps: {
      "aria-hidden": true,
      className: EXIT_CLASS,
      "data-motion-key": one.key,
      inert: true,
      ref: getRef(one.key),
    },
  })

  const entries: ListMotionEntry<Item>[] = [
    ...(exitingAfter.get(null) ?? []).map(toExitingEntry),
    ...items.flatMap((item, index) => {
      const key = itemKeys[index] ?? getKey(item)

      return [
        {
          index,
          isExiting: false,
          item,
          key,
          motionProps: {
            className: enteredKeys.has(key)
              ? ENTER_CLASS
              : undefined,
            "data-motion-key": key,
            ref: getRef(key),
          },
        },
        ...(exitingAfter.get(key) ?? []).map(
          toExitingEntry,
        ),
      ]
    }),
    ...unplaced.map(toExitingEntry),
  ]

  // The order this commit shows, leaving items included, which is
  // where the next change places what leaves.
  useLayoutEffect(() => {
    shownKeysRef.current = entries.map((entry) => entry.key)
  })

  const finishExit = useCallback((key: string) => {
    setExiting((previous) =>
      previous.filter((one) => one.key !== key),
    )

    setEnteredKeys((previous) => {
      if (!previous.has(key)) {
        return previous
      }

      const next = new Set(previous)

      next.delete(key)

      return next
    })
  }, [])

  const watchersRef = useRef(new Map<string, () => void>())

  const exitingSignature = [...exitingKeys]
    .sort()
    .join("\n")

  // Watch each leaving element for the end of its exit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the signature is the set of leaving keys, which is what this effect depends on.
  useLayoutEffect(() => {
    const watchers = watchersRef.current

    for (const [key, stop] of watchers) {
      if (!exitingKeys.has(key)) {
        stop()

        watchers.delete(key)
      }
    }

    for (const key of exitingKeys) {
      if (watchers.has(key)) {
        continue
      }

      const element = elementsRef.current.get(key)

      const lengthMs =
        element === undefined
          ? 0
          : getAnimationLengthMs(element)

      if (element === undefined || lengthMs === 0) {
        finishExit(key)

        continue
      }

      const onAnimationEnd = (event: AnimationEvent) => {
        if (event.target === element) {
          finishExit(key)
        }
      }

      element.addEventListener(
        "animationend",
        onAnimationEnd,
      )

      const timer = globalThis.setTimeout(() => {
        finishExit(key)
      }, lengthMs + SAFETY_MARGIN_MS)

      watchers.set(key, () => {
        element.removeEventListener(
          "animationend",
          onAnimationEnd,
        )

        globalThis.clearTimeout(timer)
      })
    }
  }, [exitingSignature, finishExit])

  useLayoutEffect(
    () => () => {
      for (const stop of watchersRef.current.values()) {
        stop()
      }

      watchersRef.current.clear()
    },
    [],
  )

  const orderSignature = entries
    .map((entry) => entry.key)
    .join("\n")

  // The order the DOM shows now: the last committed one.
  const committedOrderRef = useRef(orderSignature)

  const firstPositionsRef = useRef<Map<
    string,
    Position
  > | null>(null)

  // The listener of the slide each element is running, if any.
  const slideStopsRef = useRef(
    new Map<HTMLElement, () => void>(),
  )

  // "First", read during the render that changes the order, while the
  // DOM still holds the commit the user is looking at. Read any
  // earlier and a row that grew in between, with no key change, would
  // send every row below it sliding from where it used to be. This is
  // `useFlipList`'s reason too; reading layout here has no effect on
  // the tree, and a repeated render reads the same unchanged DOM.
  if (committedOrderRef.current !== orderSignature) {
    const positions = new Map<string, Position>()

    for (const [key, element] of elementsRef.current) {
      positions.set(key, readPosition(element))
    }

    firstPositionsRef.current = positions
  }

  // Slide every item that the change moved. Positions are offsets
  // inside the list's own box, so scrolling the page between two
  // renders is not mistaken for a move.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the order of keys changes; the positions it reads are in refs.
  useLayoutEffect(() => {
    const previousPositions = firstPositionsRef.current

    // Consumed either way: a stale set of positions is worse than
    // none.
    firstPositionsRef.current = null

    if (committedOrderRef.current === orderSignature) {
      return
    }

    committedOrderRef.current = orderSignature

    if (previousPositions === null) {
      return
    }

    for (const [key, element] of elementsRef.current) {
      const before = previousPositions.get(key)

      const after = readPosition(element)

      if (before === undefined || exitingKeys.has(key)) {
        continue
      }

      const deltaLeft = before.left - after.left

      const deltaTop = before.top - after.top

      if (deltaLeft === 0 && deltaTop === 0) {
        continue
      }

      // A slide that starts while the last one runs takes over from
      // it. The last one's listener goes first, without touching the
      // style: if it ran on the cancel this slide causes, it would
      // clear the `transition` this slide is about to set, and a
      // browser that follows the spec would then stop this slide dead.
      slideStopsRef.current.get(element)?.()

      element.style.transition = "none"

      element.style.translate = `${deltaLeft}px ${deltaTop}px`

      // Commit the inverted position before transitioning out of it,
      // or the browser coalesces both writes and nothing moves.
      element.getBoundingClientRect()

      element.style.transition = SLIDE_TRANSITION

      element.style.translate = ""

      // Reduced motion and the frozen suites make the slide 0s long,
      // and a 0s transition never starts, so it would never end and
      // never clear what it wrote.
      if (getTransitionLengthMs(element) === 0) {
        element.style.transition = ""

        continue
      }

      const stop = () => {
        element.removeEventListener("transitionend", clear)

        element.removeEventListener(
          "transitioncancel",
          clear,
        )

        slideStopsRef.current.delete(element)
      }

      const clear = (event: TransitionEvent) => {
        if (event.target !== element) {
          return
        }

        element.style.transition = ""

        stop()
      }

      element.addEventListener("transitionend", clear)

      element.addEventListener("transitioncancel", clear)

      slideStopsRef.current.set(element, stop)
    }
  }, [orderSignature])

  return { entries }
}
