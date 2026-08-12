import type {
  Tree,
  TreeGroupNode,
  TreeState,
} from "@charcuterie/logic"
import { selectChildNodes } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { Card } from "../Card/Card.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { toClassName } from "../toClassName.ts"
import type { QueryBuilderLabels } from "./QueryBuilder.tsx"
import { QueryBuilderCombinator } from "./QueryBuilderCombinator.tsx"
import { QueryBuilderRow } from "./QueryBuilderRow.tsx"

export type QueryBuilderGroupProps<Combinator, Leaf> = {
  combinatorOptions: readonly {
    label: string
    value: Combinator
  }[]
  createLeafValue: () => Leaf
  /** Root is `0`; nested groups deepen and gain the accent rail. */
  depth: number
  labels: Required<QueryBuilderLabels>
  node: TreeGroupNode<Combinator>
  renderLeaf: (args: {
    nodeId: string
    onChange: (value: Leaf) => void
    value: Leaf
  }) => ReactNode
  state: TreeState<Combinator, Leaf>
  tree: Tree<Combinator, Leaf>
}

/**
 * One match group: a "Match" combinator picker, its children (leaf
 * rows and nested groups), and a toolbar to add either. Its own file
 * because it renders itself recursively for nested groups and is
 * itself rendered inside the parent's `.map` — the member-file case.
 *
 * The picker is `QueryBuilderCombinator`, a `Listbox` rather than the
 * native `Select` this shipped with — see that file for why it is a
 * component and how it stays generic over an opaque `Combinator`.
 */
export const QueryBuilderGroup = <Combinator, Leaf>({
  combinatorOptions,
  createLeafValue,
  depth,
  labels,
  node,
  renderLeaf,
  state,
  tree,
}: QueryBuilderGroupProps<Combinator, Leaf>): ReactNode => {
  const children = selectChildNodes(state, node.id)

  const card = (
    <Card
      // Nested groups sit on the sunken surface so the depth reads as
      // recession, not another raised card floating at the same level.
      surface={depth === 0 ? "raised" : "sunken"}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-52">
            <QueryBuilderCombinator
              label={labels.match}
              onChange={(nextCombinator) => {
                tree.setCombinator(node.id, nextCombinator)
              }}
              options={combinatorOptions}
              value={node.combinator}
            />
          </div>

          {depth === 0 ? null : (
            <IconButton
              appearance="ghost"
              intent="danger"
              label={labels.removeGroup}
              onClick={() => {
                tree.removeNode(node.id)
              }}
              size="sm"
            >
              ✕
            </IconButton>
          )}
        </div>

        {children.length === 0 ? null : (
          <div className="flex flex-col gap-2">
            {children.map((child) =>
              child.kind === "group" ? (
                <QueryBuilderGroup
                  combinatorOptions={combinatorOptions}
                  createLeafValue={createLeafValue}
                  depth={depth + 1}
                  key={child.id}
                  labels={labels}
                  node={child}
                  renderLeaf={renderLeaf}
                  state={state}
                  tree={tree}
                />
              ) : (
                <QueryBuilderRow
                  key={child.id}
                  label={labels.removeLeaf}
                  nodeId={child.id}
                  onChange={(value) => {
                    tree.patchLeaf(child.id, value)
                  }}
                  onRemove={() => {
                    tree.removeNode(child.id)
                  }}
                  renderLeaf={renderLeaf}
                  value={child.value}
                />
              ),
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            appearance="outline"
            intent="neutral"
            onClick={() => {
              tree.addLeaf(node.id, createLeafValue())
            }}
            size="sm"
          >
            {`+ ${labels.addLeaf}`}
          </Button>

          <Button
            appearance="outline"
            intent="neutral"
            onClick={() => {
              tree.addGroup(node.id)
            }}
            size="sm"
          >
            {`+ ${labels.addGroup}`}
          </Button>
        </div>
      </div>
    </Card>
  )

  // Depth is shown with a semantic-token inline-start rail. The colour
  // utility paints all four sides, but only the inline-start edge has
  // a width, so only it renders — no raw palette colour anywhere.
  return depth === 0 ? (
    card
  ) : (
    <div
      className={toClassName(
        "border-intent-accent-border border-s-2 ps-3",
      )}
    >
      {card}
    </div>
  )
}
