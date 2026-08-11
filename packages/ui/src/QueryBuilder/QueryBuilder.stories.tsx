import type { SerializedTree } from "@charcuterie/logic"
import { createTree, useTree } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { StorySection } from "../board.storyHelpers.tsx"
import { Select } from "../Select/Select.tsx"
import { QueryBuilder } from "./QueryBuilder.tsx"

/**
 * The concrete demo leaf — a field/operator/value triple, Mail
 * Sifter's shape. `QueryBuilder` never sees this type; it flows
 * through `renderLeaf` and `createLeafValue` untouched, which is what
 * lets mux-magic pass a non-uniform per-kind shape instead.
 */
type DemoLeaf = {
  field: string
  operator: string
  value: string
}

type Combinator = "and" | "or"

const COMBINATOR_OPTIONS: readonly {
  label: string
  value: Combinator
}[] = [
  { label: "ALL — every condition", value: "and" },
  { label: "ANY — one condition", value: "or" },
]

const FIELD_OPTIONS = [
  { label: "Subject", value: "subject" },
  { label: "From", value: "from" },
  { label: "Body", value: "body" },
] as const

const OPERATOR_OPTIONS = [
  { label: "contains", value: "contains" },
  { label: "is", value: "is" },
  { label: "starts with", value: "startsWith" },
] as const

const createLeafValue = (): DemoLeaf => ({
  field: "subject",
  operator: "contains",
  value: "",
})

const renderLeaf = ({
  onChange,
  value,
}: {
  nodeId: string
  onChange: (value: DemoLeaf) => void
  value: DemoLeaf
}): ReactNode => (
  <div className="flex flex-wrap items-center gap-2">
    <Select
      label="Field"
      onChange={(field) => {
        onChange({ ...value, field })
      }}
      options={FIELD_OPTIONS}
      size="sm"
      value={value.field}
    />

    <Select
      label="Operator"
      onChange={(operator) => {
        onChange({ ...value, operator })
      }}
      options={OPERATOR_OPTIONS}
      size="sm"
      value={value.operator}
    />

    <input
      aria-label="Value"
      className="min-w-40 grow rounded-md border border-border-default bg-surface-raised px-3 py-1.5 text-content-primary text-sm"
      onChange={(changeEvent) => {
        onChange({
          ...value,
          value: changeEvent.currentTarget.value,
        })
      }}
      value={value.value}
    />
  </div>
)

const FLAT_TREE: SerializedTree<Combinator, DemoLeaf> = {
  children: [
    {
      kind: "leaf",
      value: {
        field: "from",
        operator: "contains",
        value: "@newsletter",
      },
    },
    {
      kind: "leaf",
      value: {
        field: "subject",
        operator: "contains",
        value: "sale",
      },
    },
  ],
  combinator: "and",
  kind: "group",
}

const NESTED_TREE: SerializedTree<Combinator, DemoLeaf> = {
  children: [
    {
      kind: "leaf",
      value: {
        field: "from",
        operator: "is",
        value: "billing@acme.test",
      },
    },
    {
      children: [
        {
          kind: "leaf",
          value: {
            field: "subject",
            operator: "contains",
            value: "invoice",
          },
        },
        {
          kind: "leaf",
          value: {
            field: "subject",
            operator: "contains",
            value: "receipt",
          },
        },
      ],
      combinator: "or",
      kind: "group",
    },
  ],
  combinator: "and",
  kind: "group",
}

const QueryBuilderHarness = ({
  initialTree,
}: {
  initialTree?: SerializedTree<Combinator, DemoLeaf>
}): ReactNode => {
  const tree = useTree<Combinator, DemoLeaf>({
    defaultCombinator: "and",
    initialTree,
  })

  return (
    <QueryBuilder
      combinatorOptions={COMBINATOR_OPTIONS}
      createLeafValue={createLeafValue}
      renderLeaf={renderLeaf}
      tree={tree}
    />
  )
}

const meta = {
  title: "Components/QueryBuilder",
  component: QueryBuilder,
  parameters: { layout: "padded" },
  args: {
    combinatorOptions: COMBINATOR_OPTIONS,
    createLeafValue,
    renderLeaf,
    tree: createTree<Combinator, DemoLeaf>({
      defaultCombinator: "and",
    }),
  },
} satisfies Meta<typeof QueryBuilder<Combinator, DemoLeaf>>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A flat group of two conditions joined by ALL. Change the combinator,
 * edit a condition, or add another with "+ Add condition".
 */
export const Default: Story = {
  render: () => (
    <QueryBuilderHarness initialTree={FLAT_TREE} />
  ),
}

/**
 * Two shapes side by side: a flat rule, and a nested one where a
 * sub-group joined by ANY sits inside a group joined by ALL. The
 * nested group wears the inline-start accent rail that marks depth.
 */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <StorySection title="Flat — ALL of two conditions">
        <QueryBuilderHarness initialTree={FLAT_TREE} />
      </StorySection>

      <StorySection title="Nested — ALL, with an ANY sub-group">
        <QueryBuilderHarness initialTree={NESTED_TREE} />
      </StorySection>
    </div>
  ),
}

/**
 * Drive it: add a condition, add a nested group, flip a combinator,
 * delete a row. Starts from a single condition so every control is
 * unique and nameable.
 */
export const Interactive: Story = {
  render: () => (
    <QueryBuilderHarness
      initialTree={{
        children: [
          {
            kind: "leaf",
            value: {
              field: "subject",
              operator: "contains",
              value: "urgent",
            },
          },
        ],
        combinator: "and",
        kind: "group",
      }}
    />
  ),
}
