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
 * **Difference 1: no cleanup is returned, and none is remembered.**
 * React 19's ref-cleanup contract is newer than this package's
 * `preact >=10.11` floor, so the merged ref stays on the shape every
 * version understands: called with the node, called again with
 * `null`, and it forwards both.
 *
 * Remembering each composed ref's cleanup was the first version and
 * it is wrong here. The merged function is **cached by its inputs**,
 * so two elements composing the same pair of refs share one
 * function — and a cleanup list held in that function's closure is
 * then shared between them, where the second mount overwrites the
 * first's. The React binding has no such state: its cleanups are
 * local to each attach.
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

  const merged = (node: unknown) => {
    setRef(first, node)

    setRef(second, node)
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
