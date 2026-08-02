// Mirror of `../react/mergeClonedProps.ts`, with the two
// differences Preact actually has. The reasoning for the rule
// itself lives there.

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

const mergedRefs = new WeakMap<
  MergeableRef,
  WeakMap<MergeableRef, (node: unknown) => void>
>()

/**
 * **Difference 1: no cleanup is returned.** React 19's ref-cleanup
 * contract is newer than this package's `preact >=10.11` floor, so
 * the merged ref stays on the shape every version understands — one
 * call with the node, one call with `null`.
 *
 * A composed ref that *does* return a cleanup is still honoured:
 * its cleanup is remembered and run in place of the `null` it opted
 * out of.
 */
const mergeRefs = (
  first: MergeableRef,
  second: MergeableRef,
) => {
  const bySecond =
    mergedRefs.get(first) ??
    new WeakMap<MergeableRef, (node: unknown) => void>()

  mergedRefs.set(first, bySecond)

  const cached = bySecond.get(second)

  if (cached) {
    return cached
  }

  let cleanups: unknown[] = []

  const merged = (node: unknown) => {
    if (node === null) {
      for (const [index, cleanup] of cleanups.entries()) {
        if (typeof cleanup === "function") {
          cleanup()
        } else {
          setRef(index === 0 ? first : second, null)
        }
      }

      cleanups = []

      return
    }

    cleanups = [setRef(first, node), setRef(second, node)]
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

/**
 * **Difference 2: the child's ref is not in `ownProps`.** Preact
 * keeps it on the vnode, and `cloneElement` reads `ref || vnode.ref`
 * — so an injected ref replaces it outright and the caller passes it
 * in here explicitly.
 */
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

        return composed === undefined
          ? []
          : [[name, composed]]
      },
    ),
  ),
})
