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
 *
 * The `ref`/`on*` primitives live in `./mergeRefsAndHandlers.ts` —
 * `mergeSlotWiring` in `@charcuterie/ui` faced the identical problem
 * one level up and used to carry a byte-identical copy of them.
 */

import {
  chainHandlers,
  isEventHandlerName,
  isMergeableRef,
  mergeRefs,
} from "./mergeRefsAndHandlers.ts"

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
