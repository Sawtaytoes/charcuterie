import {
  connectionTransitions,
  useStatus,
} from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import { expect } from "storybook/test"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import { expectAgentDrivable } from "../testing/index.ts"
import { LiveStatusIndicator } from "./LiveStatusIndicator.tsx"

const CONNECTION_STATUSES = [
  "connecting",
  "connected",
  "reconnecting",
  "disconnected",
] as const

const meta = {
  title: "Components/LiveStatusIndicator",
  component: LiveStatusIndicator,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LiveStatusIndicator>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { status: "connected" },
  play: async ({ canvas }) => {
    const indicator = expectAgentDrivable(canvas, {
      name: "Connected",
      role: "status",
    })

    // `data-status` is the stable handle for a Playwright assertion
    // — it survives translation, where the visible wording does not.
    await expect(indicator).toHaveAttribute(
      "data-status",
      "connected",
    )
  },
}

/**
 * The four states, and the distinction four repos currently lose:
 * `connecting` is blue and cold-start, `reconnecting` is amber and
 * means "you had data, I am getting it back". Collapsing them is why
 * a flaky link reads wrong today.
 */
export const AllVariants: Story = {
  args: { status: "connected" },
  render: (indicatorProps) => (
    <StorySection title="Wording and colour both come from the shared machine — add a fifth state to `connectionTransitions` and `statusIntent.ts` stops compiling.">
      <StoryGrid columns={4}>
        {CONNECTION_STATUSES.map((status) => (
          <StoryCell key={status} label={status}>
            <LiveStatusIndicator
              {...indicatorProps}
              status={status}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: { status: "reconnecting" },
  render: (indicatorProps) => (
    <StoryGrid columns={2}>
      <StoryCell label="label visible (default)">
        <LiveStatusIndicator {...indicatorProps} />
      </StoryCell>

      <StoryCell label="dot only — label still announced">
        <LiveStatusIndicator
          {...indicatorProps}
          isLabelVisible={false}
        />
      </StoryCell>

      <StoryCell label="with detail">
        <LiveStatusIndicator
          {...indicatorProps}
          detail="3 of 4 bays reporting"
        />
      </StoryCell>

      <StoryCell label="sizes">
        <StoryRow>
          <LiveStatusIndicator
            {...indicatorProps}
            size="sm"
          />

          <LiveStatusIndicator
            {...indicatorProps}
            size="md"
          />

          <LiveStatusIndicator
            {...indicatorProps}
            size="lg"
          />
        </StoryRow>
      </StoryCell>

      <StoryCell label="in a card header — the real placement">
        <Card
          actions={
            <LiveStatusIndicator
              status="connected"
              size="sm"
            />
          }
          heading="Tower"
        >
          <p className="text-content-secondary text-sm">
            16 bays · 4 ripping
          </p>
        </Card>
      </StoryCell>
    </StoryGrid>
  ),
}

export const Responsive: Story = {
  args: {
    detail: "3 of 4 bays reporting",
    status: "reconnecting",
  },
  render: (indicatorProps) => (
    <ContainerBoard>
      <LiveStatusIndicator {...indicatorProps} />
    </ContainerBoard>
  ),
}

const ConnectionLifecycle = () => {
  const { can, status, transitionTo } = useStatus({
    initialState: "connecting",
    transitions: connectionTransitions,
  })

  return (
    <div className="flex flex-col gap-3">
      <LiveStatusIndicator status={status} />

      <StoryRow>
        {CONNECTION_STATUSES.map((next) => (
          <Button
            appearance="soft"
            isDisabled={!can(next) && status !== next}
            key={next}
            onClick={() => {
              transitionTo(next)
            }}
            size="sm"
          >
            {next}
          </Button>
        ))}
      </StoryRow>

      <p className="text-content-muted text-xs">
        Buttons disable themselves on illegal edges —
        `connected → connecting` is not one, because a live
        link that wants to reconnect goes through
        `reconnecting`.
      </p>
    </div>
  )
}

/**
 * The live region, driven. Each click is a real transition through
 * `connectionTransitions`, and the indicator's wording, colour, and
 * whether the dot moves all follow from the state rather than from
 * four independent booleans.
 */
export const Interactive: Story = {
  args: { status: "connecting" },
  render: () => <ConnectionLifecycle />,
  play: async ({ canvas, userEvent }) => {
    const indicator = canvas.getByRole("status")

    await expect(indicator).toHaveAttribute(
      "data-status",
      "connecting",
    )

    await userEvent.click(
      canvas.getByRole("button", { name: "connected" }),
    )

    await expect(
      canvas.getByText("Connected"),
    ).toBeVisible()

    await userEvent.click(
      canvas.getByRole("button", { name: "reconnecting" }),
    )

    await expect(
      canvas.getByText("Reconnecting…"),
    ).toBeVisible()

    // The one that matters: `reconnecting` is warning, not the
    // `connecting` blue and not the `disconnected` red.
    await expect(indicator).toHaveClass(
      "text-intent-warning-content",
    )
  },
}
