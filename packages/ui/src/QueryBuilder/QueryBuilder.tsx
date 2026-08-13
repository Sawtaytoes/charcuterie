import type { Tree } from "@charcuterie/logic"
import {
  selectRootGroup,
  useStoreValue,
} from "@charcuterie/logic"
import type { ReactNode } from "react"

import { QueryBuilderGroup } from "./QueryBuilderGroup.tsx"

export type QueryBuilderLabels = {
  addGroup?: string
  addLeaf?: string
  /** The caption over each group's combinator picker. */
  match?: string
  removeGroup?: string
  removeLeaf?: string
}

export type QueryBuilderProps<Combinator, Leaf> = {
  /**
   * The combinator choices offered in every group's "Match" select.
   * The `value` is opaque — `and`/`or` for a mail rule, `any`/`all`/
   * `none` for a DSL — and the `label` is what a user reads.
   */
  combinatorOptions: readonly {
    label: string
    value: Combinator
  }[]
  /** The value a fresh leaf is born with when "+ Condition" is pressed. */
  createLeafValue: () => Leaf
  labels?: QueryBuilderLabels
  /**
   * The group's combinator control, when one `Listbox` over a flat
   * option list is the wrong shape for it.
   *
   * Optional, and the default is the right answer for most consumers:
   * a combinator that is a plain enum reads as one picker. But a
   * combinator can be a *composite* — mux-magic's is a quantifier
   * (ANY/ALL/NO) crossed with a target (a nested group, a style row,
   * a script-info block), and the legal pairs are asymmetric
   * (`notAllScriptInfo` exists, `notAllStyle` does not). Flattened
   * into one list that is nine options where the user is making two
   * choices, and the illegal pairs are invisible until they are
   * missing.
   *
   * So the combinator is app-ownable for the same reason `renderLeaf`
   * is: `Combinator` is opaque here, and only the app knows whether
   * its shape is an enum or a product. `options` and the current
   * `value` are handed over unchanged; the app calls `onChange` with a
   * real `Combinator`.
   */
  renderCombinator?: (args: {
    nodeId: string
    onChange: (combinator: Combinator) => void
    options: readonly {
      label: string
      value: Combinator
    }[]
    value: Combinator
  }) => ReactNode
  /**
   * The leaf UI, owned by the app. `QueryBuilder` knows nothing about
   * what a condition *is* — a field/operator/value triple, a
   * non-uniform per-kind shape — only that it can be rendered and
   * patched. The delete control around each leaf is the builder's.
   */
  renderLeaf: (args: {
    nodeId: string
    onChange: (value: Leaf) => void
    value: Leaf
  }) => ReactNode
  /**
   * The `Tree` core from `useTree`, owned by the consumer — the same
   * arrangement as a `Listbox`'s parent owning `useVisibility`.
   * `QueryBuilder` subscribes to it and drives it; it never creates
   * one, so a consumer keeps `serialize()` and the initial tree.
   */
  tree: Tree<Combinator, Leaf>
}

const DEFAULT_LABELS = {
  addGroup: "Add group",
  addLeaf: "Add condition",
  match: "Match",
  removeGroup: "Remove group",
  removeLeaf: "Remove condition",
} satisfies Required<QueryBuilderLabels>

/**
 * The generic, nestable AND/OR — and any-combinator — group editor.
 *
 * Two apps in the fleet grow the same widget: Mail Sifter's nested
 * mail rules (leaf = field/operator/value, combinators AND/OR) and
 * mux-magic's job DSL (non-uniform leaves, combinators any/all/none).
 * Both are a recursive group of conditions with a combinator, so the
 * value **and** the combinator are opaque here — `Combinator` and
 * `Leaf` never appear except passed through to the consumer's
 * `renderLeaf` and its `combinatorOptions`.
 *
 * State lives entirely in the `Tree` core from `@charcuterie/logic`;
 * this component holds none of its own. It subscribes with
 * `useStoreValue`, so a `patchLeaf` deep in the tree re-renders only
 * the rows whose node identity changed — the same identity discipline
 * the state layer is built on.
 *
 * The recursion and the per-leaf row each live in their own file
 * (`QueryBuilderGroup`, `QueryBuilderRow`), not exported: a group
 * renders groups, and both are rendered inside a `.map`, which is
 * exactly the shape the member-file rule is for.
 */
export const QueryBuilder = <Combinator, Leaf>({
  combinatorOptions,
  createLeafValue,
  labels,
  renderCombinator,
  renderLeaf,
  tree,
}: QueryBuilderProps<Combinator, Leaf>): ReactNode => {
  const state = useStoreValue(tree)

  const resolvedLabels = { ...DEFAULT_LABELS, ...labels }

  return (
    <QueryBuilderGroup
      combinatorOptions={combinatorOptions}
      createLeafValue={createLeafValue}
      depth={0}
      labels={resolvedLabels}
      node={selectRootGroup(state)}
      renderCombinator={renderCombinator}
      renderLeaf={renderLeaf}
      state={state}
      tree={tree}
    />
  )
}
