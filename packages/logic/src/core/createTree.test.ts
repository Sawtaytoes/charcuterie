/**
 * The `createTree` guarantees a query/rule builder rests on: ids that
 * survive unrelated edits, a move that cannot detach a branch, a
 * serialize/rehydrate round-trip, and the referential identity that
 * keeps `useSyncExternalStore` from re-rendering rows nothing touched.
 *
 * Ids are made deterministic with an injected counter — the same seam
 * `createRandomString`'s `generateRandomNumber` opens — so the
 * assertions can name the nodes they expect.
 */

import { expect, test } from "vitest"

import type { SerializedTree } from "./createTree.ts"
import {
  createTree,
  selectChildNodes,
  selectNode,
  selectRootGroup,
} from "./createTree.ts"

type Combinator = "and" | "or"

type Leaf = { field: string; value: string }

const withCounterIds = () => {
  let count = 0

  return () => {
    count += 1

    return `n${count}`
  }
}

const createTestTree = (
  initialTree?: SerializedTree<Combinator, Leaf>,
) =>
  createTree<Combinator, Leaf>({
    createId: withCounterIds(),
    defaultCombinator: "and",
    initialTree,
  })

test("an empty tree is a single root group with the default combinator", () => {
  const tree = createTestTree()

  const root = selectRootGroup(tree.getState())

  expect(root.kind).toBe("group")
  expect(root.combinator).toBe("and")
  expect(root.childIds).toEqual([])
  expect(tree.getState().rootId).toBe("n1")
})

test("addLeaf and addGroup return the new id and append under the parent", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  const leafId = tree.addLeaf(rootId, {
    field: "title",
    value: "a",
  })

  const groupId = tree.addGroup(rootId, "or")

  expect(selectRootGroup(tree.getState()).childIds).toEqual(
    [leafId, groupId],
  )

  const group = selectNode(tree.getState(), groupId)

  expect(group).toMatchObject({
    combinator: "or",
    kind: "group",
  })
})

test("addLeaf honours an explicit insert index", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  const first = tree.addLeaf(rootId, {
    field: "a",
    value: "",
  })

  const second = tree.addLeaf(rootId, {
    field: "b",
    value: "",
  })

  const inserted = tree.addLeaf(
    rootId,
    { field: "c", value: "" },
    1,
  )

  expect(selectRootGroup(tree.getState()).childIds).toEqual(
    [first, inserted, second],
  )
})

test("patchLeaf replaces the value", () => {
  const tree = createTestTree()

  const leafId = tree.addLeaf(tree.getState().rootId, {
    field: "title",
    value: "old",
  })

  tree.patchLeaf(leafId, { field: "title", value: "new" })

  expect(selectNode(tree.getState(), leafId)).toMatchObject(
    {
      value: { field: "title", value: "new" },
    },
  )
})

test("setCombinator flips a group's combinator", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  tree.setCombinator(rootId, "or")

  expect(selectRootGroup(tree.getState()).combinator).toBe(
    "or",
  )
})

test("removeNode deletes the node and its whole subtree, and is a no-op on the root", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  const groupId = tree.addGroup(rootId)

  const childLeafId = tree.addLeaf(groupId, {
    field: "x",
    value: "",
  })

  tree.removeNode(groupId)

  expect(selectRootGroup(tree.getState()).childIds).toEqual(
    [],
  )
  expect(
    selectNode(tree.getState(), groupId),
  ).toBeUndefined()
  // The descendant went with it — no orphan left in the map.
  expect(
    selectNode(tree.getState(), childLeafId),
  ).toBeUndefined()

  const before = tree.getState()

  tree.removeNode(rootId)

  expect(tree.getState()).toBe(before)
})

test("moveNode reparents a node at the given index", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  const groupA = tree.addGroup(rootId)

  const groupB = tree.addGroup(rootId)

  const leafId = tree.addLeaf(groupA, {
    field: "x",
    value: "",
  })

  tree.moveNode(leafId, groupB, 0)

  expect(selectNode(tree.getState(), groupA)).toMatchObject(
    {
      childIds: [],
    },
  )
  expect(selectNode(tree.getState(), groupB)).toMatchObject(
    {
      childIds: [leafId],
    },
  )
})

test("moveNode into its own descendant is refused, leaving the tree untouched", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  const outer = tree.addGroup(rootId)

  const inner = tree.addGroup(outer)

  const before = tree.getState()

  // Moving `outer` under `inner` — its own child — would cut the
  // branch loose from the root.
  tree.moveNode(outer, inner, 0)

  expect(tree.getState()).toBe(before)

  // And a group cannot be moved into itself either.
  tree.moveNode(outer, outer, 0)

  expect(tree.getState()).toBe(before)
})

test("an edit leaves unrelated subtrees referentially identical", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  const untouched = tree.addGroup(rootId)

  tree.addLeaf(untouched, { field: "keep", value: "" })

  const edited = tree.addGroup(rootId)

  const untouchedBefore = selectNode(
    tree.getState(),
    untouched,
  )

  const untouchedLeafBefore = selectChildNodes(
    tree.getState(),
    untouched,
  )[0]

  // A write in a sibling branch.
  tree.addLeaf(edited, { field: "new", value: "" })

  expect(selectNode(tree.getState(), untouched)).toBe(
    untouchedBefore,
  )
  expect(
    selectChildNodes(tree.getState(), untouched)[0],
  ).toBe(untouchedLeafBefore)
})

test("setCombinator keeps the childIds array identity", () => {
  const tree = createTestTree()

  const { rootId } = tree.getState()

  tree.addLeaf(rootId, { field: "x", value: "" })

  const childIdsBefore = selectRootGroup(
    tree.getState(),
  ).childIds

  tree.setCombinator(rootId, "or")

  expect(selectRootGroup(tree.getState()).childIds).toBe(
    childIdsBefore,
  )
})

test("an idempotent command does not notify or change state", () => {
  const tree = createTestTree()

  const leafId = tree.addLeaf(tree.getState().rootId, {
    field: "title",
    value: "same",
  })

  const before = tree.getState()

  let notifications = 0

  tree.subscribe(() => {
    notifications += 1
  })

  const sameValue = selectNode(before, leafId) as {
    value: Leaf
  }

  tree.patchLeaf(leafId, sameValue.value)

  tree.setCombinator(
    before.rootId,
    selectRootGroup(before).combinator,
  )

  expect(tree.getState()).toBe(before)
  expect(notifications).toBe(0)
})

test("serialize round-trips the tree it was initialized from", () => {
  const initialTree: SerializedTree<Combinator, Leaf> = {
    children: [
      {
        kind: "leaf",
        value: { field: "title", value: "a" },
      },
      {
        children: [
          {
            kind: "leaf",
            value: { field: "year", value: "2026" },
          },
          {
            kind: "leaf",
            value: { field: "tag", value: "fav" },
          },
        ],
        combinator: "or",
        kind: "group",
      },
    ],
    combinator: "and",
    kind: "group",
  }

  const tree = createTestTree(initialTree)

  expect(tree.serialize()).toEqual(initialTree)
})

test("onChange fires once per real edit with the next state", () => {
  const states: number[] = []

  const tree = createTree<Combinator, Leaf>({
    createId: withCounterIds(),
    defaultCombinator: "and",
    onChange: (state) => {
      states.push(state.nodesById.size)
    },
  })

  const { rootId } = tree.getState()

  tree.addLeaf(rootId, { field: "a", value: "" })

  tree.addGroup(rootId)

  // Two edits, two notifications; the reported state is the new one.
  expect(states).toEqual([2, 3])
})
