import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { Alert } from "../Alert/Alert.tsx"
import { Avatar } from "../Avatar/Avatar.tsx"
import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { EmptyState } from "../EmptyState/EmptyState.tsx"
import { MoreIcon } from "../icons.storyHelpers.tsx"
import { toPlainMarkdownText } from "../MarkdownLine/inlineMarkdown.ts"
import { MarkdownLine } from "../MarkdownLine/MarkdownLine.tsx"
import { ProgressBar } from "../ProgressBar/ProgressBar.tsx"
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx"
import type { BoardMove } from "./Board.tsx"
import { Board } from "./Board.tsx"
import type { BoardItem } from "./BoardCard.tsx"
import type { BoardLane } from "./BoardLaneList.tsx"

/**
 * **Invented, all of it.** The board this component was built for
 * tracks a real household, and its prototype's fixture file is real
 * data — which is exactly the thing that must never reach a
 * published repo, and doubly never a committed screenshot, because a
 * PNG is opaque to every grep and no text scrub can redact it.
 *
 * So this is a fictional studio's tooling backlog: long enough
 * titles to make truncation happen, enough rows to make the "+ n
 * more" line honest, and a lane with a live agent run in it.
 */
const PROJECTS = {
  atlas: "Atlas Ingest",
  ferry: "Ferry Docs",
  loom: "Loom Fleet",
  signal: "Signal Kitchen",
} as const

/**
 * Priority as an intent, written out once. There is no numeric
 * colour scale in this token set — the families are
 * `--color-intent-<intent>-<role>` — so a `p0`/`p1` map has to land
 * on an intent name or it lands on nothing at all and paints
 * transparent.
 */
const PRIORITY = {
  p0: { intent: "danger", label: "Priority 0" },
  p1: { intent: "warning", label: "Priority 1" },
  p2: { intent: "accent", label: "Priority 2" },
  p3: { intent: "neutral", label: "Priority 3" },
} as const

const Mark = ({
  intent,
  name,
}: {
  intent: "danger" | "success" | "warning"
  name: string
}): ReactNode => (
  <span
    className={
      intent === "success"
        ? "block size-2 rounded-full bg-intent-success-solid"
        : intent === "warning"
          ? "block size-2 rounded-full bg-intent-warning-solid"
          : "block size-2 rounded-full bg-intent-danger-solid"
    }
  >
    <VisuallyHidden>{name}</VisuallyHidden>
  </span>
)

const ProjectChip = ({
  name,
}: {
  name: string
}): ReactNode => (
  <Badge appearance="outline" intent="neutral" size="sm">
    {name}
  </Badge>
)

const LabelChip = ({
  name,
}: {
  name: string
}): ReactNode => (
  <Badge appearance="soft" intent="success" size="sm">
    {name}
  </Badge>
)

/**
 * The live-run line. `ProgressBar` with its label hidden, because
 * the phase text beside it already says what is happening — a
 * visible "Adopting the new toolbar" twice is a screen-reader
 * duplicate for no gain.
 */
const RunLine = ({
  elapsed,
  percent,
  phase,
}: {
  elapsed: string
  percent: number
  phase: string
}): ReactNode => (
  <span className="flex items-center gap-2">
    <span className="min-w-0 flex-1 truncate text-intent-success-content">
      {phase}
    </span>

    <ProgressBar
      className="w-16 shrink-0"
      intent="success"
      label={`${phase} progress`}
      size="sm"
      value={percent}
    />

    <span className="shrink-0 tabular-nums">{elapsed}</span>
  </span>
)

const FailedLine = ({
  reason,
}: {
  reason: string
}): ReactNode => (
  <span className="text-intent-danger-content">
    {reason}
  </span>
)

const toItem = ({
  assignee,
  footer,
  label = "agent-runnable",
  marks,
  priority,
  project,
  title,
}: {
  assignee: [string, string]
  footer?: ReactNode
  label?: string
  marks?: ReactNode
  priority: keyof typeof PRIORITY
  project: string
  title: string
}): BoardItem => ({
  accentIntent: PRIORITY[priority].intent,
  accentLabel: PRIORITY[priority].label,
  footer,
  href: `#/task/${encodeURIComponent(title)}`,
  key: title,
  marks,
  meta: (
    <>
      <ProjectChip name={project} />

      <LabelChip name={label} />
    </>
  ),
  title,
  /*
   * `Avatar` from this package, not a chip hand-rolled in a story
   * file. This story *had* one — a `size-5` circle painted
   * `intent-info`, with the name in a `VisuallyHidden` — which is
   * exactly the shape three apps were about to write for
   * themselves. The library owns the shape; the story owns the
   * data.
   */
  trailing: (
    <Avatar
      initials={assignee[0]}
      name={assignee[1]}
      size="sm"
    />
  ),
})

const ADA: [string, string] = ["AD", "Ada"]

const WREN: [string, string] = ["WR", "Wren"]

/**
 * A categorical index per project, and the same four projects the
 * rest of this file uses. The index is what a consumer's user
 * PICKED — it is not derived here, and it is never a hex.
 */
const PROJECT_EDGE_ITEMS: BoardItem[] = (
  [
    [
      PROJECTS.signal,
      2,
      "Retire the second scheduler and fold its jobs into the broker",
    ],
    [
      PROJECTS.loom,
      5,
      "One composed Storybook for every app in the fleet",
    ],
    [
      PROJECTS.atlas,
      8,
      "Fingerprint duplicate uploads before they reach the queue",
    ],
    [
      PROJECTS.ferry,
      10,
      "Rewrite the ingest runbook against the new broker",
    ],
  ] as const
).map(([project, categorical, title]) => ({
  accentEdge: { categorical },
  // The words the bar cannot say. A colour alone is a WCAG
  // 1.4.1 failure and is silent to a screen reader.
  accentLabel: project,
  href: `#/task/${encodeURIComponent(title)}`,
  key: title,
  meta: <ProjectChip name={project} />,
  title,
}))

const TODO_ITEMS: BoardItem[] = [
  toItem({
    assignee: WREN,
    priority: "p0",
    project: PROJECTS.signal,
    title:
      "Retire the second scheduler and fold its jobs into the broker",
  }),
  toItem({
    assignee: ADA,
    priority: "p1",
    project: PROJECTS.loom,
    title:
      "One composed Storybook for every app in the fleet",
  }),
  toItem({
    assignee: ADA,
    marks: <Mark intent="warning" name="Stale" />,
    priority: "p1",
    project: PROJECTS.atlas,
    title:
      "Fingerprint duplicate uploads before they reach the queue",
  }),
  toItem({
    assignee: WREN,
    label: "physical",
    priority: "p2",
    project: PROJECTS.ferry,
    title:
      "Photograph the rack layout for the wiring appendix",
  }),
  toItem({
    assignee: ADA,
    priority: "p2",
    project: PROJECTS.signal,
    title:
      "Move the nightly digest onto the shared template",
  }),
  toItem({
    assignee: ADA,
    priority: "p3",
    project: PROJECTS.loom,
    title: "Drop the four local overflow implementations",
  }),
]

const IN_PROGRESS_ITEMS: BoardItem[] = [
  toItem({
    assignee: ADA,
    footer: (
      <RunLine
        elapsed="41m"
        percent={64}
        phase="Adopting the toolbar in 3 of 4 repos"
      />
    ),
    marks: <Mark intent="success" name="Agent running" />,
    priority: "p0",
    project: PROJECTS.loom,
    title: "Unify the page chrome across the fleet",
  }),
  toItem({
    assignee: ADA,
    footer: (
      <FailedLine reason="Failed: the ingest token expired after 3 retries" />
    ),
    marks: <Mark intent="danger" name="Run failed" />,
    priority: "p0",
    project: PROJECTS.atlas,
    title: "Link queue for the weekly digest",
  }),
  toItem({
    assignee: WREN,
    priority: "p1",
    project: PROJECTS.signal,
    title: "Wire the pantry sensors onto the new bridge",
  }),
  toItem({
    assignee: ADA,
    footer: (
      <RunLine
        elapsed="2h 06m"
        percent={34}
        phase="Fingerprinting batch 118 of 342"
      />
    ),
    marks: <Mark intent="success" name="Agent running" />,
    priority: "p1",
    project: PROJECTS.atlas,
    title: "Deduplicate the archive by content hash",
  }),
  toItem({
    assignee: ADA,
    marks: <Mark intent="danger" name="Blocked" />,
    priority: "p2",
    project: PROJECTS.ferry,
    title: "Print farm queue — waiting on filament",
  }),
]

const REVIEW_ITEMS: BoardItem[] = [
  toItem({
    assignee: ADA,
    priority: "p1",
    project: PROJECTS.loom,
    title:
      "Merge manager rename, split-out and add-games flow",
  }),
  toItem({
    assignee: ADA,
    priority: "p1",
    project: PROJECTS.signal,
    title: "Usage rollup across every provider, one table",
  }),
  toItem({
    assignee: WREN,
    priority: "p2",
    project: PROJECTS.atlas,
    title: "Gallery downloader keeps its own store now",
  }),
  toItem({
    assignee: ADA,
    priority: "p2",
    project: PROJECTS.loom,
    title:
      "Push-transport kit for the shared broker package",
  }),
  toItem({
    assignee: ADA,
    priority: "p2",
    project: PROJECTS.ferry,
    title:
      "Un-pin the docs generator from the old renderer",
  }),
  toItem({
    assignee: WREN,
    priority: "p3",
    project: PROJECTS.loom,
    title: "Brace expansion no longer melts the search box",
  }),
  toItem({
    assignee: ADA,
    priority: "p3",
    project: PROJECTS.signal,
    title: "Generalise the app updater beyond one registry",
  }),
  toItem({
    assignee: ADA,
    priority: "p3",
    project: PROJECTS.atlas,
    title: "Container image auto-update, with a rollback",
  }),
]

const LANES: BoardLane[] = [
  { items: TODO_ITEMS, key: "todo", label: "Todo" },
  {
    items: IN_PROGRESS_ITEMS,
    key: "in-progress",
    label: "In Progress",
  },
  {
    actions: (
      <Button appearance="ghost" intent="accent" size="sm">
        Accept all
      </Button>
    ),
    // Eight rendered, nineteen real — which is what makes the
    // "+ 11 more" line true rather than decorative.
    itemCount: 19,
    items: REVIEW_ITEMS,
    key: "review",
    label: "Needs Review",
    onShowMore: () => undefined,
  },
]

/**
 * A **fixed** inline size, because the three-up layout is a
 * measurement of the board's own box. A story that inherited the
 * canvas width would show three lanes on one machine and one lane
 * plus a picker on another, and the test asserting it would be
 * asserting the window.
 */
const Frame = ({
  children,
  inlineSize,
}: {
  children: ReactNode
  inlineSize: string
}): ReactNode => (
  <div style={{ inlineSize }}>{children}</div>
)

const meta = {
  title: "Components/Layout/Board",
  component: Board,
  parameters: { layout: "padded" },
  args: {
    label: "Today",
    lanes: LANES,
  },
} satisfies Meta<typeof Board>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Three lanes at the density a real board reaches: priority bars,
 * project and label chips, assignee avatars, live run lines with
 * elapsed times, a failed run, and an honest overflow.
 *
 * Read-only — there is no `onMove`, so there are no handles. That is
 * a real mode rather than a story convenience: a board on a wall
 * display should not be advertising affordances nobody can use.
 */
export const Default: Story = {}

/**
 * Read-only against movable, side by side.
 *
 * The difference is one prop, and it is deliberately all-or-nothing:
 * a per-card `isMovable` would put the decision in the data, where a
 * consumer has to remember to set it, and where a card that cannot
 * move looks identical to one nobody has thought about.
 */
export const AllVariants: Story = {
  render: (boardProps) => (
    <StoryGrid columns={1}>
      <StoryCell
        align="stretch"
        label="read-only — no `onMove`, so no handles"
      >
        <Board {...boardProps} label="Today, read-only" />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="movable — every card carries a Move handle"
      >
        <Board
          {...boardProps}
          label="Today, movable"
          onMove={() => undefined}
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="movable, with the app's own `moveIcon` — ~55px a row cheaper"
      >
        <Board
          {...boardProps}
          label="Today, movable with an icon"
          moveIcon={<MoreIcon />}
          onMove={() => undefined}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The states a board is actually in, and the two nobody screenshots:
 * a lane with nothing in it, and a lane truncated with more behind
 * it.
 *
 * The empty lane is a real `EmptyState` with its own wording, not a
 * grey "Empty". *"Real empty states"* was a stated requirement,
 * because the empty lane is the one a person looks at most on a good
 * day.
 */
export const AllStates: Story = {
  render: (boardProps) => (
    <StoryGrid columns={1}>
      <StoryCell
        align="stretch"
        label="72rem — wide enough for three-up; an empty lane, a full one, and a truncated one"
      >
        <Frame inlineSize="72rem">
          <Board
            {...boardProps}
            label="Today, mixed lanes"
            lanes={[
              {
                emptyState: (
                  <EmptyState
                    description="Pull something over from the backlog."
                    heading="Nothing chosen yet"
                    headingLevel={4}
                    size="sm"
                  />
                ),
                items: [],
                key: "todo",
                label: "Todo",
              },
              {
                items: IN_PROGRESS_ITEMS,
                key: "in-progress",
                label: "In Progress",
              },
              {
                itemCount: 19,
                items: REVIEW_ITEMS,
                key: "review",
                label: "Needs Review",
                onShowMore: () => undefined,
              },
            ]}
          />
        </Frame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * **The story that proves the whole design**, and the only honest
 * way to show it: three fixed-width panels inside one unchanged
 * browser window.
 *
 * The narrow panel is not a phone. It is the same board in a
 * sidebar, in a split window, or on a display the owner has zoomed
 * to 175% — and a media query cannot tell any of those from a
 * maximised 4K window. Resizing the viewport would prove nothing
 * here, because the thing that changed is the component's container.
 *
 * Watch two things flip independently. The board's own box decides
 * whether the lanes are three-up or one-at-a-time behind a segmented
 * control; each **lane's** box decides whether a card is two lines,
 * one line, or a card of its own.
 */
export const Responsive: Story = {
  render: (boardProps) => (
    <div className="flex flex-col gap-8">
      <ContainerBoard>
        {(width) => (
          <Board
            {...boardProps}
            label={`Today at ${width}`}
          />
        )}
      </ContainerBoard>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-content-muted text-xs">
          a lane past --cq-lg (48rem) — the rows become
          cards
        </span>

        {/*
         * A **lane** wider than 48rem: the third row shape, and the
         * one it is easy to believe is unreachable. It is not. A
         * board with one or two lanes gives each of them most of the
         * board's width, and three lanes clear it on a 4K display —
         * the frame here is 56rem, an ordinary content column.
         */}
        <Frame inlineSize="56rem">
          <Board
            label="Needs Review, one lane"
            lanes={[
              {
                itemCount: 19,
                items: REVIEW_ITEMS.slice(0, 4),
                key: "review",
                label: "Needs Review",
              },
            ]}
          />
        </Frame>
      </div>
    </div>
  ),
}

/**
 * **The project on the leading edge**, in both of the shapes a card
 * takes — and the reason `accentEdge` exists beside `accentIntent`.
 *
 * The pill arm is a `w-1` span INSIDE the card, so it is a straight
 * rectangle next to a rounded box. The edge arm is `Card`'s own
 * treatment: a pseudo-element taking `border-radius: inherit`, so it
 * paints a straight stripe down a row that has no corner and wraps
 * the corner once the lane passes `cq-lg` and the row becomes a
 * card. One prop, correct in both shapes, and never a notch.
 *
 * The colours are CATEGORICAL — an identity, not a state. A project,
 * a repo, a source. Priority stays on the pill arm, where an intent
 * belongs.
 */
export const AccentEdge: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-content-muted text-xs">
          a narrow lane — rows, so the edge is a straight
          stripe
        </span>

        <Frame inlineSize="22rem">
          <Board
            label="Today, by project"
            lanes={[
              {
                items: PROJECT_EDGE_ITEMS,
                key: "todo",
                label: "Todo",
              },
            ]}
          />
        </Frame>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-content-muted text-xs">
          the same lane past --cq-lg (48rem) — cards, so the
          edge wraps the corner
        </span>

        <Frame inlineSize="56rem">
          <Board
            label="Today, by project, wide"
            lanes={[
              {
                items: PROJECT_EDGE_ITEMS,
                key: "todo",
                label: "Todo",
              },
            ]}
          />
        </Frame>
      </div>
    </div>
  ),
}

/**
 * The complete keyboard path, and it is the **primary** way to move
 * a card rather than an accessible alternative to the real one.
 *
 * Tab to a card's `Move` handle, press Enter, arrow to a lane, press
 * Enter again. The card moves, and a `role="status"` region says
 * where it went and what position it landed in — the one thing a
 * sighted user gets free from watching it land, and the thing every
 * drag implementation forgets to say out loud.
 *
 * Dragging the same handle with a mouse, a finger or a pen does the
 * same thing through the same callback. Escape abandons a drag in
 * flight.
 */
const MovableBoard = (): ReactNode => {
  const [lanes, setLanes] = useState<BoardLane[]>([
    { items: TODO_ITEMS, key: "todo", label: "Todo" },
    {
      items: IN_PROGRESS_ITEMS,
      key: "in-progress",
      label: "In Progress",
    },
    {
      items: REVIEW_ITEMS.slice(0, 4),
      key: "review",
      label: "Needs Review",
    },
  ])

  const applyMove = (move: BoardMove) => {
    setLanes((current) => {
      const moved = current
        .find((lane) => lane.key === move.fromLaneKey)
        ?.items.find((item) => item.key === move.itemKey)

      if (!moved) {
        return current
      }

      // `toIndex` already accounts for the removal, so this really
      // is a splice out and a splice in with no arithmetic.
      return current.map((lane) => {
        const kept =
          lane.key === move.fromLaneKey
            ? lane.items.filter(
                (item) => item.key !== move.itemKey,
              )
            : lane.items

        if (lane.key !== move.toLaneKey) {
          return { ...lane, items: kept }
        }

        return {
          ...lane,
          items: [
            ...kept.slice(0, move.toIndex),
            moved,
            ...kept.slice(move.toIndex),
          ],
        }
      })
    })
  }

  return (
    // Framed wide on purpose: the keyboard path is identical at
    // every width, but a reader who moves a card wants to watch it
    // land in the lane it went to rather than take the segmented
    // control's word for it.
    <Frame inlineSize="72rem">
      <Board
        label="Today, movable"
        lanes={lanes}
        moveIcon={<MoreIcon />}
        onMove={applyMove}
      />
    </Frame>
  )
}

export const Interactive: Story = {
  render: () => <MovableBoard />,
}

/**
 * Where it actually goes, and what the consumer still owns.
 *
 * The **"needs attention"** banner is not part of `Board`, and that
 * is a decision rather than an omission: it reaches across every
 * lane, so it is not a lane; it is absent when empty, so it is not
 * furniture the board can reserve room for; and it is already
 * `Alert` — the component this library shipped for exactly this
 * shape. Composing it here rather than absorbing it keeps `Board`
 * about lanes and cards, and keeps the banner reusable above a list
 * that is not a board at all.
 */
export const InBoardScreen: Story = {
  render: (boardProps) => (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display font-semibold text-2xl text-content-primary">
          Today
        </h1>

        <p className="text-content-secondary text-sm">
          Across every project — 6 chosen, 5 running, 19
          waiting on you
        </p>
      </div>

      <Alert
        description="Three things are stuck. Nothing below moves until they are dealt with."
        details={[
          "Run failed — Link queue for the weekly digest: the ingest token expired after 3 retries",
          "Blocked — Print farm queue: waiting on filament",
          "Stale — Fingerprint duplicate uploads: in Todo 19 days",
        ]}
        heading="Needs attention"
        intent="danger"
        label="Needs attention"
      />

      <Board
        {...boardProps}
        // The page's own `<h1>` is above it, so the lanes are `<h2>`
        // — an `<h3>` here is an axe `heading-order` failure and a
        // hole in the screen-reader outline.
        headingLevel={2}
        moveIcon={<MoreIcon />}
        onMove={() => undefined}
      />
    </div>
  ),
}

/**
 * A lane whose heading goes somewhere — the "show me only this
 * column" route.
 *
 * `href` on the lane, not a `ReactNode` label. The heading stays an
 * `<h3>` at the level the caller asked for, keeps its id, and keeps
 * naming the `group`; the anchor sits **inside** it, so the document
 * outline is the same one a board with no links has.
 *
 * It also reads as the same heading: `TextLink` supplies the cursor,
 * the focus ring and the hover underline, and the colour is
 * inherited. Three accent-coloured column titles would compete with
 * the card titles below them, which are what a reader is scanning.
 */
export const LinkedLaneHeadings: Story = {
  render: (boardProps) => (
    // The same fixed 72rem the other three-up stories use. Three
    // lanes at once is a measurement of the board's own box, and a
    // story that inherited the canvas width would show three linked
    // headings on one machine and one plus a segmented control on
    // another.
    <Frame inlineSize="72rem">
      <Board
        {...boardProps}
        lanes={LANES.map((lane) => ({
          ...lane,
          href: `/board/${lane.key}`,
        }))}
      />
    </Frame>
  ),
}

/**
 * Task names, as markdown. Invented, like every other string in this
 * file — keyed by the plain title each fixture already carries.
 */
const MARKDOWN_TITLES: Record<string, string> = {
  "Deduplicate the archive by content hash":
    "Deduplicate `~/archive` by content hash",
  "Link queue for the weekly digest":
    "Link queue for the ~~weekly~~ *daily* digest",
  "Unify the page chrome across the fleet":
    "**Unify** the page chrome across the fleet",
  "Wire the pantry sensors onto the new bridge":
    "Wire the pantry sensors onto `bridge-02`",
}

/**
 * A card whose title is **markdown** rather than a flat string.
 *
 * `titleContent` draws the line and `title` stays the words, because
 * the move handle is named after `title` — and a control named after
 * a `ReactNode` is a control with no name at all.
 *
 * The title takes its own navigation with it, which is why the type
 * refuses `href` beside `titleContent`: the board's own `TextLink`
 * around a line that may contain an anchor is an anchor inside an
 * anchor, which the HTML parser silently un-nests.
 */
export const MarkdownTitles: Story = {
  render: (boardProps) => (
    <Frame inlineSize="72rem">
      <Board
        {...boardProps}
        // Movable, so the move handle renders — it is named after
        // `title`, and that it stays the plain words is the whole
        // assertion this story exists for.
        onMove={() => {}}
        lanes={LANES.map((lane) => ({
          ...lane,
          items: lane.items.map(
            ({
              href: _href,
              onSelect: _onSelect,
              ...item
            }): BoardItem => {
              const markdown =
                MARKDOWN_TITLES[item.key] ?? item.title

              return {
                ...item,
                title: toPlainMarkdownText(markdown),
                titleContent: (
                  <MarkdownLine
                    href={`/tasks/${encodeURIComponent(item.key)}`}
                    value={markdown}
                  />
                ),
              }
            },
          ),
        }))}
      />
    </Frame>
  ),
}
