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
 * ### Shared with `@charcuterie/logic`
 *
 * `useClonedChild`'s `mergeClonedProps` applies the identical rule
 * one level down — between a slot and the element a caller wrote —
 * so the `ref`/`on*` primitives (`mergeRefs`, `chainHandlers`, and
 * the two guards) are imported from `@charcuterie/logic` rather than
 * copied here, where they used to be a byte-for-byte duplicate. Only
 * `mergeSlotWiring` stays local: it merges the *other* direction
 * (own over received) and returns just the wiring keys, which is a
 * different function from `mergeClonedProps`.
 */

import {
  chainHandlers,
  isEventHandlerName,
  isMergeableRef,
  mergeRefs,
} from "@charcuterie/logic"

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
