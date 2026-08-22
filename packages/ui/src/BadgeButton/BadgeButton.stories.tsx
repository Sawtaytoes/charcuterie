import type { Meta, StoryObj } from "@storybook/react"

import {
  categoricalArgType,
  intentArgType,
} from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import {
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { DotIcon } from "../icons.storyHelpers.tsx"
import { BadgeButton } from "./BadgeButton.tsx"

const INTENTS = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const

const meta = {
  title: "Components/Actions/BadgeButton",
  component: BadgeButton,
  parameters: { layout: "padded" },
  argTypes: {
    categorical: categoricalArgType,
    intent: intentArgType,
  },
  // The component's own defaults, restated — Storybook does not
  // seed `args` from docgen, so an unstated default shows in the
  // props table with nothing selected in its control.
  args: {
    appearance: "soft",
    intent: "neutral",
    isDisabled: false,
    onClick: () => {},
    overflow: "truncate",
    size: "md",
  },
} satisfies Meta<typeof BadgeButton>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A pill with a `button` role, so `getByRole("button", { name })`
 * finds it — which is what an agent, and every test in the fleet,
 * actually matches on.
 */
export const Default: Story = {
  args: { children: "1 episode", intent: "accent" },
}

/**
 * The claim this component exists to make, side by side: a
 * `BadgeButton` and a `Badge` with identical visual props are the
 * same pill, and one of them is a real `<button>`.
 *
 * `BadgeButton.test.tsx` compares their computed styles rather than
 * trusting this board — but the board is where a human sees it.
 */
export const BesideABadge: Story = {
  args: { children: "1 episode" },
  render: ({ categorical, ...badgeButtonProps }) => (
    <StorySection title="Same pill, different element. Tab reaches the left one and Enter fires it; the right one is a word about something else.">
      <StoryRow>
        <StoryCell label="BadgeButton — a <button>">
          <BadgeButton {...badgeButtonProps} />
        </StoryCell>

        <StoryCell label="Badge — a <span>">
          <Badge
            appearance={badgeButtonProps.appearance}
            intent={badgeButtonProps.intent}
            size={badgeButtonProps.size}
          >
            1 episode
          </Badge>
        </StoryCell>
      </StoryRow>
    </StorySection>
  ),
}

export const AllVariants: Story = {
  args: { children: "1 episode" },
  // `categorical` is destructured out rather than spread: this board
  // is about intents, and the type refuses a pill holding both — a
  // badge is one colour.
  render: ({ categorical, ...badgeButtonProps }) => (
    <StorySection title="Six intents x three appearances — the same maps Badge indexes, because they are the same maps. `ghost` is excluded: a pill that paints nothing until hovered has no pill left.">
      <StoryGrid columns={6}>
        {(["soft", "solid", "outline"] as const).flatMap(
          (appearance) =>
            INTENTS.map((intent) => (
              <StoryCell
                key={`${appearance}-${intent}`}
                label={`${appearance} · ${intent}`}
              >
                <BadgeButton
                  {...badgeButtonProps}
                  appearance={appearance}
                  intent={intent}
                >
                  {intent}
                </BadgeButton>
              </StoryCell>
            )),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The states a `Badge` does not have, which is the whole reason not
 * to solve this with a `className`.
 */
export const AllStates: Story = {
  args: { children: "1 episode" },
  render: ({ categorical, ...badgeButtonProps }) => (
    <StorySection title="Hover, focus and disabled — hover one, Tab to one, and read the third.">
      <StoryGrid columns={2}>
        <StoryCell label="sm">
          <BadgeButton {...badgeButtonProps} size="sm" />
        </StoryCell>

        <StoryCell label="md">
          <BadgeButton {...badgeButtonProps} size="md" />
        </StoryCell>

        <StoryCell label="with a glyph">
          <BadgeButton
            {...badgeButtonProps}
            icon={<DotIcon />}
            intent="success"
          >
            verified
          </BadgeButton>
        </StoryCell>

        <StoryCell label="disabled">
          <BadgeButton {...badgeButtonProps} isDisabled>
            1 episode
          </BadgeButton>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Where it came from: QueuePilot's poster tile, whose per-entry
 * settings are TAGS. A default entry says nothing and every tag you
 * do see is a deviation worth reading — and each one opens the panel
 * that changes it, which is why they are pressable.
 */
export const InATileFooter: Story = {
  args: { children: "Edit" },
  render: ({ categorical, ...badgeButtonProps }) => (
    <StorySection title="A row of chips under a poster: three settings and the editor that changes them.">
      <div className="flex max-w-64 flex-wrap items-center gap-1 rounded-md border border-border-subtle bg-surface-raised p-2">
        <span className="w-full text-content-primary text-sm">
          Blade Runner (1982)
        </span>

        <BadgeButton
          {...badgeButtonProps}
          intent="accent"
          size="sm"
        >
          3 episodes
        </BadgeButton>

        <BadgeButton
          {...badgeButtonProps}
          intent="info"
          size="sm"
        >
          2x weight
        </BadgeButton>

        <BadgeButton
          {...badgeButtonProps}
          appearance="outline"
          size="sm"
        >
          Edit
        </BadgeButton>
      </div>
    </StorySection>
  ),
}
