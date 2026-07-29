// Mirror of `../react/useClonedChild.ts`.

import type { VNode } from "preact"
import { cloneElement, toChildArray } from "preact"
import { useMemo, useRef } from "preact/hooks"

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

export const useClonedChild = <
  Props extends Record<string, unknown>,
>(
  child: VNode | VNode[],
  childProps: Props,
) => {
  const stableProps = useShallowStable(childProps)

  return useMemo(
    () => cloneElement(getOnlyChild(child), stableProps),
    [child, stableProps],
  )
}
