/**
 * The two props a slot may not overwrite, and how it merges them.
 *
 * `mergeSlotProps` next door settles the five *attributes* two
 * nested slots both write, and last-write-wins is right for four of
 * them. It is not right for the wiring, because neither of these is
 * a value:
 *
 *  - **`ref`** is a subscription. `Menu` and `Tooltip` on one trigger
 *    both hand it a floating-ui `refs.setReference` — the anchor each
 *    of them positions its panel against — and the inner one used to
 *    replace the outer one's. Nothing threw. The outer panel simply
 *    had no reference element, so floating-ui left it at
 *    `left: 0; top: 0` in the corner of the viewport, which reads as
 *    a CSS bug and is not one.
 *  - **`on*`** is a listener, and listeners are plural.
 *
 * ### Why this is not imported from `@charcuterie/logic`
 *
 * `useClonedChild`'s `mergeClonedProps` applies the same rule one
 * level down — between a slot and the element a caller wrote — and
 * the two are near-identical. Sharing them means a new public export
 * on `@charcuterie/logic`, which is a `minor`; this is a patch, and
 * the duplication is thirty lines against a wrong version number.
 * Queued in `docs/2026-08-02-reported-by-consumers-queued-for-1-1.md`.
 */

const isEventHandlerName = (name: string) =>
  /^on[A-Z]/.test(name)

type MergeableRef =
  | ((node: unknown) => unknown)
  | { current: unknown }

const isMergeableRef = (
  value: unknown,
): value is MergeableRef =>
  typeof value === "function" ||
  (typeof value === "object" &&
    value !== null &&
    "current" in value)

const setRef = (ref: MergeableRef, node: unknown) => {
  if (typeof ref === "function") {
    return ref(node)
  }

  ref.current = node

  return undefined
}

/**
 * Every pair of refs ever merged, so the same two always come back
 * as the **same function** — which is load-bearing rather than
 * frugal.
 *
 * React re-runs a callback ref whenever its identity changes between
 * renders, detaching with the old one and attaching with the new.
 * Both refs here are floating-ui `setReference`s, and calling one
 * sets state; a merged ref rebuilt every render would call both
 * twice per render, each call scheduling the render that rebuilds
 * it. `mergeSlotProps` is a plain function called during render, so
 * it cannot reach for `useMemo` — the memo has to be in the identity
 * of the inputs, which is what a `WeakMap` of `WeakMap`s is.
 */
const mergedRefs = new WeakMap<
  MergeableRef,
  WeakMap<MergeableRef, (node: unknown) => () => void>
>()

const mergeRefs = (
  first: MergeableRef,
  second: MergeableRef,
) => {
  const bySecond =
    mergedRefs.get(first) ??
    new WeakMap<
      MergeableRef,
      (node: unknown) => () => void
    >()

  mergedRefs.set(first, bySecond)

  const cached = bySecond.get(second)

  if (cached) {
    return cached
  }

  const merged = (node: unknown) => {
    const cleanups = [
      setRef(first, node),
      setRef(second, node),
    ]

    // Per ref: one that returned a cleanup has opted out of being
    // called with `null`, and one that did not still expects it.
    return () => {
      for (const [index, cleanup] of cleanups.entries()) {
        if (typeof cleanup === "function") {
          cleanup()
        } else {
          setRef(index === 0 ? first : second, null)
        }
      }
    }
  }

  bySecond.set(second, merged)

  return merged
}

const chainHandlers =
  (
    first: (...args: unknown[]) => unknown,
    second: (...args: unknown[]) => unknown,
  ) =>
  (...args: unknown[]) => {
    // Outer first, the same order `aria-describedby` is joined in:
    // the merge order is structural — whoever wrapped whom — and the
    // author of the nesting is the one who chose it.
    first(...args)

    second(...args)
  }

/**
 * The keys of `ownProps` that must not simply replace the ones
 * `receivedProps` arrived with. Spread **last**, over both.
 */
export const mergeSlotWiring = (
  receivedProps: Record<string, unknown>,
  ownProps: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(ownProps).flatMap(
      ([name, ownValue]): [string, unknown][] => {
        const receivedValue = receivedProps[name]

        if (
          name === "ref" &&
          isMergeableRef(receivedValue) &&
          isMergeableRef(ownValue)
        ) {
          return [
            [name, mergeRefs(receivedValue, ownValue)],
          ]
        }

        if (
          isEventHandlerName(name) &&
          typeof receivedValue === "function" &&
          typeof ownValue === "function"
        ) {
          return [
            [
              name,
              chainHandlers(
                receivedValue as (
                  ...args: unknown[]
                ) => unknown,
                ownValue as (...args: unknown[]) => unknown,
              ),
            ],
          ]
        }

        return []
      },
    ),
  )
