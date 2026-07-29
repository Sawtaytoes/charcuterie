import {
  asyncTransitions,
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
import { DotIcon } from "../icons.storyHelpers.tsx"
import {
  getAsyncIntent,
  getAsyncLabel,
} from "../statusIntent.ts"
import { Badge } from "./Badge.tsx"

const INTENTS = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const

const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "running", intent: "info" },
  play: async ({ canvas }) => {
    // A badge has no role by design — it is a word about something
    // else, not a live region — so the drivable handle is its text,
    // which is also what an agent reads off the row.
    await expect(canvas.getByText("running")).toBeVisible()
  },
}

export const AllVariants: Story = {
  args: { children: "running" },
  render: (badgeProps) => (
    <StorySection title="Six intents x three appearances. rip-deck declares this map twice, in two files, with hardcoded hexes.">
      <StoryGrid columns={6}>
        {(["soft", "solid", "outline"] as const).flatMap(
          (appearance) =>
            INTENTS.map((intent) => (
              <StoryCell
                key={`${appearance}-${intent}`}
                label={`${appearance} · ${intent}`}
              >
                <Badge
                  {...badgeProps}
                  appearance={appearance}
                  intent={intent}
                >
                  {intent}
                </Badge>
              </StoryCell>
            )),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: { children: "running" },
  render: (badgeProps) => (
    <StorySection title="A badge is static — no hover, no focus, no disabled. What varies is size, an optional glyph, and how it sits in a real row.">
      <StoryGrid columns={2}>
        <StoryCell label="sm">
          <Badge {...badgeProps} size="sm" />
        </StoryCell>

        <StoryCell label="md">
          <Badge {...badgeProps} size="md" />
        </StoryCell>

        <StoryCell label="with a glyph">
          <Badge
            {...badgeProps}
            icon={<DotIcon />}
            intent="success"
          >
            verified
          </Badge>
        </StoryCell>

        <StoryCell label="in a job row">
          <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised p-2">
            <span className="text-content-primary text-sm">
              Blade Runner (1982)
            </span>

            <Badge intent="success" size="sm">
              completed
            </Badge>
          </div>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const Responsive: Story = {
  args: {
    children: "quarantined — checksum mismatch on title 4",
  },
  render: (badgeProps) => (
    <ContainerBoard>
      <Badge {...badgeProps} intent="warning" />
    </ContainerBoard>
  ),
}

const AsyncStatusBadge = () => {
  const { reset, status, transitionTo } = useStatus({
    initialState: "idle",
    transitions: asyncTransitions,
  })

  return (
    <StoryRow>
      <Badge intent={getAsyncIntent(status)}>
        {getAsyncLabel(status)}
      </Badge>

      <Button
        appearance="soft"
        onClick={() => {
          transitionTo("loading")
        }}
        size="sm"
      >
        Start
      </Button>

      <Button
        appearance="soft"
        intent="success"
        onClick={() => {
          transitionTo("success")
        }}
        size="sm"
      >
        Succeed
      </Button>

      <Button
        appearance="soft"
        intent="danger"
        onClick={() => {
          transitionTo("error")
        }}
        size="sm"
      >
        Fail
      </Button>

      <Button appearance="ghost" onClick={reset} size="sm">
        Reset
      </Button>
    </StoryRow>
  )
}

/**
 * The M2 join, live: one `asyncTransitions` machine, one
 * `getAsyncIntent`, and a badge that cannot render a state the
 * machine does not have.
 *
 * Press *Succeed* before *Start* and the badge does not move:
 * `idle → success` is not a legal edge, so the core throws (loudly,
 * in the console) rather than painting a green pill over a job that
 * never ran. That is the difference between this and mux-magic's
 * `Record<string, string>`, which renders whatever string it is
 * handed and colours an unknown one as nothing at all.
 */
export const Interactive: Story = {
  args: { children: "running" },
  render: () => <AsyncStatusBadge />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Idle")).toBeVisible()

    await userEvent.click(
      canvas.getByRole("button", { name: "Start" }),
    )

    await expect(canvas.getByText("Loading…")).toBeVisible()

    await userEvent.click(
      canvas.getByRole("button", { name: "Succeed" }),
    )

    await expect(canvas.getByText("Done")).toBeVisible()

    await userEvent.click(
      canvas.getByRole("button", { name: "Reset" }),
    )

    await expect(canvas.getByText("Idle")).toBeVisible()
  },
}
