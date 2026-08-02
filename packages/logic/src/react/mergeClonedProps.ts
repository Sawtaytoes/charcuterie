/**
 * What a clone owes the element it clones.
 *
 * `cloneElement` is a **replace**, key by key, and for four of the
 * five kinds of prop a slot injects that is exactly right: an `id`,
 * an `aria-*`, a `className` — the wrapper is the later writer and
 * the later writer wins. Two kinds are not values at all, and
 * replacing them destroys something:
 *
 *  - **`ref`** is a *subscription*. A ref that is replaced is never
 *    called again and never told it was dropped, so whatever was
 *    holding that node — floating-ui's `refs.setReference`, a
 *    consumer's scroll-into-view, a measurement — is left pointed at
 *    nothing, silently, forever.
 *  - **`on*`** is a *listener*, and listeners are plural by nature.
 *
 * So those two compose and everything else keeps replacing. This is
 * the same rule `@charcuterie/ui`'s `mergeSlotProps` applies between
 * *two slots*; here it is applied between a slot and **the element
 * the caller wrote**, which is the half that had no rule at all:
 * `<Menu trigger={<Button ref={buttonRef} />} />` dropped
 * `buttonRef` on the floor, and the only symptom was a ref that
 * stayed `null`.
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
 * as the **same function**.
 *
 * This is not an optimisation, it is the difference between working
 * and hanging. React re-runs a callback ref whenever its identity
 * changes between renders — detaching with the old one, attaching
 * with the new — and both refs in play here are floating-ui
 * `setReference`s, which set state when they are called. A merged
 * ref rebuilt on every render would therefore call `setReference`
 * twice per render, each of which schedules the render that rebuilds
 * it again.
 *
 * A `WeakMap` of `WeakMap`s rather than a cache key, because the
 * keys *are* the identities being compared, and neither map keeps a
 * ref (or the component that owns it) alive.
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

    /**
     * Returning a cleanup is React 19's contract, and it has to be
     * honoured **per ref**: a ref that returned its own cleanup has
     * opted out of being called with `null`, and calling it with
     * `null` anyway is the legacy behaviour it opted out of. One
     * that returned nothing still expects the `null`.
     */
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

/**
 * Deliberately **not** memoised, unlike the refs above.
 *
 * Nothing observes a handler's identity the way React observes a
 * ref's — a new `onPointerEnter` every render is attached to the
 * same DOM node with no detach — and there would be nothing to cache
 * against anyway: floating-ui's `getReferenceProps()` composes its
 * handlers fresh on every call, so the pair being merged is a new
 * pair every time.
 */
const chainHandlers =
  (
    first: (...args: unknown[]) => unknown,
    second: (...args: unknown[]) => unknown,
  ) =>
  (...args: unknown[]) => {
    // The child's own handler first. It is the one the caller wrote
    // on the element they can see, and a wrapper reading
    // `defaultPrevented` needs it to have already run.
    first(...args)

    second(...args)
  }

const composeProp = (
  name: string,
  ownValue: unknown,
  injectedValue: unknown,
) => {
  if (
    name === "ref" &&
    isMergeableRef(ownValue) &&
    isMergeableRef(injectedValue)
  ) {
    return mergeRefs(ownValue, injectedValue)
  }

  if (
    isEventHandlerName(name) &&
    typeof ownValue === "function" &&
    typeof injectedValue === "function"
  ) {
    return chainHandlers(
      ownValue as (...args: unknown[]) => unknown,
      injectedValue as (...args: unknown[]) => unknown,
    )
  }

  return undefined
}

export const mergeClonedProps = (
  ownProps: Record<string, unknown>,
  injectedProps: Record<string, unknown>,
): Record<string, unknown> => ({
  ...injectedProps,
  ...Object.fromEntries(
    Object.entries(injectedProps).flatMap(
      ([name, injectedValue]): [string, unknown][] => {
        const composed = composeProp(
          name,
          ownProps[name],
          injectedValue,
        )

        // `undefined` is "nothing to compose", never a value —
        // every composition above produces a function.
        return composed === undefined
          ? []
          : [[name, composed]]
      },
    ),
  ),
})
