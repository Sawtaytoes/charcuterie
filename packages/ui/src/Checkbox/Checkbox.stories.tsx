import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Checkbox } from "./Checkbox.tsx"

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: { isChecked: false, isDisabled: false, size: "md" },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Delete originals after import" },
}

export const AllVariants: Story = {
  args: { label: "Delete originals after import" },
  render: (controlProps) => (
    <StorySection title="Three control heights, all reading the density axis rather than hardcoding a length.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={size}>
            <Checkbox
              {...controlProps}
              isChecked
              label={`Enabled at ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * `isChecked` seeds the first paint and nothing after — the `<input>`
 * owns its state from then on, so a disabled-and-checked box is a
 * saved preference the user cannot currently change, not a bug.
 */
export const AllStates: Story = {
  args: { label: "Delete originals after import" },
  render: (controlProps) => (
    <StorySection title="What varies is whether the box is checked and whether it can be changed.">
      <StoryGrid columns={2}>
        <StoryCell label="unchecked">
          <Checkbox {...controlProps} label="Unchecked" />
        </StoryCell>

        <StoryCell label="checked">
          <Checkbox
            {...controlProps}
            isChecked
            label="Checked"
          />
        </StoryCell>

        <StoryCell label="disabled, unchecked">
          <Checkbox
            {...controlProps}
            isDisabled
            label="Disabled"
          />
        </StoryCell>

        <StoryCell label="disabled, checked">
          <Checkbox
            {...controlProps}
            isChecked
            isDisabled
            label="Disabled and checked"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The whole keyboard path is the browser's: Tab reaches the box,
 * Space toggles it. A `<label>` wrapping the control is what makes a
 * pointer press on the *text* toggle it too.
 */
export const Interactive: Story = {
  args: { label: "Delete originals after import" },
}
