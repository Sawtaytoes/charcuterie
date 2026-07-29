import type { ReactElement } from "react"
import {
  Children,
  cloneElement,
  useMemo,
  useRef,
} from "react"

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
 */
export const useClonedChild = <
  Props extends Record<string, unknown>,
>(
  child: ReactElement,
  childProps: Props,
) => {
  const stableProps = useShallowStable(childProps)

  return useMemo(
    () =>
      cloneElement(
        // Throws a useful error on zero or several children,
        // which is the whole contract of a slot.
        Children.only(child),
        stableProps,
      ),
    [child, stableProps],
  )
}
