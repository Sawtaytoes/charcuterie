import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import type { SegmentedItem } from "./SegmentedControl.tsx"
import { SegmentedControl } from "./SegmentedControl.tsx"

/**
 * rip-deck's column picker, which is where this component came
 * from. `auto` sits first and always, because a control that only
 * offers numbers once a number has been picked is a one-way door.
 */
const COLUMN_ITEMS: SegmentedItem[] = [
  { label: "auto · 3", value: "auto" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
]

const meta = {
  title: "Components/Controls/SegmentedControl",
  component: SegmentedControl,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: { size: "md" },
} satisfies Meta<typeof SegmentedControl>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { items: COLUMN_ITEMS, label: "Columns" },
}

export const AllVariants: Story = {
  args: { items: COLUMN_ITEMS, label: "Columns" },
  render: (controlProps) => (
    <StorySection title="Three control heights, all reading the density axis rather than hardcoding a length.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={size}>
            <SegmentedControl
              {...controlProps}
              label={`Columns at ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

const STATE_ITEMS: SegmentedItem[] = [
  { label: "auto · 3", value: "auto" },
  { label: "1", value: "1" },
  { isDisabled: true, label: "2", value: "2" },
  { label: "3", value: "3" },
]

/**
 * A disabled option is out of the *focus* group and still one of the
 * *options* — it can even be the one a consumer names as the initial
 * `selectedValue`, which is what a saved preference pointing at a
 * layout the window no longer fits looks like.
 */
export const AllStates: Story = {
  args: { items: STATE_ITEMS, label: "Columns" },
  render: (controlProps) => (
    <StorySection title="What varies is which option is checked and which are reachable.">
      <StoryGrid columns={2}>
        <StoryCell label="first option checked">
          <SegmentedControl
            {...controlProps}
            label="Columns starting on auto"
          />
        </StoryCell>

        <StoryCell label="starts on the third option">
          <SegmentedControl
            {...controlProps}
            label="Columns starting on 3"
            selectedValue="3"
          />
        </StoryCell>

        <StoryCell label="a disabled option">
          <SegmentedControl
            {...controlProps}
            label="Columns with 2 unavailable"
          />
        </StoryCell>

        <StoryCell label="two options">
          <SegmentedControl
            {...controlProps}
            items={[
              { label: "Grid", value: "grid" },
              { label: "List", value: "list" },
            ]}
            label="Layout"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * It is `inline-flex`, so it takes the width of its options and no
 * more — a segmented control that stretched to its container would
 * put four numbers across a whole dashboard header.
 *
 * `ContainerBoard` is a width harness here rather than a
 * container-query claim: `SegmentedControl` declares no container,
 * because nothing about it needs to *know* its width.
 */
export const Responsive: Story = {
  args: { items: COLUMN_ITEMS, label: "Columns" },
  render: (controlProps) => (
    <ContainerBoard>
      {(width) => (
        <SegmentedControl
          {...controlProps}
          label={`Columns at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * A board's lane selector is a route selector, not a compact
 * preference. It reaches the board's edges and each route gets the
 * same hit area, even when the labels have different lengths.
 */
export const FullWidth: Story = {
  args: {
    isFullWidth: true,
    items: [
      { label: "Todo", value: "todo" },
      { label: "In Progress", value: "in-progress" },
      { label: "Needs Review", value: "needs-review" },
    ],
    label: "Board lanes",
  },
  render: (controlProps) => (
    <ContainerBoard>
      {(width) => (
        <SegmentedControl
          {...controlProps}
          label={`Board lanes at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path. Tab enters the group **once** — the
 * roving-tabindex rule — then the arrow keys move and check
 * together, which is what a radio group does and what `Tabs`'
 * `manual` mode deliberately does not.
 */
export const Interactive: Story = {
  args: { items: COLUMN_ITEMS, label: "Columns" },
}
