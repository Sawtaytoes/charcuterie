import type { Meta, StoryObj } from "@storybook/react"
import { expect } from "storybook/test"

import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import { expectHiddenFromAgents } from "../testing/index.ts"
import { Skeleton } from "./Skeleton.tsx"

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Skeleton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { blockSize: "1.5rem", inlineSize: "12rem" },
  play: ({ canvasElement }) => {
    const skeleton = canvasElement.querySelector(
      "div[aria-hidden]",
    )

    if (!skeleton) {
      throw new Error("Skeleton did not render")
    }

    // The inverse of every other component's gate. A skeleton is
    // decoration standing in for content that does not exist yet;
    // if AT can see it, a screen reader reads three empty bars.
    expectHiddenFromAgents(skeleton)
  },
}

export const AllVariants: Story = {
  args: {},
  render: () => (
    <StorySection title="Three shapes, and the multi-line text case — last line short, so a paragraph placeholder reads as prose rather than as a table.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="block">
          <Skeleton blockSize="4rem" inlineSize="12rem" />
        </StoryCell>

        <StoryCell align="stretch" label="circle">
          <Skeleton
            blockSize="3rem"
            inlineSize="3rem"
            shape="circle"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="text (single line)"
        >
          <Skeleton inlineSize="14rem" shape="text" />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="text (four lines)"
        >
          <Skeleton
            inlineSize="14rem"
            lineCount={4}
            shape="text"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * A skeleton has no interactive states — no hover, no focus, no
 * disabled. What it has instead is a *fidelity* obligation: the
 * placeholder has to occupy the same box the real content will, or
 * the grid reflows when the data lands and the user loses their
 * place. So this story is the comparison rather than a state grid.
 */
export const AllStates: Story = {
  args: {},
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="loading">
        <Card heading="Bay 3 — loading">
          <Skeleton
            inlineSize="100%"
            lineCount={3}
            shape="text"
          />
        </Card>
      </StoryCell>

      <StoryCell align="stretch" label="loaded — same box">
        <Card heading="Bay 3 — loaded">
          <p className="text-content-secondary text-sm">
            Ripping <em>Blade Runner (1982)</em> — title 4
            of 9, AACS handshake complete, 38 minutes
            remaining on this title.
          </p>
        </Card>
      </StoryCell>
    </StoryGrid>
  ),
}

export const Responsive: Story = {
  args: {},
  render: () => (
    <ContainerBoard>
      <Skeleton
        inlineSize="100%"
        lineCount={3}
        shape="text"
      />
    </ContainerBoard>
  ),
}

export const Interactive: Story = {
  args: {
    inlineSize: "12rem",
    lineCount: 3,
    shape: "text",
  },
  play: async ({ canvas, canvasElement }) => {
    // Nothing to drive, and that is the assertion: a skeleton
    // contributes no roles at all, so an agent sweeping the page
    // never finds a control it cannot act on.
    await expect(
      canvas.queryAllByRole("status"),
    ).toHaveLength(0)
    await expect(
      canvas.queryAllByRole("progressbar"),
    ).toHaveLength(0)

    const bars = canvasElement.querySelectorAll(
      ".charcuterie-shimmer",
    )

    await expect(bars).toHaveLength(3)
  },
}
