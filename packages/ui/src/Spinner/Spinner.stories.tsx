import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Spinner } from "./Spinner.tsx"

const meta = {
  title: "Components/Feedback/Spinner",
  component: Spinner,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  args: {
    isLabelVisible: false,
    label: "Loading…",
    size: "md",
  },
} satisfies Meta<typeof Spinner>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The name comes from the *hidden* label, which is the whole reason
 * this beats a rotating `<div>`: the state is announced even though
 * nothing is printed.
 */
export const Default: Story = {
  args: {},
}

export const AllVariants: Story = {
  args: {},
  render: (spinnerProps) => (
    <StorySection title="Three sizes, and inside a button — where `border-current` makes it inherit the button's own text colour with nothing passed in.">
      <StoryGrid columns={4}>
        <StoryCell label="sm">
          <Spinner {...spinnerProps} size="sm" />
        </StoryCell>

        <StoryCell label="md">
          <Spinner {...spinnerProps} size="md" />
        </StoryCell>

        <StoryCell label="lg">
          <Spinner {...spinnerProps} size="lg" />
        </StoryCell>

        <StoryCell label="inside a solid button">
          <Button isLoading>Ripping</Button>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: {},
  render: (spinnerProps) => (
    <StoryGrid columns={3}>
      <StoryCell label="label hidden (default)">
        <Spinner {...spinnerProps} />
      </StoryCell>

      <StoryCell label="label visible">
        <Spinner {...spinnerProps} isLabelVisible />
      </StoryCell>

      <StoryCell label="custom label">
        <Spinner
          {...spinnerProps}
          isLabelVisible
          label="Reading disc structure…"
        />
      </StoryCell>

      <StoryCell label="on a tinted surface">
        <span className="inline-flex rounded-md bg-intent-info-surface p-2 text-intent-info-content">
          <Spinner {...spinnerProps} />
        </span>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * There is no "reduced motion" story, deliberately — it is a
 * *browser* state, not a prop, so faking it here would prove
 * nothing. Toggle the OS setting (or DevTools → Rendering → Emulate
 * `prefers-reduced-motion`) against this board: the ring must stop
 * and still read as a ring, and the label must still be announced.
 */
export const Responsive: Story = {
  args: { isLabelVisible: true },
  render: (spinnerProps) => (
    <ContainerBoard>
      <Spinner {...spinnerProps} />
    </ContainerBoard>
  ),
}

/**
 * A named region with a visible label, and a ring that stays *out*
 * of the accessibility tree — otherwise a screen reader reads the
 * label twice, once as the region and once as an unnamed child.
 */
export const Interactive: Story = {
  args: {
    isLabelVisible: true,
    label: "Reading disc structure…",
  },
}
