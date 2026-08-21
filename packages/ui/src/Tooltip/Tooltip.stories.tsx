import type { Meta, StoryObj } from "@storybook/react"

import { placementArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { SettingsIcon } from "../icons.storyHelpers.tsx"
import { Tooltip } from "./Tooltip.tsx"

const meta = {
  title: "Components/Overlays/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  argTypes: { placement: placementArgType },
  args: {
    delay: 200,
    label: "Re-reads the disc from title 1.",
    placement: "top",
  },
} satisfies Meta<typeof Tooltip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: <Button appearance="outline">Retry</Button>,
    label: "Re-reads the disc from title 1.",
  },
}

/**
 * A tooltip **adds**; it never *is* the name. The icon button below
 * still carries its own `aria-label` — the tip is the sentence you
 * would otherwise have had no room for.
 */
export const AllVariants: Story = {
  args: {
    children: <Button appearance="outline">Retry</Button>,
    label: "Re-reads the disc from title 1.",
  },
  render: () => (
    <StoryGrid columns={3}>
      <StoryCell label="on a button">
        <Tooltip label="Re-reads the disc from title 1.">
          <Button appearance="outline">Retry</Button>
        </Tooltip>
      </StoryCell>

      <StoryCell label="on an IconButton">
        <Tooltip label="Opens the bay's rip settings.">
          <IconButton label="Bay settings">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </StoryCell>

      <StoryCell label="placed below">
        <Tooltip
          label="Skips this title and carries on."
          placement="bottom"
        >
          <Button appearance="outline">Skip</Button>
        </Tooltip>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Closed until something asks for it. There is no "open" prop: a
 * tooltip's visibility is entirely a consequence of hover or focus,
 * which is the one piece of state in this library a consumer has no
 * business holding.
 */
export const AllStates: Story = {
  args: {
    children: (
      <Button appearance="outline">
        Hover or Tab to me
      </Button>
    ),
    label: "Re-reads the disc from title 1.",
  },
}

/**
 * Tab to the button. The tip opens **on focus** — the line
 * mux-magic's `FieldTooltip` is missing, which makes its version
 * pointer-only and a WCAG 2.1.1 failure on the control whose
 * explanation lives there. Escape closes it, per WCAG 1.4.13.
 */
export const Interactive: Story = {
  args: {
    children: (
      <Button appearance="outline">Keyboard tip</Button>
    ),
    label: "Opened by focus, closed by Escape.",
  },
}
