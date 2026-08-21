import type { Meta, StoryObj } from "@storybook/react"

import {
  controlSizeArgType,
  intentArgType,
} from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import type { IntentAppearance } from "../intentStyles.ts"
import { Button } from "./Button.tsx"

const INTENTS = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const

const APPEARANCES: IntentAppearance[] = [
  "solid",
  "soft",
  "outline",
  "ghost",
]

const meta = {
  title: "Components/Actions/Button",
  component: Button,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    size: controlSizeArgType,
  },
  // The component's own defaults, restated. Storybook has not
  // seeded `args` from a docgen `defaultValue` since v7, so without
  // this the props table prints `"solid"` in the Default column
  // while the radio beside it has nothing selected.
  args: {
    appearance: "solid",
    intent: "accent",
    isDisabled: false,
    isFullWidth: false,
    isLoading: false,
    size: "md",
    sizing: "control",
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Start rip" },
}

export const AllVariants: Story = {
  args: { children: "Start rip" },
  render: (buttonProps) => (
    <StorySection title="Six intents x four appearances. The whole of seven repos' worth of primary/secondary/danger/ghost.">
      <StoryGrid columns={4}>
        {APPEARANCES.flatMap((appearance) =>
          INTENTS.map((intent) => (
            <StoryCell
              key={`${appearance}-${intent}`}
              label={`${appearance} · ${intent}`}
            >
              <Button
                {...buttonProps}
                appearance={appearance}
                intent={intent}
              >
                {intent}
              </Button>
            </StoryCell>
          )),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

export const AllSizes: Story = {
  args: { children: "Start rip" },
  render: (buttonProps) => (
    <StorySection title="Sizes come from the density axis — flip Density in the toolbar and every one of these changes with no prop change and no re-render.">
      <StoryRow>
        <Button {...buttonProps} size="sm">
          Small
        </Button>

        <Button {...buttonProps} size="md">
          Medium
        </Button>

        <Button {...buttonProps} size="lg">
          Large
        </Button>
      </StoryRow>
    </StorySection>
  ),
}

/**
 * Hover, active, and focus are real here, not simulated: the
 * pseudo-states addon forces them, which is the only way to review
 * a hover colour in a static board.
 *
 * `focusVisible` is forced the same way rather than tabbed to. A
 * board that has to be *driven* to show its states is a test
 * wearing a demo's clothes — and the tab count silently depended on
 * how many focusable cells sat above it.
 */
export const AllStates: Story = {
  args: { children: "Start rip" },
  parameters: {
    pseudo: {
      active: ["#active"],
      focusVisible: ["#focus-target"],
      hover: ["#hover"],
    },
  },
  render: (buttonProps) => (
    <StoryGrid columns={3}>
      <StoryCell label="default">
        <Button {...buttonProps} />
      </StoryCell>

      <StoryCell label="hover (forced)">
        <Button {...buttonProps} id="hover" />
      </StoryCell>

      <StoryCell label="active (forced)">
        <Button {...buttonProps} id="active" />
      </StoryCell>

      <StoryCell label="focus-visible (forced)">
        <Button {...buttonProps} id="focus-target" />
      </StoryCell>

      <StoryCell label="disabled">
        <Button {...buttonProps} isDisabled />
      </StoryCell>

      <StoryCell label="loading">
        <Button {...buttonProps} isLoading />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Disabled *and* announced. The spinner's label lives in a
 * `role="status"`, so a screen reader hears the work start rather
 * than only seeing it.
 */
export const Loading: Story = {
  args: { children: "Ripping disc 3", isLoading: true },
}

export const Responsive: Story = {
  args: { children: "Start rip", isFullWidth: true },
  render: (buttonProps) => (
    <ContainerBoard>
      <Button {...buttonProps} />
    </ContainerBoard>
  ),
}
