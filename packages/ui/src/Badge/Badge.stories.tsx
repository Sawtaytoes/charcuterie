import {
  asyncTransitions,
  useStatus,
} from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import { intentArgType } from "../argTypes.storyHelpers.ts"
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
  argTypes: { intent: intentArgType },
  // The component's own defaults, restated — Storybook does not
  // seed `args` from docgen, so an unstated default shows in the
  // props table with nothing selected in its control.
  args: {
    appearance: "soft",
    intent: "neutral",
    overflow: "truncate",
    size: "md",
  },
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A badge has no role by design — it is a word about something
 * else, not a live region — so the handle an agent reads off the row
 * is its text.
 */
export const Default: Story = {
  args: { children: "running", intent: "info" },
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

/**
 * A label longer than the space it is given, which is the case that
 * shipped broken: `shrink-0` plus `whitespace-nowrap` and no cap let
 * the pill paint straight across the next column.
 *
 * `truncate` keeps the row height fixed and paints an ellipsis —
 * and because that ellipsis is painted rather than inserted, a
 * triple-click still selects the whole string and a screen reader
 * still reads it. Hovering a clipped pill shows the rest.
 *
 * `wrap` is the answer where hover does not exist. The kiosk is a
 * touch context, so a pill whose full text matters wraps there
 * rather than hiding half of itself behind an affordance nobody can
 * reach.
 */
export const Responsive: Story = {
  args: {
    children: "quarantined — checksum mismatch on title 4",
    intent: "warning",
  },
  render: (badgeProps) => (
    <div className="flex flex-col gap-8">
      <StorySection title="overflow: truncate (default) — one line, capped, hover for the rest">
        <ContainerBoard>
          <Badge {...badgeProps} />
        </ContainerBoard>
      </StorySection>

      <StorySection title="overflow: wrap — the pill grows instead">
        <ContainerBoard>
          <Badge {...badgeProps} overflow="wrap" />
        </ContainerBoard>
      </StorySection>
    </div>
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
}
