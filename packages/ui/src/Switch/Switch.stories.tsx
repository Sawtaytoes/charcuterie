import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Switch } from "./Switch.tsx"

const meta = {
  title: "Components/Switch",
  component: Switch,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: { isChecked: false, isDisabled: false, size: "md" },
} satisfies Meta<typeof Switch>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Automatic imports" },
}

export const AllVariants: Story = {
  args: { label: "Automatic imports" },
  render: (controlProps) => (
    <StorySection title="Three control heights, all reading the density axis rather than hardcoding a length.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={size}>
            <Switch
              {...controlProps}
              isChecked
              label={`On at ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The thumb changes colour as well as position, so the state reads at
 * a glance in `daylight` sunlight — a thumb that only moved would not.
 */
export const AllStates: Story = {
  args: { label: "Automatic imports" },
  render: (controlProps) => (
    <StorySection title="What varies is whether the switch is on and whether it can be changed.">
      <StoryGrid columns={2}>
        <StoryCell label="off">
          <Switch {...controlProps} label="Off" />
        </StoryCell>

        <StoryCell label="on">
          <Switch {...controlProps} isChecked label="On" />
        </StoryCell>

        <StoryCell label="disabled, off">
          <Switch
            {...controlProps}
            isDisabled
            label="Disabled"
          />
        </StoryCell>

        <StoryCell label="disabled, on">
          <Switch
            {...controlProps}
            isChecked
            isDisabled
            label="Disabled and on"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * A `button role="switch"`, so its keyboard path is the button's:
 * Tab reaches it, Space and Enter flip it.
 */
export const Interactive: Story = {
  args: { label: "Automatic imports" },
}
