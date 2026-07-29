import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn } from "storybook/test"

import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import type { IntentAppearance } from "../intentStyles.ts"
import { expectAgentDrivable } from "../testing/index.ts"
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
  title: "Components/Button",
  component: Button,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Start rip" },
  play: ({ canvas }) => {
    expectAgentDrivable(canvas, {
      name: "Start rip",
      role: "button",
    })
  },
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
 * Hover and active are real here, not simulated: the
 * pseudo-states addon forces them, which is the only way to review
 * a hover colour in a static board.
 */
export const AllStates: Story = {
  args: { children: "Start rip" },
  parameters: {
    pseudo: { active: ["#active"], hover: ["#hover"] },
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

      <StoryCell label="focus-visible (real, via Tab)">
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
  play: async ({ canvas, userEvent }) => {
    // `:focus-visible` only matches keyboard focus, so `.focus()`
    // would show nothing. Tabbing is the state.
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()

    await expect(
      canvas.getByRole("button", { name: /loading/i }),
    ).toHaveAttribute("aria-busy", "true")
  },
}

export const Loading: Story = {
  args: { children: "Ripping disc 3", isLoading: true },
  play: ({ canvas }) => {
    // Disabled *and* announced. The spinner's label lives in a
    // `role="status"`, so a screen reader hears the work start.
    const button = expectAgentDrivable(canvas, {
      name: /Ripping disc 3/,
      role: "button",
    })

    expect(button).toBeDisabled()
    expect(canvas.getByRole("status")).toBeInTheDocument()
  },
}

export const Responsive: Story = {
  args: { children: "Start rip", isFullWidth: true },
  render: (buttonProps) => (
    <ContainerBoard>
      <Button {...buttonProps} />
    </ContainerBoard>
  ),
}

/**
 * The keyboard contract, asserted rather than assumed: Tab reaches
 * it, Enter activates, Space activates. Every hand-rolled
 * `<div onClick>` in the fleet fails all three.
 */
export const Interactive: Story = {
  args: { children: "Start rip", onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const button = expectAgentDrivable(canvas, {
      name: "Start rip",
      role: "button",
    })

    await userEvent.tab()

    await expect(button).toHaveFocus()

    await userEvent.keyboard("{Enter}")

    await expect(args.onClick).toHaveBeenCalledTimes(1)

    await userEvent.keyboard(" ")

    await expect(args.onClick).toHaveBeenCalledTimes(2)
  },
}

export const DisabledDoesNotFire: Story = {
  args: {
    children: "Start rip",
    isDisabled: true,
    onClick: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", {
      name: "Start rip",
    })

    await userEvent.click(button)

    // A `<div role="button">` with a guard clause looks the same and
    // is not the same: a real `disabled` is skipped by Tab, ignored
    // by click, and reported to AT.
    await expect(args.onClick).not.toHaveBeenCalled()
    await expect(button).toBeDisabled()
  },
}
