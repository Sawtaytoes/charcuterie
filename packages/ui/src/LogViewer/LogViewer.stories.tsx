import type { Meta, StoryObj } from "@storybook/react"

import { Accordion } from "../Accordion/Accordion.tsx"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import type { LogLine } from "./LogViewer.tsx"
import { LogViewer } from "./LogViewer.tsx"

const RIP_LINES: LogLine[] = [
  {
    key: "1",
    text: "14:02:09 Opening /dev/sr0",
  },
  {
    key: "2",
    text: "14:02:11 AACS handshake complete, reading…",
  },
  {
    intent: "warning",
    key: "3",
    text: "14:02:44 Title 4: 2 read errors, retrying",
  },
  {
    key: "4",
    text: "14:03:02 Title 4: recovered",
  },
  {
    intent: "success",
    key: "5",
    text: "14:31:57 9 titles written to /mnt/rips",
  },
]

/**
 * Long enough to overflow the pane, which is the only way to story
 * the behaviour that matters here.
 */
const LONG_LINES: LogLine[] = Array.from(
  { length: 60 },
  (_unused, index) => ({
    key: String(index),
    text: `14:${String(index).padStart(2, "0")}:00 Reading sector ${index * 2048}`,
  }),
)

const meta = {
  title: "Components/Data/LogViewer",
  component: LogViewer,
  parameters: { layout: "padded" },
  args: {
    isAnnounced: false,
    label: "Bay 3 rip log",
    lines: RIP_LINES,
    maxLines: 500,
  },
} satisfies Meta<typeof LogViewer>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Bay 3 rip log", lines: RIP_LINES },
}

export const AllVariants: Story = {
  args: { label: "Bay 3 rip log", lines: RIP_LINES },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="short">
        <LogViewer
          label="Bay 1 rip log"
          lines={RIP_LINES}
        />
      </StoryCell>

      <StoryCell label="overflowing">
        <LogViewer
          label="Bay 2 rip log"
          lines={LONG_LINES}
        />
      </StoryCell>

      <StoryCell label="capped at 10 lines">
        <LogViewer
          label="Bay 4 rip log"
          lines={LONG_LINES}
          maxLines={10}
        />
      </StoryCell>

      <StoryCell label="announced">
        <LogViewer
          isAnnounced
          label="Bay 5 result"
          lines={RIP_LINES}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Empty is a state, not a blank box. mux-magic's pane says
 * "Waiting for log lines…" and rip-deck's says nothing at all,
 * which reads as a broken subscription.
 */
export const AllStates: Story = {
  args: { label: "Bay 3 rip log", lines: RIP_LINES },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="empty">
        <LogViewer label="Bay 6 rip log" lines={[]} />
      </StoryCell>

      <StoryCell label="with intents">
        <LogViewer
          label="Bay 7 rip log"
          lines={RIP_LINES}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Scroll the tall pane up and the **Jump to latest** button
 * appears; scroll back to the bottom and it goes away. Following is
 * pinned to the user's own position, which is the difference between
 * a log that follows and one that fights you.
 */
export const Interactive: Story = {
  args: { label: "Bay 8 rip log", lines: LONG_LINES },
}

/**
 * The pane mounted inside a **collapsed** `Accordion` section, which
 * is how the fleet actually renders a log and is the one arrangement
 * where following used to fail.
 *
 * `AccordionSection` renders its panel with `hidden`, deliberately,
 * so the pane keeps its scroll position and its subscriptions across
 * a collapse. A `hidden` subtree has no layout, so a pane that
 * measures itself on mount measures `scrollHeight 0` — and neither
 * `isFollowing` nor `lines` changes when the section is opened.
 *
 * Expand it: the log opens on its **last** line, not its first.
 */
export const InsideDisclosure: Story = {
  args: { label: "Bay 9 rip log", lines: LONG_LINES },
  render: () => (
    <Accordion
      items={[
        {
          content: (
            <LogViewer
              label="Bay 9 rip log"
              lines={LONG_LINES}
            />
          ),
          key: "logs",
          label: "Bay 9 output",
        },
      ]}
    />
  ),
}
