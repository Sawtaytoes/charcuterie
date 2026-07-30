import type { Meta, StoryObj } from "@storybook/react"
import { expect, waitFor } from "storybook/test"

import { Badge } from "../Badge/Badge.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { ProgressBar } from "../ProgressBar/ProgressBar.tsx"
import { expectAgentDrivable } from "../testing/index.ts"
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
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Bay 3", tabs: BAY_TABS },
  play: async ({ canvas, userEvent }) => {
    const tablist = expectAgentDrivable(canvas, {
      name: "Bay 3",
      role: "tablist",
    })

    await expect(tablist).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    )

    const log = expectAgentDrivable(canvas, {
      name: "Log",
      role: "tab",
    })

    await userEvent.click(log)

    await waitFor(() => {
      expect(log).toHaveAttribute("aria-selected", "true")
    })

    // `aria-controls` really reaches the panel, and the panel
    // names itself back through `aria-labelledby`. Both ids come
    // from one `useUniqueId`, which is why they cannot drift.
    const panel = expectAgentDrivable(canvas, {
      name: "Log",
      role: "tabpanel",
    })

    await expect(log).toHaveAttribute(
      "aria-controls",
      panel.id,
    )
  },
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
  play: async ({ canvas }) => {
    // `activeKey` is an *initial* value, so it decides the first
    // render and nothing after. A controlled prop is the thing
    // this library refuses to have.
    const tablist = expectAgentDrivable(canvas, {
      name: "Bay 3 starting on log",
      role: "tablist",
    })

    const selected = tablist.querySelector(
      '[aria-selected="true"]',
    )

    await expect(selected).toHaveTextContent("Log")

    await expect(
      expectAgentDrivable(canvas, {
        name: "Bay 3 vertical",
        role: "tablist",
      }),
    ).toHaveAttribute("aria-orientation", "vertical")
  },
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

export const AllStates: Story = {
  args: { label: "Bay 3", tabs: STATE_TABS },
  play: async ({ canvas, userEvent }) => {
    const verdict = expectAgentDrivable(canvas, {
      name: "Verdict",
      role: "tab",
    })

    await expect(verdict).toBeDisabled()

    // The disabled tab is out of the *focus* group and still in
    // the *panel* group — it owns a panel and an id either way.
    // Registration is membership, so the arrow keys skip it with
    // nothing in `RovingFocus` knowing the word "disabled".
    const flags = expectAgentDrivable(canvas, {
      name: "Flags",
      role: "tab",
    })

    await userEvent.click(
      expectAgentDrivable(canvas, {
        name: "Disc",
        role: "tab",
      }),
    )

    await userEvent.keyboard("{ArrowRight}")

    await waitFor(() => {
      expect(flags).toHaveFocus()
    })

    await expect(verdict).not.toHaveFocus()

    // The mutation check on the rule this component added to
    // `expectAgentDrivable`. M4 found that helper rejecting every
    // roving-tabindex member outright, and replaced the rejection
    // with the roving rule itself — so the *failing* half has to
    // be proved too, or "exactly one tab stop" is a sentence that
    // never runs.
    //
    // `AgentQueries` is structural on purpose, which is what lets
    // a four-line stub stand in for the canvas here.
    const brokenList = document.createElement("div")

    brokenList.setAttribute("role", "tablist")

    brokenList.innerHTML =
      '<button role="tab" tabindex="-1">A</button>' +
      '<button role="tab" tabindex="0">B</button>' +
      '<button role="tab" tabindex="0">C</button>'

    // Attached, because the helper walks up to find the group and
    // a detached tree would be the stub cheating.
    document.body.append(brokenList)

    const brokenTabs = Array.from(
      brokenList.querySelectorAll("button"),
    )

    const checkFirstTab = () => {
      expectAgentDrivable(
        {
          queryAllByRole: () => [
            brokenTabs[0] as HTMLElement,
          ],
        },
        { role: "tab" },
      )
    }

    // Two members in the tab order: Tab lands inside the group
    // twice and the arrow keys are decoration.
    await expect(checkFirstTab).toThrow(/2 tab stops/)

    const lastTab = brokenTabs[2] as HTMLButtonElement

    lastTab.tabIndex = -1

    await expect(checkFirstTab).not.toThrow()

    brokenList.remove()
  },
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
  play: async ({ canvas }) => {
    const narrow = expectAgentDrivable(canvas, {
      name: "Bay 3 at 15rem",
      role: "tablist",
    })

    await expect(narrow.scrollWidth).toBeGreaterThan(
      narrow.clientWidth,
    )

    // One row, still. `clientHeight` growing past a single tab's
    // height is what wrapping would look like.
    const wide = expectAgentDrivable(canvas, {
      name: "Bay 3 at 34rem",
      role: "tablist",
    })

    await expect(narrow.clientHeight).toBe(
      wide.clientHeight,
    )
  },
}

/**
 * The falsification point, driven — and the reason `Tabs` is P0.
 *
 * `automatic` and `manual` differ only in whether moving focus
 * also shows a panel, and this story asserts both halves of that
 * against the same component: in `manual`, focus lands on a tab
 * whose panel is *not* showing, which is a state a three-kind
 * model cannot represent at all. Modelled as a `SinglePicker`,
 * every arrow key would have chosen.
 */
export const Interactive: Story = {
  args: {
    activation: "manual",
    label: "Bay 3 manual",
    tabs: BAY_TABS,
  },
  render: (tabsProps) => (
    <div className="flex flex-col gap-8">
      <Tabs {...tabsProps} />

      <Tabs label="Bay 4 automatic" tabs={BAY_TABS} />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const manual = expectAgentDrivable(canvas, {
      name: "Bay 3 manual",
      role: "tablist",
    })

    const tabs = Array.from(
      manual.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      ),
    )

    const [progress, log] = tabs as [
      HTMLButtonElement,
      HTMLButtonElement,
    ]

    // Exactly one tab stop for the whole bar — the roving-tabindex
    // rule, straight from `selectTabIndex`.
    await expect(
      tabs.filter((one) => one.tabIndex === 0),
    ).toHaveLength(1)

    progress.focus()

    await userEvent.keyboard("{ArrowRight}")

    await waitFor(() => {
      expect(log).toHaveFocus()
    })

    // The whole point: focus moved, selection did not.
    await expect(log).toHaveAttribute(
      "aria-selected",
      "false",
    )

    await expect(progress).toHaveAttribute(
      "aria-selected",
      "true",
    )

    await userEvent.keyboard("{Enter}")

    await waitFor(() => {
      expect(log).toHaveAttribute("aria-selected", "true")
    })

    // And the other mode, where the same keystroke does both.
    const automatic = expectAgentDrivable(canvas, {
      name: "Bay 4 automatic",
      role: "tablist",
    })

    const automaticTabs =
      automatic.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      )

    automaticTabs[0]?.focus()

    await userEvent.keyboard("{ArrowRight}")

    await waitFor(() => {
      expect(automaticTabs[1]).toHaveAttribute(
        "aria-selected",
        "true",
      )
    })

    // Wrapping is on, because a tab list is one of the patterns
    // ARIA says wraps.
    await userEvent.keyboard("{ArrowRight}{ArrowRight}")

    await waitFor(() => {
      expect(automaticTabs[0]).toHaveAttribute(
        "aria-selected",
        "true",
      )
    })
  },
}
