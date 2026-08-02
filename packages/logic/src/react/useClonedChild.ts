import type { ReactElement } from "react"
import {
  Children,
  cloneElement,
  useMemo,
  useRef,
} from "react"

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

/**
 * Keeps the same object as long as its contents are unchanged.
 *
 * Writing a ref during render looks alarming and is the correct
 * tool here: this is a pure cache, so a render React throws away
 * and re-runs produces the same answer. Nothing observable
 * happens, and no effect depends on it having run.
 *
 * The alternative is what v1 did — pass the props object's own
 * values as the dependency array — which changes the array's
 * *length* whenever the caller passes a different number of
 * props. React reads dependencies positionally, so that is not a
 * lint nit: it silently compares unrelated slots and the memo
 * returns a stale clone.
 */
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
 * The children-first composition pattern, kept verbatim from v1
 * because it is the right one: a `VisibilityTrigger` wraps
 * whatever button you already have rather than making you adopt
 * its own.
 *
 * ```tsx
 * <VisibilityTrigger>
 *   <Button>Open</Button>
 * </VisibilityTrigger>
 * ```
 *
 * The clone keeps its identity while the injected props are
 * shallow-equal, so a `memo()`'d child is not re-rendered by its
 * wrapper on every parent render.
 *
 * ### The clone composes, it does not overwrite
 *
 * `cloneElement` replaces every key it is given, which is right for
 * values and wrong for the two props that are not values: a `ref` is
 * a subscription and an `on*` is a listener. Both are merged with
 * whatever the child element already carried — see
 * `mergeClonedProps` for the reasoning — so
 * `<Menu trigger={<Button ref={buttonRef} onClick={toggle} />} />`
 * keeps both of the caller's and adds the menu's.
 */
export const useClonedChild = <
  Props extends Record<string, unknown>,
>(
  child: ReactElement,
  childProps: Props,
) => {
  const stableProps = useShallowStable(childProps)

  return useMemo(() => {
    // Throws a useful error on zero or several children, which is
    // the whole contract of a slot.
    const onlyChild = Children.only(child) as ReactElement<
      Record<string, unknown>
    >

    return cloneElement(
      onlyChild,
      mergeClonedProps(onlyChild.props, stableProps),
    )
  }, [child, stableProps])
}
