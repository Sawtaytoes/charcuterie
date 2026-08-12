import { useState } from "react"

import type { TreeOptions } from "../core/createTree.ts"
import { createTree } from "../core/createTree.ts"
import { useLatestRef } from "./useLatestRef.ts"
import { useStoreValue } from "./useStoreValue.ts"

/**
 * A normalized editor tree for nestable group builders — Mail
 * Sifter's AND/OR rules, mux-magic's any/all/none DSL.
 *
 * Built once via `useState` and never recreated, because recreating
 * it throws away the tree it exists to hold; `onChange` is trampolined
 * through `useLatestRef` so a fresh handler each render still fires.
 *
 * The core is returned alongside a live `state`, so the same value is
 * both the `Tree` instance a `QueryBuilder` subscribes to and a
 * reactive snapshot a consumer can render off directly.
 */
export const useTree = <Combinator, Leaf>({
  onChange,
  ...treeOptions
}: TreeOptions<Combinator, Leaf>) => {
  const onChangeRef = useLatestRef(onChange)

  const [core] = useState(() =>
    createTree<Combinator, Leaf>({
      ...treeOptions,
      onChange: (nextState) => {
        onChangeRef.current?.(nextState)
      },
    }),
  )

  const state = useStoreValue(core)

  return {
    addGroup: core.addGroup,
    addLeaf: core.addLeaf,
    getState: core.getState,
    moveNode: core.moveNode,
    patchLeaf: core.patchLeaf,
    removeNode: core.removeNode,
    serialize: core.serialize,
    setCombinator: core.setCombinator,
    state,
    subscribe: core.subscribe,
  }
}
