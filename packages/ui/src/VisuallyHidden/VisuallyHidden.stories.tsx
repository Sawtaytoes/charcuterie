import type { Meta, StoryObj } from "@storybook/react"
import { expect } from "storybook/test"

import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { VisuallyHidden } from "./VisuallyHidden.tsx"

/**
 * A Layer-0 primitive with a deliberately short story set: it has no
 * variants, no states, and no container-query behaviour — the whole
 * component is "in the accessibility tree, out of the layout". The
 * mandated five-story set would be four empty boards.
 *
 * It ships in M3 because `Spinner`, `ProgressBar`, and
 * `LiveStatusIndicator` all need it and the alternative is
 * `aria-label` everywhere, which cannot hold markup and silently
 * loses translation.
 */
const meta = {
  title: "Foundation/VisuallyHidden",
  component: VisuallyHidden,
  parameters: { layout: "padded" },
} satisfies Meta<typeof VisuallyHidden>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Announced, never printed." },
  render: (visuallyHiddenProps) => (
    <StoryGrid columns={2}>
      <StoryCell label="hidden text, next to visible text">
        <p className="text-content-primary text-sm">
          Ripping title 4
          <VisuallyHidden {...visuallyHiddenProps} />
        </p>
      </StoryCell>

      <StoryCell label="an icon button's name comes from one">
        <IconButton label="Undo" size="sm">
          ↶
        </IconButton>
      </StoryCell>
    </StoryGrid>
  ),
}

export const Interactive: Story = {
  args: { children: "Announced, never printed." },
  play: async ({ canvas, canvasElement }) => {
    // Present to a query, absent from the layout. `display: none`
    // would fail the first assertion; a plain `<span>` would fail
    // the second.
    const hidden = canvas.getByText(
      "Announced, never printed.",
    )

    await expect(hidden).toBeInTheDocument()

    const { height, width } = hidden.getBoundingClientRect()

    await expect(width).toBeLessThanOrEqual(1)
    await expect(height).toBeLessThanOrEqual(1)

    await expect(canvasElement.textContent).toContain(
      "Announced, never printed.",
    )
  },
}
