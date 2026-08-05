import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import type { RadioItem } from "./RadioGroup.tsx"
import { RadioGroup } from "./RadioGroup.tsx"

/**
 * Options carrying a real sentence each — the case an in-line
 * `SegmentedControl` strip would wrap, and the reason to stack.
 */
const NAMING_ITEMS: RadioItem[] = [
  { label: "Match the Plex agent", value: "plex" },
  { label: "Match AniDB titles", value: "anidb" },
  {
    label: "Keep the original filenames",
    value: "original",
  },
  { label: "Use a custom pattern", value: "custom" },
]

const meta = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: { isReadOnly: false, size: "md" },
} satisfies Meta<typeof RadioGroup>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { items: NAMING_ITEMS, label: "Naming scheme" },
}

export const AllVariants: Story = {
  args: { items: NAMING_ITEMS, label: "Naming scheme" },
  render: (controlProps) => (
    <StorySection title="Three control heights, all reading the density axis rather than hardcoding a length.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={size}>
            <RadioGroup
              {...controlProps}
              label={`Naming scheme at ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

const STATE_ITEMS: RadioItem[] = [
  { label: "Match the Plex agent", value: "plex" },
  { label: "Match AniDB titles", value: "anidb" },
  {
    isDisabled: true,
    label: "Keep the original filenames",
    value: "original",
  },
  { label: "Use a custom pattern", value: "custom" },
]

/**
 * A disabled option is out of the *focus* group and still one of the
 * *options* — it can even be the one a consumer names as the initial
 * `selectedValue`, which is what a saved preference pointing at a
 * scheme the source no longer supports looks like.
 */
export const AllStates: Story = {
  args: { items: STATE_ITEMS, label: "Naming scheme" },
  render: (controlProps) => (
    <StorySection title="What varies is which option is checked and which are reachable.">
      <StoryGrid columns={2}>
        <StoryCell label="first option checked">
          <RadioGroup
            {...controlProps}
            label="Naming scheme starting on Plex"
          />
        </StoryCell>

        <StoryCell label="starts on the fourth option">
          <RadioGroup
            {...controlProps}
            label="Naming scheme starting on custom"
            selectedValue="custom"
          />
        </StoryCell>

        <StoryCell label="a disabled option">
          <RadioGroup
            {...controlProps}
            label="Naming scheme with original unavailable"
          />
        </StoryCell>

        <StoryCell label="two options">
          <RadioGroup
            {...controlProps}
            items={[
              { label: "Move the files", value: "move" },
              { label: "Copy the files", value: "copy" },
            ]}
            label="On import"
          />
        </StoryCell>

        <StoryCell label="read-only">
          <RadioGroup
            {...controlProps}
            isReadOnly
            items={NAMING_ITEMS}
            label="Naming scheme, read-only"
            selectedValue="anidb"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The complete keyboard path. Tab enters the group **once** — the
 * roving-tabindex rule — then the arrow keys move and check
 * together, the same activation model as `SegmentedControl`.
 */
export const Interactive: Story = {
  args: { items: NAMING_ITEMS, label: "Naming scheme" },
}
