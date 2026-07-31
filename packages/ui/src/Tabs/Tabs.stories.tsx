import type { Meta, StoryObj } from "@storybook/react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { ProgressBar } from "../ProgressBar/ProgressBar.tsx"
import type { TabItem } from "./Tabs.tsx"
import { Tabs } from "./Tabs.tsx"

const BAY_TABS: TabItem[] = [
  {
    content: (
      <ProgressBar
        isValueShown
        label="Ripping title 4 of 9"
        value={47}
      />
    ),
    key: "progress",
    label: "Progress",
  },
  {
    content: (
      <p className="font-mono text-content-secondary text-xs">
        14:02:11 AACS handshake complete, reading…
      </p>
    ),
    key: "log",
    label: "Log",
  },
  {
    content: (
      <p className="text-content-secondary text-sm">
        Blade Runner (1982) · 9 titles · MakeMKV 1.17.8
      </p>
    ),
    key: "disc",
    label: "Disc",
  },
]

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
  argTypes: {
    activation: toStoryChoice([
      "automatic",
      "manual",
    ] as const),
    orientation: toStoryChoice([
      "horizontal",
      "vertical",
    ] as const),
  },
  args: {
    activation: "automatic",
    orientation: "horizontal",
  },
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Bay 3", tabs: BAY_TABS },
}

export const AllVariants: Story = {
  args: { label: "Bay 3", tabs: BAY_TABS },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="horizontal · automatic">
        <Tabs label="Bay 3 horizontal" tabs={BAY_TABS} />
      </StoryCell>

      <StoryCell label="vertical · automatic">
        <Tabs
          label="Bay 3 vertical"
          orientation="vertical"
          tabs={BAY_TABS}
        />
      </StoryCell>

      <StoryCell label="horizontal · manual">
        <Tabs
          activation="manual"
          label="Bay 3 manual"
          tabs={BAY_TABS}
        />
      </StoryCell>

      <StoryCell label="starts on the second tab">
        <Tabs
          activeKey="log"
          label="Bay 3 starting on log"
          tabs={BAY_TABS}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

const STATE_TABS: TabItem[] = [
  ...BAY_TABS,
  {
    content: (
      <p className="text-content-secondary text-sm">
        Unreachable — this bay has no verdict yet.
      </p>
    ),
    isDisabled: true,
    key: "verdict",
    label: "Verdict",
  },
  {
    content: (
      <div className="flex gap-2">
        <Badge intent="warning" size="sm">
          1 retry
        </Badge>

        <Badge intent="info" size="sm">
          AACS
        </Badge>
      </div>
    ),
    key: "flags",
    label: "Flags",
  },
]

/**
 * A disabled tab is out of the *focus* group and still one of the
 * *options* — it owns a panel and an id either way. Registration is
 * membership, so the arrow keys skip it with nothing in
 * `RovingFocus` knowing the word "disabled".
 */
export const AllStates: Story = {
  args: { label: "Bay 3", tabs: STATE_TABS },
}

/**
 * A tab bar **scrolls**, it does not wrap. A wrapped tablist puts
 * tabs on two rows, which breaks both the visual row and the
 * mental model the arrow keys give — "right" stops meaning right.
 *
 * `ContainerBoard` is used here as a width harness rather than as
 * a container-query claim: `Tabs` declares no container, because
 * nothing about it needs to *know* its width. It just has to
 * survive being narrow.
 */
export const Responsive: Story = {
  args: { label: "Bay 3", tabs: STATE_TABS },
  render: () => (
    <ContainerBoard>
      {(width) => (
        <Tabs
          label={`Bay 3 at ${width}`}
          tabs={STATE_TABS}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The falsification point, and the reason `Tabs` is P0.
 *
 * In `manual`, an arrow key moves focus to a tab that is *not*
 * chosen — a state a three-kind model cannot represent at all,
 * because it had one notion of "the current one" doing both jobs.
 * Arrow through this one and watch the underline stay put until
 * Enter.
 */
export const Manual: Story = {
  args: {
    activation: "manual",
    label: "Bay 3 manual",
    tabs: BAY_TABS,
  },
}
