import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import {
  AlertIcon,
  InboxIcon,
  PlayIcon,
  SearchIcon,
} from "../icons.storyHelpers.tsx"
import { EmptyState } from "./EmptyState.tsx"

const meta = {
  title: "Components/Feedback/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  args: { headingLevel: 2, size: "md" },
} satisfies Meta<typeof EmptyState>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The heading is the handle. Eleven copies of "Nothing here" in a
 * `<div>` are indistinguishable to an agent; a named heading is not.
 */
export const Default: Story = {
  args: {
    description:
      "Insert a disc and rip-deck will pick it up automatically.",
    heading: "No discs queued",
  },
}

/**
 * There is no `variant` prop, on purpose: "empty" and "failed"
 * differ in wording and in whether there is a retry button, both of
 * which are props already. A `variant="error"` that only changes a
 * colour invites callers to encode the meaning in the colour alone,
 * which is the one thing a colour cannot carry.
 */
export const AllVariants: Story = {
  args: { heading: "No discs queued" },
  render: () => (
    <StorySection title="The four real cases from the inventory — plex-channels' empty queue, castkit's idle panel, a filtered search, and a dead socket.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="empty">
          <EmptyState
            description="Insert a disc and rip-deck will pick it up automatically."
            heading="No discs queued"
            icon={<InboxIcon />}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="idle — nothing has happened yet"
        >
          <EmptyState
            description="The channel is connected and waiting for its first playback."
            heading="Nothing playing"
            icon={<PlayIcon />}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="filtered to nothing"
        >
          <EmptyState
            action={
              <Button appearance="soft" size="sm">
                Clear filters
              </Button>
            }
            description="No titles match “blade” with the 4K filter on."
            heading="No matches"
            icon={<SearchIcon />}
          />
        </StoryCell>

        <StoryCell align="stretch" label="failed">
          <EmptyState
            action={
              <Button intent="danger" size="sm">
                Reconnect
              </Button>
            }
            description="The websocket closed after 3 retries. Nothing has been lost — the tower keeps ripping."
            heading="Lost the connection"
            icon={<AlertIcon />}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: { heading: "No discs queued" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell
        align="stretch"
        label="sm — inside a panel"
      >
        <Card heading="Tower alerts" padding="sm">
          <EmptyState heading="No alerts" size="sm" />
        </Card>
      </StoryCell>

      <StoryCell align="stretch" label="md — heading only">
        <EmptyState heading="No discs queued" />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="md — with description"
      >
        <EmptyState
          description="Insert a disc and rip-deck will pick it up automatically."
          heading="No discs queued"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="md — icon, description, action"
      >
        <EmptyState
          action={<Button size="sm">Scan drives</Button>}
          description="Insert a disc and rip-deck will pick it up automatically."
          heading="No discs queued"
          icon={<InboxIcon />}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The container-query story that actually changes something: the
 * `md` size gains air past `--cq-md`, so the same component is
 * appropriately tight in a 15rem sidebar and appropriately generous
 * filling a dashboard — decided by the panel, not by the window.
 */
export const Responsive: Story = {
  args: { heading: "No discs queued" },
  render: () => (
    <ContainerBoard>
      <Card padding="none">
        <EmptyState
          description="Insert a disc and rip-deck will pick it up automatically."
          heading="No discs queued"
          icon={<InboxIcon />}
        />
      </Card>
    </ContainerBoard>
  ),
}

/**
 * Two things an agent needs from an empty state: read *why* it is
 * empty, and reach the way out. So the heading carries the reason
 * and Tab lands on the action.
 */
export const Interactive: Story = {
  args: { heading: "No discs queued" },
  render: (emptyStateProps) => (
    <EmptyState
      {...emptyStateProps}
      action={<Button size="sm">Scan drives</Button>}
      description="Insert a disc and rip-deck will pick it up automatically."
      headingLevel={3}
    />
  ),
}

/**
 * Nested inside an already-deep section, an empty state is not an
 * `<h2>`. The level goes to `6` so the outline never has to skip —
 * the cap was a guess about document depth the consumer knows
 * better than the component does.
 */
export const DeeplyNested: Story = {
  args: {
    description:
      "Insert a disc and rip-deck will pick it up automatically.",
    heading: "No discs queued",
    headingLevel: 6,
  },
}
