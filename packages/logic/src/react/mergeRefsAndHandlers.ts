/**
 * The two things a clone or a slot may not simply overwrite, and
 * how each is composed — the shared primitives behind both
 * `mergeClonedProps` (a slot over the element a caller wrote) and
 * `@charcuterie/ui`'s `mergeSlotWiring` (one slot over another).
 *
 * Both faced the identical problem: `cloneElement` and a slot spread
 * are **replaces**, key by key, and for a value prop — an `id`, an
 * `aria-*`, a `className` — the later writer winning is exactly
 * right. Two kinds of prop are not values, and replacing them
 * destroys something:
 *
 *  - **`ref`** is a *subscription*. A ref that is replaced is never
 *    called again and never told it was dropped, so whatever held
 *    that node — floating-ui's `refs.setReference`, a scroll-into-
 *    view, a measurement — is left pointed at nothing, silently.
 *  - **`on*`** is a *listener*, and listeners are plural by nature.
 *
 * Lifted here so the rule lives once. This is the **React 19**
 * flavour: `mergeRefs` honours the callback-ref cleanup contract.
 * The Preact binding keeps its own `mergeRefs` next door because
 * Preact has no ref-cleanup return, and that difference is the one
 * thing these two could not share.
 */

/** `onClick`, `onPointerEnter` — a listener, not a value. */
export const isEventHandlerName = (name: string) =>
  /^on[A-Z]/.test(name)

export type MergeableRef =
  | ((node: unknown) => unknown)
  | { current: unknown }

export const isMergeableRef = (
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
 * it. The callers are plain functions run during render, so they
 * cannot reach for `useMemo` — the memo has to be in the identity
 * of the inputs, which is what a `WeakMap` of `WeakMap`s is.
 */
const mergedRefs = new WeakMap<
  MergeableRef,
  WeakMap<MergeableRef, (node: unknown) => () => void>
>()

export const mergeRefs = (
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

/**
 * Chain two handlers, `first` then `second`. The caller decides the
 * order — a clone runs the child's own handler first (a wrapper
 * reading `defaultPrevented` needs it to have run); a slot merge
 * runs the outer one first (the order `aria-describedby` is joined
 * in). Deliberately **not** memoised: nothing observes a handler's
 * identity the way React observes a ref's, and floating-ui composes
 * fresh handlers on every call anyway.
 */
export const chainHandlers =
  (
    first: (...args: unknown[]) => unknown,
    second: (...args: unknown[]) => unknown,
  ) =>
  (...args: unknown[]) => {
    first(...args)

    second(...args)
  }
