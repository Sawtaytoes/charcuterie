import type { Meta, StoryObj } from "@storybook/react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { ProgressBar } from "../ProgressBar/ProgressBar.tsx"
import { Tabs } from "./Tabs.tsx"
import type { TabItem, TabLinkItem } from "./tabItems.ts"

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
  title: "Components/Layout/Tabs",
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

const PROJECT_TABS: TabLinkItem[] = [
  {
    href: "/projects/anime-release-watch",
    label: "Overview",
  },
  {
    href: "/projects/anime-release-watch/tasks",
    label: "Tasks",
  },
  {
    href: "/projects/anime-release-watch/lanes",
    label: "Lanes",
  },
  {
    href: "/projects/anime-release-watch/phases",
    label: "Phases",
  },
]

/**
 * A tab that is a **place**. Every trigger is a real `<a href>`, so
 * middle-click, ctrl-click, "open in a new tab" and "copy link
 * address" all work — and reloading the page comes back to the same
 * section, which is the whole reason to route one.
 *
 * The bar is a named `<nav>`, not a `tablist`: `role="tab"` on an
 * anchor overrides the link role, so a screen reader would announce
 * a disclosure and then the address would change instead. The
 * *paint* is shared with the panel bar above through
 * `toTabTriggerClass`, which is what this mode was added to fix.
 *
 * The sections themselves are rendered by the router — an
 * `<Outlet />` under the bar — so this component draws no panels
 * here at all.
 */
export const Routed: Story = {
  args: { label: "Bay 3", tabs: BAY_TABS },
  render: () => (
    <Tabs
      activeHref="/projects/anime-release-watch/phases"
      label="Anime Release Watch sections"
      tabs={PROJECT_TABS}
    />
  ),
}

/**
 * Routed and panel bars side by side — the comparison this mode
 * exists for. They are one shape doing one job, and before `href`
 * existed the routed one had to be built out of `Nav`, whose current
 * item is a filled pill.
 *
 * The third cell is the matching rule, which is `Nav`'s
 * `resolveActiveKey` rather than a second implementation: the
 * deepest matching path wins, so `/tasks` stands down while the
 * reader is on `/tasks` *and* nothing lights up twice.
 */
export const RoutedAllVariants: Story = {
  args: { label: "Bay 3", tabs: BAY_TABS },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="routed · horizontal">
        <Tabs
          activeHref="/projects/anime-release-watch/tasks"
          label="Routed horizontal"
          tabs={PROJECT_TABS}
        />
      </StoryCell>

      <StoryCell label="panel · horizontal">
        <Tabs label="Panel horizontal" tabs={BAY_TABS} />
      </StoryCell>

      <StoryCell label="routed · vertical">
        <Tabs
          activeHref="/projects/anime-release-watch/lanes"
          label="Routed vertical"
          orientation="vertical"
          tabs={PROJECT_TABS}
        />
      </StoryCell>

      <StoryCell label="routed · a child route is still the section">
        <Tabs
          activeHref="/projects/anime-release-watch/tasks/41"
          label="Routed on a child route"
          tabs={PROJECT_TABS}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

const ROUTED_STATE_TABS: TabLinkItem[] = [
  ...PROJECT_TABS,
  {
    href: "/projects/anime-release-watch/reports",
    isDisabled: true,
    label: "Reports",
  },
  {
    href: "https://mkdocs.octen.dev/workspace/docket/",
    isExternal: true,
    label: "Handbook",
  },
]

/**
 * A disabled routed tab is **not a link at all** — a `<span>` with
 * `aria-disabled`, because an anchor has no `disabled` attribute and
 * `aria-disabled` alone still navigates on Enter. That is the
 * version of this that looks right and is not.
 *
 * An external tab is a plain anchor with `target="_blank"` and
 * `rel="noopener noreferrer"`, and it is **never current** — no
 * address inside this app can be a place outside it.
 *
 * `activeHref` here is a screen the bar does not contain, which is
 * the third state: **nothing** is current. A bar that guessed the
 * closest tab instead would be lying on every modal route.
 */
export const RoutedAllStates: Story = {
  args: { label: "Bay 3", tabs: BAY_TABS },
  render: () => (
    <Tabs
      activeHref="/settings"
      label="Anime Release Watch states"
      tabs={ROUTED_STATE_TABS}
    />
  ),
}
