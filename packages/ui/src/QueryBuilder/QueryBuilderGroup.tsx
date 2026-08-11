import type {
  Tree,
  TreeGroupNode,
  TreeState,
} from "@charcuterie/logic"
import { selectChildNodes } from "@charcuterie/logic"
import type { ReactNode } from "react"

import { Button } from "../Button/Button.tsx"
import { Card } from "../Card/Card.tsx"
import { Field } from "../Field/Field.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { Select } from "../Select/Select.tsx"
import { toClassName } from "../toClassName.ts"
import type { QueryBuilderLabels } from "./QueryBuilder.tsx"
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
 * One match group: a "Match" combinator select, its children (leaf
 * rows and nested groups), and a toolbar to add either. Its own file
 * because it renders itself recursively for nested groups and is
 * itself rendered inside the parent's `.map` — the member-file case.
 *
 * The combinator is opaque, so the native `Select` (which speaks
 * strings) is bridged by `String(value)`: options carry the
 * stringified combinator, and a change is mapped back to the real
 * `Combinator` before it reaches `setCombinator`. That keeps
 * `Combinator` fully generic while still using the platform control
 * that brings type-ahead, the mobile wheel, and form semantics for
 * free.
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

  const selectOptions = combinatorOptions.map((option) => ({
    label: option.label,
    value: String(option.value),
  }))

  const card = (
    <Card
      // Nested groups sit on the sunken surface so the depth reads as
      // recession, not another raised card floating at the same level.
      surface={depth === 0 ? "raised" : "sunken"}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-52">
            <Field label="Match">
              <Select
                onChange={(nextValue) => {
                  const match = combinatorOptions.find(
                    (option) =>
                      String(option.value) === nextValue,
                  )

                  if (match) {
                    tree.setCombinator(node.id, match.value)
                  }
                }}
                options={selectOptions}
                value={String(node.combinator)}
              />
            </Field>
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
