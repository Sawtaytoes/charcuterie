// Mirror of `../react/useClonedChild.ts`.

import type { VNode } from "preact"
import { cloneElement, toChildArray } from "preact"
import { useMemo, useRef } from "preact/hooks"

import { mergeClonedProps } from "./mergeClonedProps.ts"

const isShallowEqual = (
  first: Record<string, unknown>,
  second: Record<string, unknown>,
) => {
  const firstKeys = Object.keys(first)

  return (
    firstKeys.length === Object.keys(second).length &&
    firstKeys.every((key) =>
      Object.is(first[key], second[key]),
    )
  )
}

const useShallowStable = <
  Value extends Record<string, unknown>,
>(
  value: Value,
) => {
  const ref = useRef(value)

  if (!isShallowEqual(ref.current, value)) {
    ref.current = value
  }

  return ref.current
}

/**
 * Preact has no `Children.only`, so the slot contract is checked
 * against `toChildArray` — which also drops `null`, `undefined`,
 * and booleans, exactly the values a conditional child renders
 * to. A `{isOpen && <Button/>}` that is currently false is zero
 * children, and saying so beats cloning `false`.
 */
const getOnlyChild = (child: VNode | VNode[]) => {
  const children = toChildArray(child)

  if (children.length !== 1) {
    throw new Error(
      `useClonedChild expects exactly one child element, got ${children.length}.`,
    )
  }

  const onlyChild = children[0]

  if (typeof onlyChild !== "object") {
    throw new Error(
      "useClonedChild expects an element, not bare text — there is nothing to attach props to.",
    )
  }

  return onlyChild
}

/**
 * The clone **composes** with what the child element already
 * carried, rather than overwriting it: a `ref` is a subscription and
 * an `on*` is a listener, and neither survives being replaced. See
 * `mergeClonedProps`.
 */
export const useClonedChild = <
  Props extends Record<string, unknown>,
>(
  child: VNode | VNode[],
  childProps: Props,
) => {
  const stableProps = useShallowStable(childProps)

  return useMemo(() => {
    const onlyChild = getOnlyChild(child)

    return cloneElement(
      onlyChild,
      mergeClonedProps(
        // Preact keeps the ref on the vnode rather than in its
        // props, so it is put back alongside them here — the merge
        // is over one shape in both bindings.
        {
          ...(onlyChild.props as Record<string, unknown>),
          ref: onlyChild.ref,
        },
        stableProps,
      ),
    )
  }, [child, stableProps])
}
