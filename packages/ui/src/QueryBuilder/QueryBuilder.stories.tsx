import type { SerializedTree } from "@charcuterie/logic"
import {
  createTree,
  useTree,
  useVisibility,
} from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import { StorySection } from "../board.storyHelpers.tsx"
import { Listbox } from "../Listbox/Listbox.tsx"
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

/**
 * A leaf's own picker — a `Listbox`, like the combinator above it,
 * because [the 2026-08-10 demotion](../../../../docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md)
 * applies to an app's leaf UI exactly as it does to this component's
 * own controls. This story is the example apps copy, so it must not
 * teach the native `Select` the record demoted.
 *
 * It is a component rather than inline JSX for the same reason
 * `QueryBuilderCombinator` is: `Listbox` needs a visibility state, and
 * a leaf is rendered inside a `.map` where a hook cannot be called.
 * An app adopting `QueryBuilder` writes this same small wrapper — see
 * the note in `QueryBuilder.mdx`.
 */
const LeafPicker = ({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: readonly { label: string; value: string }[]
  value: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility()

  const currentLabel =
    options.find((option) => option.value === value)
      ?.label ?? ""

  return (
    <Listbox
      isVisible={isVisible}
      onDismiss={hide}
      onSelect={onChange}
      options={options}
      selectedValue={value}
      trigger={
        <Button
          appearance="outline"
          aria-label={`${label}: ${currentLabel}`}
          intent="neutral"
          onClick={toggle}
          size="sm"
        >
          {currentLabel}
        </Button>
      }
    />
  )
}

const renderLeaf = ({
  onChange,
  value,
}: {
  nodeId: string
  onChange: (value: DemoLeaf) => void
  value: DemoLeaf
}): ReactNode => (
  <div className="flex flex-wrap items-center gap-2">
    <LeafPicker
      label="Field"
      onChange={(field) => {
        onChange({ ...value, field })
      }}
      options={FIELD_OPTIONS}
      value={value.field}
    />

    <LeafPicker
      label="Operator"
      onChange={(operator) => {
        onChange({ ...value, operator })
      }}
      options={OPERATOR_OPTIONS}
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

/**
 * `renderCombinator` — the group's combinator control, owned by the app.
 *
 * The default single picker is right when a combinator is a plain enum.
 * mux-magic's is not: it is a **quantifier** (ANY/ALL/NO) crossed with a
 * **target** (these groups, style rows, script-info blocks), and the legal
 * pairs are asymmetric — the DSL has `notAllScriptInfo` and no
 * `notAllStyle`. Flattened to one list, that asymmetry is invisible; split
 * in two, the second picker filters and the illegal pair cannot be built.
 *
 * This story is that shape in miniature: pick `NOT ALL` and the target
 * list collapses to the one target it can legally take.
 */
const PAIR_COMBINATORS = {
  "all:group": "and",
  "all:row": "and",
  "any:group": "or",
  "any:row": "or",
  "notAll:group": "and",
} as const

const QUANTIFIER_OPTIONS = [
  { label: "ALL", value: "all" },
  { label: "ANY", value: "any" },
  { label: "NOT ALL", value: "notAll" },
] as const

const CombinatorPair = ({
  onChange,
  value,
}: {
  onChange: (combinator: Combinator) => void
  value: Combinator
}): ReactNode => {
  const [quantifier, setQuantifier] =
    useState<string>("all")

  // "NOT ALL" is legal over groups only here — the same filtered
  // second picker mux-magic needs, in one line.
  const targetOptions =
    quantifier === "notAll"
      ? [{ label: "of these groups", value: "group" }]
      : [
          { label: "of these groups", value: "group" },
          { label: "matching rows", value: "row" },
        ]

  const [target, setTarget] = useState<string>("group")

  const resolvedTarget =
    quantifier === "notAll" ? "group" : target

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-content-primary text-sm">
        Match
      </span>

      <div className="flex items-center gap-1.5">
        <LeafPicker
          label="Quantifier"
          onChange={(nextQuantifier) => {
            setQuantifier(nextQuantifier)

            const nextTarget =
              nextQuantifier === "notAll"
                ? "group"
                : resolvedTarget

            onChange(
              PAIR_COMBINATORS[
                `${nextQuantifier}:${nextTarget}` as keyof typeof PAIR_COMBINATORS
              ],
            )
          }}
          options={QUANTIFIER_OPTIONS}
          value={quantifier}
        />

        <LeafPicker
          label="Target"
          onChange={(nextTarget) => {
            setTarget(nextTarget)

            onChange(
              PAIR_COMBINATORS[
                `${quantifier}:${nextTarget}` as keyof typeof PAIR_COMBINATORS
              ],
            )
          }}
          options={targetOptions}
          value={resolvedTarget}
        />
      </div>

      <span className="text-content-muted text-xs">
        {`Combinator: ${String(value)}`}
      </span>
    </div>
  )
}

export const CustomCombinator: Story = {
  render: () => {
    const CustomCombinatorHarness = (): ReactNode => {
      const tree = useTree<Combinator, DemoLeaf>({
        defaultCombinator: "and",
        initialTree: FLAT_TREE,
      })

      return (
        <QueryBuilder
          combinatorOptions={COMBINATOR_OPTIONS}
          createLeafValue={createLeafValue}
          renderCombinator={({ onChange, value }) => (
            <CombinatorPair
              onChange={onChange}
              value={value}
            />
          )}
          renderLeaf={renderLeaf}
          tree={tree}
        />
      )
    }

    return <CustomCombinatorHarness />
  },
}
