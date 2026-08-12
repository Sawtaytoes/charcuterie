/**
 * A normalized editor tree for nestable AND/OR — and any-combinator —
 * group builders.
 *
 * This is the state half of a query/rule builder: a group of leaves
 * and sub-groups, each group carrying a **combinator** the app owns
 * (`and`/`or` for Mail Sifter's rules, `any`/`all`/`none` for
 * mux-magic's DSL), each leaf carrying an opaque **value** the app
 * owns (a `field/operator/value` triple, or a non-uniform per-kind
 * shape). Neither is named here on purpose: `C` and `L` stay fully
 * generic so one core serves both consumers, and the component that
 * renders it (`@charcuterie/ui`'s `QueryBuilder`) stays just as
 * opaque.
 *
 * ### Normalized, not nested
 *
 * State is a flat `Map<id, node>` plus a `rootId`, rather than the
 * nested shape a naive builder reaches for. That is the one decision
 * the rest of the file hangs on, and it buys two things the plan
 * needs:
 *
 *  - **Stable ids across unrelated edits.** A node is addressed by id,
 *    so editing one leaf leaves every other node's object identity
 *    untouched — which is what lets `useSyncExternalStore` re-render
 *    only the rows that changed, the same identity discipline
 *    `keepArrayIdentity` exists for elsewhere in this package.
 *  - **A move that cannot lose a subtree.** Reparenting is a splice of
 *    two `childIds` arrays; the moved node and everything under it
 *    keep their identities and their entries in the map.
 *
 * The nested shape is still the wire format: `serialize()` folds the
 * map back into plain JSON for a YAML/DB round-trip, and `initialTree`
 * unfolds it on the way in.
 */

import { keepArrayIdentity } from "./arrays.ts"
import { createRandomString } from "./createRandomString.ts"
import { createStore as createDefaultStore } from "./createStore.ts"
import type { ReadableCore, StoreOptions } from "./types.ts"

export type TreeLeafNode<Leaf> = {
  id: string
  kind: "leaf"
  value: Leaf
}

export type TreeGroupNode<Combinator> = {
  childIds: readonly string[]
  combinator: Combinator
  id: string
  kind: "group"
}

export type TreeNode<Combinator, Leaf> =
  | TreeGroupNode<Combinator>
  | TreeLeafNode<Leaf>

export type TreeState<Combinator, Leaf> = {
  nodesById: ReadonlyMap<string, TreeNode<Combinator, Leaf>>
  /** Always a group — the root of a query builder is a match group. */
  rootId: string
}

export type SerializedLeaf<Leaf> = {
  kind: "leaf"
  value: Leaf
}

export type SerializedGroup<Combinator, Leaf> = {
  children: readonly SerializedNode<Combinator, Leaf>[]
  combinator: Combinator
  kind: "group"
}

export type SerializedNode<Combinator, Leaf> =
  | SerializedGroup<Combinator, Leaf>
  | SerializedLeaf<Leaf>

/** The root is always a group, so the tree serializes to one. */
export type SerializedTree<Combinator, Leaf> =
  SerializedGroup<Combinator, Leaf>

export type TreeOptions<Combinator, Leaf> = StoreOptions & {
  /**
   * Id minter, injectable so a test can make ids deterministic
   * without stubbing a global — the same seam `createRandomString`
   * opens for the framework-free path. Defaults to
   * `createRandomString`.
   */
  createId?: () => string
  /** The combinator a new group is born with. */
  defaultCombinator: Combinator
  /** Rehydrated from a serialized tree; an empty root group if absent. */
  initialTree?: SerializedTree<Combinator, Leaf>
  onChange?: (state: TreeState<Combinator, Leaf>) => void
}

export type Tree<Combinator, Leaf> = ReadableCore<
  TreeState<Combinator, Leaf>
> & {
  /** Adds an empty group to `parentId`; returns the new node's id. */
  addGroup: (
    parentId: string,
    combinator?: Combinator,
    index?: number,
  ) => string
  /** Adds a leaf carrying `value` to `parentId`; returns its id. */
  addLeaf: (
    parentId: string,
    value: Leaf,
    index?: number,
  ) => string
  /**
   * Reparents `id` under `newParentId` at `index`. A no-op if the
   * move would put a group inside its own subtree — which would
   * detach the whole branch from the root.
   */
  moveNode: (
    id: string,
    newParentId: string,
    index: number,
  ) => void
  /** Replaces a leaf's value. */
  patchLeaf: (id: string, value: Leaf) => void
  /** Removes a node and its whole subtree. A no-op on the root. */
  removeNode: (id: string) => void
  serialize: () => SerializedTree<Combinator, Leaf>
  setCombinator: (
    id: string,
    combinator: Combinator,
  ) => void
}

export const selectRootGroup = <Combinator, Leaf>(
  state: TreeState<Combinator, Leaf>,
): TreeGroupNode<Combinator> =>
  state.nodesById.get(
    state.rootId,
  ) as TreeGroupNode<Combinator>

export const selectNode = <Combinator, Leaf>(
  state: TreeState<Combinator, Leaf>,
  id: string,
): TreeNode<Combinator, Leaf> | undefined =>
  state.nodesById.get(id)

/**
 * The child nodes of a group, in order. Returns `[]` for a leaf or an
 * unknown id, so a caller can map over it without a guard.
 */
export const selectChildNodes = <Combinator, Leaf>(
  state: TreeState<Combinator, Leaf>,
  id: string,
): readonly TreeNode<Combinator, Leaf>[] => {
  const node = state.nodesById.get(id)

  if (node === undefined || node.kind !== "group") {
    return []
  }

  return node.childIds.flatMap((childId) => {
    const child = state.nodesById.get(childId)

    return child === undefined ? [] : [child]
  })
}

const makeLeaf = <Leaf>(
  id: string,
  value: Leaf,
): TreeLeafNode<Leaf> =>
  Object.freeze({ id, kind: "leaf", value })

const makeGroup = <Combinator>(
  id: string,
  combinator: Combinator,
  childIds: readonly string[],
): TreeGroupNode<Combinator> =>
  Object.freeze({
    // Frozen in place, not copied: every caller hands in a
    // freshly-built array or one `keepArrayIdentity` already owns, so
    // copying here would mint a new reference on an unchanged
    // `childIds` and defeat the identity `setCombinator` preserves.
    childIds: Object.freeze(childIds),
    combinator,
    id,
    kind: "group",
  })

const insertAt = (
  ids: readonly string[],
  id: string,
  index?: number,
): string[] => {
  const next = [...ids]

  next.splice(
    index === undefined ? next.length : index,
    0,
    id,
  )

  return next
}

export const createTree = <Combinator, Leaf>({
  createId = createRandomString,
  createStore = createDefaultStore,
  defaultCombinator,
  initialTree,
  onChange,
}: TreeOptions<Combinator, Leaf>): Tree<
  Combinator,
  Leaf
> => {
  /**
   * Unfold a serialized subtree into freshly-minted, id-addressed
   * nodes. Recurses children first so a parent's `childIds` names ids
   * that already exist in the map.
   */
  const buildFromSerialized = (
    nodes: Map<string, TreeNode<Combinator, Leaf>>,
    serialized: SerializedNode<Combinator, Leaf>,
  ): string => {
    const id = createId()

    if (serialized.kind === "leaf") {
      nodes.set(id, makeLeaf(id, serialized.value))

      return id
    }

    const childIds = serialized.children.map((child) =>
      buildFromSerialized(nodes, child),
    )

    nodes.set(
      id,
      makeGroup(id, serialized.combinator, childIds),
    )

    return id
  }

  const initialNodes = new Map<
    string,
    TreeNode<Combinator, Leaf>
  >()

  const rootId = initialTree
    ? buildFromSerialized(initialNodes, initialTree)
    : (() => {
        const id = createId()

        initialNodes.set(
          id,
          makeGroup(id, defaultCombinator, []),
        )

        return id
      })()

  const store = createStore<TreeState<Combinator, Leaf>>(
    Object.freeze({ nodesById: initialNodes, rootId }),
  )

  /**
   * The one place a write becomes visible. Every command builds a
   * fresh `Map` off a shallow copy — so unchanged node objects keep
   * their identity — replaces only what it touched, and hands the map
   * here; a no-op returns before reaching it, which is why `onChange`
   * fires exactly once per real change and never on an idempotent
   * command.
   */
  const commit = (
    nodesById: Map<string, TreeNode<Combinator, Leaf>>,
  ) => {
    const next = Object.freeze({ nodesById, rootId })

    store.set(next)

    onChange?.(next)
  }

  const findParentId = (
    nodes: ReadonlyMap<string, TreeNode<Combinator, Leaf>>,
    childId: string,
  ): string | null => {
    for (const node of nodes.values()) {
      if (
        node.kind === "group" &&
        node.childIds.includes(childId)
      ) {
        return node.id
      }
    }

    return null
  }

  /**
   * Whether `maybeDescendantId` is `ancestorId` or sits anywhere
   * beneath it. The move guard: reparenting a group under one of its
   * own descendants (or under itself) would cut the branch loose from
   * the root, so it is refused.
   */
  const getIsInSubtree = (
    nodes: ReadonlyMap<string, TreeNode<Combinator, Leaf>>,
    ancestorId: string,
    maybeDescendantId: string,
  ): boolean => {
    const stack = [ancestorId]

    while (stack.length > 0) {
      const current = stack.pop() as string

      if (current === maybeDescendantId) {
        return true
      }

      const node = nodes.get(current)

      if (node?.kind === "group") {
        stack.push(...node.childIds)
      }
    }

    return false
  }

  const addChild = (
    parentId: string,
    child: TreeNode<Combinator, Leaf>,
    index?: number,
  ): string => {
    const previous = store.get()

    const parent = previous.nodesById.get(parentId)

    if (parent === undefined || parent.kind !== "group") {
      return child.id
    }

    const nodes = new Map(previous.nodesById)

    nodes.set(child.id, child)

    nodes.set(
      parent.id,
      makeGroup(
        parent.id,
        parent.combinator,
        insertAt(parent.childIds, child.id, index),
      ),
    )

    commit(nodes)

    return child.id
  }

  return {
    addGroup: (parentId, combinator, index) =>
      addChild(
        parentId,
        makeGroup(
          createId(),
          combinator ?? defaultCombinator,
          [],
        ),
        index,
      ),

    addLeaf: (parentId, value, index) =>
      addChild(
        parentId,
        makeLeaf(createId(), value),
        index,
      ),

    getState: store.get,

    moveNode: (id, newParentId, index) => {
      const previous = store.get()

      if (id === previous.rootId) {
        return
      }

      const node = previous.nodesById.get(id)

      const newParent = previous.nodesById.get(newParentId)

      if (
        node === undefined ||
        newParent === undefined ||
        newParent.kind !== "group"
      ) {
        return
      }

      if (
        getIsInSubtree(previous.nodesById, id, newParentId)
      ) {
        return
      }

      const oldParentId = findParentId(
        previous.nodesById,
        id,
      )

      if (oldParentId === null) {
        return
      }

      const nodes = new Map(previous.nodesById)

      const oldParent = previous.nodesById.get(
        oldParentId,
      ) as TreeGroupNode<Combinator>

      // Detach first, so an in-place reorder within one parent
      // computes its insert index against the list the node has
      // already left.
      const withoutNode = oldParent.childIds.filter(
        (childId) => childId !== id,
      )

      if (oldParentId === newParentId) {
        nodes.set(
          oldParentId,
          makeGroup(
            oldParentId,
            oldParent.combinator,
            insertAt(withoutNode, id, index),
          ),
        )
      } else {
        nodes.set(
          oldParentId,
          makeGroup(
            oldParentId,
            oldParent.combinator,
            withoutNode,
          ),
        )

        nodes.set(
          newParentId,
          makeGroup(
            newParentId,
            newParent.combinator,
            insertAt(newParent.childIds, id, index),
          ),
        )
      }

      commit(nodes)
    },

    patchLeaf: (id, value) => {
      const previous = store.get()

      const node = previous.nodesById.get(id)

      if (
        node === undefined ||
        node.kind !== "leaf" ||
        Object.is(node.value, value)
      ) {
        return
      }

      const nodes = new Map(previous.nodesById)

      nodes.set(id, makeLeaf(id, value))

      commit(nodes)
    },

    removeNode: (id) => {
      const previous = store.get()

      if (id === previous.rootId) {
        return
      }

      const parentId = findParentId(previous.nodesById, id)

      if (parentId === null) {
        return
      }

      const nodes = new Map(previous.nodesById)

      // Delete the whole subtree, not just the node — an orphaned
      // descendant left in the map is a node no `childIds` names and
      // `serialize` can never reach.
      const stack = [id]

      while (stack.length > 0) {
        const current = stack.pop() as string

        const node = previous.nodesById.get(current)

        if (node?.kind === "group") {
          stack.push(...node.childIds)
        }

        nodes.delete(current)
      }

      const parent = previous.nodesById.get(
        parentId,
      ) as TreeGroupNode<Combinator>

      nodes.set(
        parentId,
        makeGroup(
          parentId,
          parent.combinator,
          keepArrayIdentity(
            parent.childIds,
            parent.childIds.filter(
              (childId) => childId !== id,
            ),
          ),
        ),
      )

      commit(nodes)
    },

    serialize: () => {
      const serializeNode = (
        id: string,
      ): SerializedNode<Combinator, Leaf> => {
        const node = store
          .get()
          .nodesById.get(id) as TreeNode<Combinator, Leaf>

        if (node.kind === "leaf") {
          return { kind: "leaf", value: node.value }
        }

        return {
          children: node.childIds.map(serializeNode),
          combinator: node.combinator,
          kind: "group",
        }
      }

      return serializeNode(
        store.get().rootId,
      ) as SerializedTree<Combinator, Leaf>
    },

    setCombinator: (id, combinator) => {
      const previous = store.get()

      const node = previous.nodesById.get(id)

      if (
        node === undefined ||
        node.kind !== "group" ||
        Object.is(node.combinator, combinator)
      ) {
        return
      }

      const nodes = new Map(previous.nodesById)

      // `keepArrayIdentity` so the untouched `childIds` array — and
      // therefore every child row's memoized identity — survives a
      // combinator flip.
      nodes.set(
        id,
        makeGroup(
          id,
          combinator,
          keepArrayIdentity(node.childIds, node.childIds),
        ),
      )

      commit(nodes)
    },

    subscribe: store.subscribe,
  }
}
