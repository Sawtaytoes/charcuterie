import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { type CSSProperties, useState } from "react"

import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { EmptyState } from "../EmptyState/EmptyState.tsx"
import { ValuePairs } from "../ValuePairs/ValuePairs.tsx"
import type {
  GroupedListGroup,
  GroupedListItem,
} from "./GroupedList.tsx"
import { GroupedList } from "./GroupedList.tsx"
import { GROUPED_LIST_HEADING_SURFACE_PROPERTY } from "./groupedListStickyHeading.ts"

/**
 * Fixture data only. A signage app's pages, grouped by the screen
 * that shows them — the shape castkit's page picker draws.
 */
const openButton = (name: string, prefix = "") => (
  <Button
    appearance="outline"
    aria-label={`Open ${prefix}${name}`}
    size="sm"
  >
    Open
  </Button>
)

const SIGNAGE_GROUPS: GroupedListGroup[] = [
  {
    heading: "Screens",
    items: [
      {
        actions: openButton("Lobby"),
        badges: <Badge size="sm">PIN</Badge>,
        description:
          "3 views: Welcome, Weather, and Schedule",
        key: "lobby",
        label: "Lobby",
      },
      {
        actions: openButton("Break Room"),
        description: "1 view: Menu",
        key: "break-room",
        label: "Break Room",
      },
    ],
    key: "screens",
  },
  {
    heading: "On the Lobby screen",
    items: [
      {
        actions: openButton("Welcome"),
        description: "/views/welcome",
        key: "welcome",
        label: "Welcome",
      },
      {
        actions: openButton("Weather"),
        description: "/views/weather",
        key: "weather",
        label: "Weather",
      },
      {
        actions: openButton("Schedule"),
        description: "/views/schedule",
        key: "schedule",
        label: "Schedule",
      },
    ],
    key: "screen:lobby",
  },
  {
    heading: "Not on a screen",
    items: [
      {
        actions: openButton("Test Pattern"),
        description: "/views/test-pattern",
        key: "test-pattern",
        label: "Test Pattern",
      },
    ],
    key: "views",
  },
]

/**
 * Fixture data only. Chores grouped by the team that earns them,
 * each with a summary, badges and an Edit button — the shape
 * tally-marks' card list draws.
 */
const CHORE_GROUPS: GroupedListGroup[] = [
  {
    heading: "Team Orion",
    items: [
      {
        actions: (
          <Button
            appearance="outline"
            aria-label="Edit Water the ferns"
            size="sm"
          >
            Edit
          </Button>
        ),
        badges: (
          <>
            <Badge
              appearance="soft"
              intent="info"
              size="sm"
            >
              Once a day
            </Badge>

            <Badge
              appearance="soft"
              intent="warning"
              size="sm"
            >
              after 3:00 PM
            </Badge>
          </>
        ),
        content: "Up to 5 pts a day",
        description: "water-ferns",
        key: "water-ferns",
        label: "Water the ferns",
      },
      {
        actions: (
          <Button
            appearance="outline"
            aria-label="Edit Sort the recycling"
            size="sm"
          >
            Edit
          </Button>
        ),
        badges: (
          <Badge appearance="soft" size="sm">
            No tag
          </Badge>
        ),
        content: "Up to 3 scans a day · 6 pts max",
        description: "sort-recycling",
        key: "sort-recycling",
        label: "Sort the recycling",
      },
    ],
    key: "orion",
    summary: "2 cards · up to 11 pts a day",
  },
  {
    heading: "Team Vega",
    items: [
      {
        actions: (
          <Button
            appearance="outline"
            aria-label="Edit Feed the goldfish"
            size="sm"
          >
            Edit
          </Button>
        ),
        badges: (
          <Badge appearance="soft" intent="info" size="sm">
            Once a day
          </Badge>
        ),
        content: "Up to 2 pts a day",
        description: "feed-goldfish",
        key: "feed-goldfish",
        label: "Feed the goldfish",
      },
    ],
    key: "vega",
    summary: "1 card · up to 2 pts a day",
  },
]

/**
 * Fixture data only. A chore card whose whole row opens its editor:
 * the shape tally-marks' Rows view draws, with the payout beside the
 * text and the daily cap under it.
 */
type ChoreCard = {
  isActive: boolean
  isHighlighted?: boolean
  key: string
  label: string
  maxPerDay: number
  points: number
}

const CHORE_CARDS: ChoreCard[] = [
  {
    isActive: true,
    key: "water-ferns",
    label: "Water the ferns",
    maxPerDay: 5,
    points: 5,
  },
  {
    isActive: true,
    isHighlighted: true,
    key: "sort-recycling",
    label: "Sort the recycling",
    maxPerDay: 6,
    points: 2,
  },
  {
    isActive: false,
    key: "feed-goldfish",
    label: "Feed the goldfish",
    maxPerDay: 2,
    points: 2,
  },
]

/**
 * One chore card as a row. `onSelect` opens it; the action beside it
 * is a separate target. A switched-off card is muted and says so in
 * a badge.
 */
const toChoreRow = (
  card: ChoreCard,
  {
    onDelete,
    onSelect,
  }: {
    onDelete?: (label: string) => void
    onSelect?: (label: string) => void
  } = {},
): GroupedListItem => ({
  actions: (
    <Button
      appearance="ghost"
      aria-label={`Delete ${card.label}`}
      intent="danger"
      onClick={() => {
        onDelete?.(card.label)
      }}
      size="sm"
    >
      Delete
    </Button>
  ),
  aside: (
    <ValuePairs
      items={[
        {
          id: "scan",
          label: "Per scan",
          value: `${card.points} pts`,
        },
      ]}
      label="Payout"
    />
  ),
  badges: card.isActive ? undefined : (
    <Badge appearance="soft" size="sm">
      off
    </Badge>
  ),
  content: `Up to ${card.maxPerDay} pts a day`,
  description: card.key,
  highlightIntent: "success",
  isHighlighted: card.isHighlighted,
  isMuted: !card.isActive,
  key: card.key,
  label: card.label,
  onSelect: () => {
    onSelect?.(card.label)
  },
  selectLabel: `Edit ${card.label}`,
})

const toChoreGroups = (
  handlers?: Parameters<typeof toChoreRow>[1],
): GroupedListGroup[] => [
  {
    heading: "Team Orion",
    items: CHORE_CARDS.map((card) =>
      toChoreRow(card, handlers),
    ),
    key: "orion",
    summary: "3 cards · up to 11 pts a day",
  },
]

/**
 * Fixture data only. The same plain row in each highlight intent.
 */
const HIGHLIGHT_INTENT_GROUPS: GroupedListGroup[] = [
  {
    heading: "Highlight intents",
    items: (
      [
        "accent",
        "success",
        "info",
        "warning",
        "danger",
        "neutral",
      ] as const
    ).map((intent) => ({
      description: `highlightIntent="${intent}"`,
      highlightIntent: intent,
      isHighlighted: true,
      key: intent,
      label: `Highlighted ${intent}`,
    })),
    key: "intents",
  },
]

const LONG_GROUPS: GroupedListGroup[] = [
  {
    heading:
      "On the Conference Center North Atrium Wayfinding screen",
    items: [
      {
        actions: openButton(
          "Quarterly All-Hands Countdown and Seating Chart",
        ),
        badges: (
          <>
            <Badge size="sm">PIN</Badge>

            <Badge
              appearance="soft"
              intent="info"
              size="sm"
            >
              Rotates every 30 s
            </Badge>
          </>
        ),
        description:
          "/views/quarterly-all-hands-countdown-and-seating-chart-for-the-north-atrium",
        key: "all-hands",
        label:
          "Quarterly All-Hands Countdown and Seating Chart",
      },
      {
        actions: openButton("Map"),
        description: "/views/map",
        key: "map",
        label: "Map",
      },
    ],
    key: "atrium",
  },
]

/**
 * Fixture data only. Enough screens that the pane has to scroll, so
 * a stuck heading has rows to sit over.
 */
const MANY_SCREEN_GROUPS: GroupedListGroup[] = [
  "Lobby",
  "Break Room",
  "Loading Dock",
].map((screen) => ({
  heading: `On the ${screen} screen`,
  items: ["Welcome", "Weather", "Schedule", "Menu"].map(
    (view) => ({
      actions: openButton(`${view} on ${screen}`),
      description: `/views/${view.toLowerCase()}`,
      key: view,
      label: view,
    }),
  ),
  key: screen,
}))

/**
 * A fixed block size is what makes the pane scroll; the heading
 * sticks to the pane, the nearest scrolling ancestor.
 */
const SCROLL_PANE_STYLE: CSSProperties = {
  blockSize: "16rem",
}

/**
 * The host says which surface the list sits on. The pane is raised,
 * so the stuck heading is raised too.
 */
const RAISED_PANE_STYLE = {
  ...SCROLL_PANE_STYLE,
  [GROUPED_LIST_HEADING_SURFACE_PROPERTY]:
    "var(--color-surface-raised)",
} as CSSProperties

/**
 * A cap rather than a width, so the long label clips in every window
 * — an ultrawide grid cell would otherwise hold it whole and the
 * truncation half of the board would show nothing.
 */
const TRUNCATION_CELL_STYLE = { maxInlineSize: "20rem" }

const meta = {
  title: "Components/Data/GroupedList",
  component: GroupedList,
  parameters: { layout: "padded" },
  args: {
    groups: SIGNAGE_GROUPS,
    headingLevel: 3,
    isTextTruncated: true,
    size: "md",
  },
} satisfies Meta<typeof GroupedList>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A signage app's pages under the screen that shows them. Each row is
 * a name, a muted line, an optional badge, and one action named
 * after its row.
 */
export const Playground: Story = {
  parameters: playgroundParameters,
}

/**
 * `size` and `isTextTruncated` are the two axes. `sm` is a settings
 * pane or a sidebar; `md` is a page. Wrapping is for a list whose
 * rows are read rather than scanned.
 */
export const AllVariants: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="md (default)">
        <GroupedList groups={CHORE_GROUPS} />
      </StoryCell>

      <StoryCell align="stretch" label="sm">
        <GroupedList groups={CHORE_GROUPS} size="sm" />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="isTextTruncated (default)"
      >
        <div style={TRUNCATION_CELL_STYLE}>
          <GroupedList groups={LONG_GROUPS} size="sm" />
        </div>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="isTextTruncated={false}"
      >
        <div style={TRUNCATION_CELL_STYLE}>
          <GroupedList
            groups={LONG_GROUPS}
            isTextTruncated={false}
            size="sm"
          />
        </div>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Every optional part of a row, added one at a time — and the two
 * group states: an empty group is not drawn, and a list with no
 * items at all draws its `emptyState`.
 */
export const AllStates: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="label only">
        <GroupedList
          groups={[
            {
              heading: "Label only",
              items: [
                { key: "alpha", label: "Alpha" },
                { key: "beta", label: "Beta" },
              ],
              key: "plain",
            },
          ]}
          size="sm"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="description, badges, content, actions"
      >
        <GroupedList
          groups={[CHORE_GROUPS[1] as GroupedListGroup]}
          size="sm"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="an empty group is not drawn"
      >
        <GroupedList
          groups={[
            {
              heading: "Never drawn",
              items: [],
              key: "empty",
            },
            {
              heading: "Drawn",
              items: [{ key: "gamma", label: "Gamma" }],
              key: "drawn",
            },
          ]}
          size="sm"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="every group empty: emptyState"
      >
        <GroupedList
          emptyState={
            <EmptyState
              description="Try fewer words."
              heading="No page matches"
              headingLevel={3}
              size="sm"
            />
          }
          groups={[
            {
              heading: "Screens",
              items: [],
              key: "screens",
            },
          ]}
          size="sm"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The text column asks for 12rem and grows. Below that, the actions
 * drop under the text instead of crushing the label — decided by the
 * content, with no container query and no media query.
 */
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      <GroupedList groups={CHORE_GROUPS} size="sm" />
    </ContainerBoard>
  ),
}

/**
 * Tab walks the actions in reading order, group by group. Nothing
 * else in the list takes focus: a row is not a control, and its
 * action carries its name ("Open Lobby").
 */
export const Interactive: Story = {}

/**
 * A long label and a long path clip to one line, and the full text
 * is the tooltip while — and only while — it is clipped. The short
 * row underneath has no tooltip at all.
 */
export const LongText: Story = {
  render: () => (
    <div style={{ inlineSize: "28rem" }}>
      <GroupedList groups={LONG_GROUPS} />
    </div>
  ),
}

/**
 * Nothing to list. The app chooses the wording — "nothing yet" and
 * "nothing matches" are different sentences — and passes it as
 * `emptyState`.
 */
export const Empty: Story = {
  args: {
    emptyState: (
      <EmptyState
        description="Add screens and views in the management page."
        heading="This server has no pages"
        headingLevel={3}
        size="sm"
      />
    ),
    groups: [],
  },
}

/**
 * The Narrow View: a phone-width window. Badges wrap under the
 * label, and the actions wrap under the text.
 */
export const NarrowView: Story = {
  args: { groups: CHORE_GROUPS, size: "sm" },
  globals: { viewport: { value: "mobile1" } },
}

/**
 * `isHeadingSticky` pins each heading to the top of the scrolling
 * pane while its rows scroll under it. On the left the pane is the
 * page surface, which is the default heading background. On the
 * right the pane is raised, and it sets
 * `--charcuterie-grouped-list-heading-surface` to match.
 */
export const StickyHeadings: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell
        align="stretch"
        label="default: surface-base"
      >
        <section
          aria-label="Pages on a base surface"
          className="overflow-y-auto rounded-lg border border-border-subtle bg-surface-base px-3"
          style={SCROLL_PANE_STYLE}
        >
          <GroupedList
            groups={MANY_SCREEN_GROUPS}
            isHeadingSticky
            size="sm"
          />
        </section>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="host sets the surface: surface-raised"
      >
        <section
          aria-label="Pages on a raised surface"
          className="overflow-y-auto rounded-lg border border-border-subtle bg-surface-raised px-3"
          style={RAISED_PANE_STYLE}
        >
          <GroupedList
            groups={MANY_SCREEN_GROUPS}
            isHeadingSticky
            size="sm"
          />
        </section>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * A row whose whole surface is its primary action. `onSelect` draws
 * one native button under the row's text, named by `selectLabel`;
 * the Delete action sits above it as its own target. The status
 * line under the list says which one a click reached.
 *
 * The second card is highlighted (a scan just paid it), and the
 * third is switched off, so it is muted.
 */
export const SelectableRows: Story = {
  render: function SelectableRowsStory() {
    const [lastEvent, setLastEvent] = useState(
      "Nothing chosen yet",
    )

    return (
      <div className="flex flex-col gap-3">
        <GroupedList
          groups={toChoreGroups({
            onDelete: (label) => {
              setLastEvent(`Deleted ${label}`)
            },
            onSelect: (label) => {
              setLastEvent(`Opened ${label}`)
            },
          })}
        />

        <p
          className="m-0 text-content-secondary text-sm"
          role="status"
        >
          {lastEvent}
        </p>
      </div>
    )
  },
}

/**
 * Every per-row state at once: hover, press and keyboard focus on
 * the whole-row button (forced by the pseudo-states addon, the only
 * way to review them in a static board), a muted row, and a
 * highlight in each intent. The highlight's pulse is frozen here, so
 * this is also its static, reduced-motion look.
 */
export const RowStates: Story = {
  parameters: {
    pseudo: {
      active: ["#active-row li:first-child > button"],
      focusVisible: ["#focus-row li:first-child > button"],
      hover: ["#hover-row li:first-child > button"],
    },
  },
  render: () => (
    <StoryGrid columns={2}>
      {(
        [
          ["resting", "resting-row"],
          ["hover (forced)", "hover-row"],
          ["active (forced)", "active-row"],
          ["focus-visible (forced)", "focus-row"],
        ] as const
      ).map(([label, id]) => (
        <StoryCell align="stretch" key={id} label={label}>
          <div id={id}>
            <GroupedList
              groups={[
                {
                  heading: `Team Orion, ${label}`,
                  items: CHORE_CARDS.slice(0, 1).map(
                    (card) => toChoreRow(card),
                  ),
                  key: id,
                },
              ]}
              size="sm"
            />
          </div>
        </StoryCell>
      ))}

      <StoryCell align="stretch" label="isMuted">
        <GroupedList
          groups={[
            {
              heading: "Switched off",
              items: [
                toChoreRow(CHORE_CARDS[2] as ChoreCard),
              ],
              key: "muted",
            },
          ]}
          size="sm"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="isHighlighted, each highlightIntent"
      >
        <GroupedList
          groups={HIGHLIGHT_INTENT_GROUPS}
          size="sm"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Light and dark side by side, each panel scoped with its own
 * `data-scheme`, so both read at once whatever the toolbar says.
 */
export const ColorSchemes: Story = {
  render: () => (
    <StoryGrid columns={2}>
      {(["light", "dark"] as const).map((scheme) => (
        <StoryCell
          align="stretch"
          key={scheme}
          label={scheme}
        >
          <div
            className="rounded-lg bg-surface-base p-4 text-content-primary"
            data-scheme={scheme}
          >
            <GroupedList
              groups={SIGNAGE_GROUPS.map((group) => ({
                ...group,
                items: group.items.map((item) => ({
                  ...item,
                  actions: openButton(
                    item.label,
                    `${scheme} `,
                  ),
                })),
              }))}
              size="sm"
            />
          </div>
        </StoryCell>
      ))}
    </StoryGrid>
  ),
}
