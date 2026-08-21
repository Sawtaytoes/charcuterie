import type { Meta, StoryObj } from "@storybook/react"

import { Badge } from "../Badge/Badge.tsx"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import type { AccordionItem } from "./Accordion.tsx"
import { Accordion } from "./Accordion.tsx"

const JOB_SECTIONS: AccordionItem[] = [
  {
    content: (
      <p>Blade Runner (1982) · 9 titles · MakeMKV 1.17.8</p>
    ),
    key: "disc",
    label: "Disc",
  },
  {
    content: (
      <p className="font-mono text-xs">
        14:02:11 AACS handshake complete, reading…
      </p>
    ),
    key: "log",
    label: "Log",
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

const STATE_SECTIONS: AccordionItem[] = [
  ...JOB_SECTIONS,
  {
    content: <p>Unreachable — no verdict yet.</p>,
    isDisabled: true,
    key: "verdict",
    label: "Verdict",
  },
]

const meta = {
  title: "Components/Layout/Accordion",
  component: Accordion,
  parameters: { layout: "padded" },
  args: {
    headingLevel: 3,
    isMultiple: false,
    items: JOB_SECTIONS,
  },
} satisfies Meta<typeof Accordion>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { expandedKeys: ["disc"], items: JOB_SECTIONS },
}

/**
 * Exclusive is `VisibilityGroup`; `isMultiple` is
 * `MultiplePicker`. Both hooks are created and one is consulted,
 * because hooks cannot be conditional — two empty stores and no DOM,
 * which is cheaper than reimplementing exclusivity on top of the
 * multiple kind.
 */
export const AllVariants: Story = {
  args: { items: JOB_SECTIONS },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="exclusive (default)">
        <Accordion
          expandedKeys={["disc"]}
          items={JOB_SECTIONS}
        />
      </StoryCell>

      <StoryCell label="multiple">
        <Accordion
          expandedKeys={["disc", "flags"]}
          isMultiple
          items={JOB_SECTIONS}
        />
      </StoryCell>

      <StoryCell label="all collapsed">
        <Accordion items={JOB_SECTIONS} />
      </StoryCell>

      {/*
        Its own item set, with names that appear nowhere else on the
        board. Four accordions sharing three labels means
        `getByRole("heading", { name: "Log" })` matches four
        elements, and `expectAgentDrivable` treats ambiguity as a
        failure — correctly, since an agent would be picking one at
        random.
      */}
      <StoryCell label="heading level 2">
        <Accordion
          expandedKeys={["steps"]}
          headingLevel={2}
          items={[
            {
              content: <p>4 of 9 titles complete.</p>,
              key: "steps",
              label: "Steps",
            },
            {
              content: <p>No errors.</p>,
              key: "errors",
              label: "Errors",
            },
          ]}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * A disabled section is **not a member of the group**. Registration
 * is membership, so nothing can expand it — including a consumer
 * passing its key in `expandedKeys`. That is the behaviour a
 * `<summary>` cannot have at all, which is one of the two reasons
 * this is not built on `<details>`.
 */
export const AllStates: Story = {
  args: {
    expandedKeys: ["verdict"],
    items: STATE_SECTIONS,
  },
}
