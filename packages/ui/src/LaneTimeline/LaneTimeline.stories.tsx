import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { EmptyState } from "../EmptyState/EmptyState.tsx"
import { LaneTimeline } from "./LaneTimeline.tsx"
import type { TimelineItem } from "./LaneTimelineBar.tsx"
import type { TimelineLane } from "./LaneTimelineLane.tsx"

/**
 * **Invented, all of it.** The calendar this component was built for
 * is a real household, and a fixture taken from one would be
 * unremovable the moment it reached a committed screenshot — a PNG
 * is opaque to every grep and no text scrub redacts it.
 *
 * So this is a fictional recording studio's week. The names are the
 * same four the `Board` stories use, because a reader moving between
 * two docs pages should not have to learn a second cast.
 *
 * Every date is **April 2026**, and `2026-04-06` is a Monday — so a
 * seven-day week is `06` to `12`, and the inclusive end is something
 * a reader can check by counting columns rather than by trusting
 * prose.
 */
const WEEK = {
  end: "2026-04-12",
  start: "2026-04-06",
}

const MONTH = {
  end: "2026-04-30",
  start: "2026-04-01",
}

/**
 * The load asymmetry, which is the whole reason the component exists
 * rather than a month grid. Wren is carrying most of this week and
 * Ada is carrying one afternoon of it, and that is meant to be
 * obvious before anybody reads a word: Wren's lane stacks three bars
 * deep and is three times the height of Ada's.
 */
const LANES: TimelineLane[] = [
  {
    items: [
      {
        end: "2026-04-08",
        key: "foley",
        start: "2026-04-07",
        title: "Foley session",
      },
    ],
    key: "ada",
    label: "Ada",
  },
  {
    items: [
      {
        end: "2026-04-12",
        key: "on-call",
        start: "2026-04-06",
        title: "On call for the rig",
      },
      {
        end: "2026-04-09",
        key: "field-trip",
        start: "2026-04-06",
        title: "Field recording trip",
      },
      {
        end: "2026-04-06",
        key: "mic-locker",
        start: "2026-04-06",
        title: "Mic locker inventory",
      },
      {
        end: "2026-04-10",
        key: "mixing",
        start: "2026-04-08",
        title: "Mixing block",
      },
      {
        end: "2026-04-09",
        key: "listen-back",
        start: "2026-04-09",
        title: "Client listen back",
      },
      {
        end: "2026-04-12",
        key: "stems",
        start: "2026-04-10",
        title: "Stems delivery",
      },
    ],
    key: "wren",
    label: "Wren",
  },
  {
    items: [
      {
        end: "2026-04-08",
        key: "score-revisions",
        start: "2026-04-06",
        title: "Score revisions",
      },
      {
        end: "2026-04-10",
        key: "coast-train",
        start: "2026-04-10",
        title: "Train to the coast",
      },
      {
        end: "2026-04-12",
        key: "rig-service",
        start: "2026-04-11",
        title: "Rig service",
      },
    ],
    key: "juno",
    label: "Juno",
  },
  {
    items: [
      {
        end: "2026-04-11",
        key: "patch-bay",
        start: "2026-04-09",
        title: "Patch bay rewire",
      },
    ],
    key: "rook",
    label: "Rook",
  },
]

/**
 * The four edge cases, in one lane, because each of them is a place
 * a naive implementation draws nothing or draws it somewhere else —
 * and none of the four is visible in a screenshot without a correct
 * one beside it.
 */
const EDGE_CASE_ITEMS: TimelineItem[] = [
  {
    // Starts nine days before the week. Clipped to column 1, square
    // leading edge, and its hidden sentence still says 30 March.
    end: "2026-04-08",
    key: "long-hire",
    start: "2026-03-30",
    title: "Desk hire, started last month",
  },
  {
    // Runs to the end of April. Clipped to the last column, square
    // trailing edge.
    end: "2026-04-30",
    key: "residency",
    start: "2026-04-10",
    title: "Residency, runs into May",
  },
  {
    // One day. A bar, not a dot — one vocabulary on the axis.
    end: "2026-04-09",
    key: "delivery",
    start: "2026-04-09",
    title: "Tape delivery",
  },
  {
    // `end` before `start`: somebody typed the dates the wrong way
    // round. Drawn on its start day rather than dropped, because a
    // dropped row is a data fault nobody can see.
    end: "2026-04-06",
    key: "reversed",
    start: "2026-04-11",
    title: "Kit return, dates entered backwards",
  },
  {
    // Entirely outside the week. Not drawn at all, and not counted —
    // nothing is missing from this picture, the picture is of
    // another week.
    end: "2026-04-26",
    key: "next-month",
    start: "2026-04-20",
    title: "Next month's session",
  },
]

/**
 * A **fixed** inline size, because the fold is a measurement of the
 * component's own box. A story that inherited the canvas width would
 * draw an axis on one machine and the Narrow View on another, and a
 * screenshot of it would be a screenshot of somebody's window.
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
  title: "Components/Data/LaneTimeline",
  component: LaneTimeline,
  parameters: { layout: "padded" },
  args: {
    headingLevel: 3,
    label: "The week",
    lanes: LANES,
    /*
     * Pinned, and not because anybody prefers it. `Intl` with no
     * locale uses the runtime's, so the same story renders
     * "Mon 6 Apr" on one machine and "Mon, Apr 6" on the next — and
     * the test asserting the bar's name would then be asserting the
     * test runner's locale. An app passes its own, or omits it and
     * gets the reader's.
     */
    locale: "en-GB",
    maxRowCount: 6,
    minColumnSize: 1.75,
    range: WEEK,
  },
} satisfies Meta<typeof LaneTimeline>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Four lanes across one week, at the density a real schedule
 * reaches.
 *
 * Read it for the **shape** rather than the entries: Wren's lane is
 * three bars deep for most of the week and Ada's is one bar on one
 * afternoon. That is the question a month grid cannot answer, because
 * a grid gives every day the same box no matter what is in it.
 */
export const Playground: Story = {
  parameters: playgroundParameters,
  render: (timelineProps) => (
    <Frame inlineSize="64rem">
      <LaneTimeline {...timelineProps} />
    </Frame>
  ),
}

/**
 * Plain bars, lanes whose headings navigate, and bars that act.
 *
 * `href` and `onSelect` are a **union** on the item, not two
 * optionals: the first renders an `<a>` and the second a `<button>`,
 * so an item carrying both would be one of them with the other
 * silently dropped, and the two are identical on screen.
 */
export const AllVariants: Story = {
  render: (timelineProps) => (
    <StoryGrid columns={1}>
      <StoryCell
        align="stretch"
        label="plain — nothing to press, which is a real mode for a wall display"
      >
        <Frame inlineSize="56rem">
          <LaneTimeline
            {...timelineProps}
            label="The week, read-only"
          />
        </Frame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="lane headings that navigate — the show-me-only-this-lane route"
      >
        <Frame inlineSize="56rem">
          <LaneTimeline
            {...timelineProps}
            label="The week, with linked lanes"
            lanes={LANES.map((lane) => ({
              ...lane,
              href: `/lane/${lane.key}`,
            }))}
          />
        </Frame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="bars that navigate — every bar is a real `<a href>`"
      >
        <Frame inlineSize="56rem">
          <LaneTimeline
            {...timelineProps}
            label="The week, with linked bars"
            lanes={LANES.map((lane) => ({
              ...lane,
              /*
               * The two action keys are taken off before the new
               * one goes on. A spread of a union widens both of
               * them back to optional, and the type then refuses
               * the result — which is the type doing its job: an
               * item with an `href` *and* an `onSelect` is an `<a>`
               * with a dropped handler, and it looks correct.
               */
              items: lane.items.map(
                ({
                  href: _href,
                  onSelect: _onSelect,
                  ...item
                }): TimelineItem => ({
                  ...item,
                  href: `/item/${item.key}`,
                }),
              ),
            }))}
          />
        </Frame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The states nobody screenshots: the four edge cases, a lane past
 * its row limit, a lane with nothing on, and a timeline with no
 * lanes at all.
 *
 * `maxRowCount={2}` on the second panel is the honest-overflow rule
 * `Board`'s `+ n more` already follows. A lane that silently drops
 * its ninth overlapping thing is a lane that lies about how loaded
 * it is, which is the one question this component answers.
 */
export const AllStates: Story = {
  render: (timelineProps) => (
    <StoryGrid columns={1}>
      <StoryCell
        align="stretch"
        label="the four edge cases, plus one item that is in another week entirely"
      >
        <Frame inlineSize="56rem">
          <LaneTimeline
            {...timelineProps}
            label="The week, edge cases"
            lanes={[
              {
                items: EDGE_CASE_ITEMS,
                key: "studio",
                label: "Studio floor",
              },
            ]}
          />
        </Frame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="a lane past its row limit, and a lane with nothing on"
      >
        <Frame inlineSize="56rem">
          <LaneTimeline
            {...timelineProps}
            label="The week, at the row limit"
            lanes={[
              LANES[1] as TimelineLane,
              {
                items: [],
                key: "spare",
                label: "Spare room",
              },
            ]}
            maxRowCount={2}
          />
        </Frame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="no lanes — a real `EmptyState`, which is what a good week looks like"
      >
        <Frame inlineSize="56rem">
          <LaneTimeline
            {...timelineProps}
            label="The week, empty"
            lanes={[]}
          />
        </Frame>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="the consumer's own empty state"
      >
        <Frame inlineSize="56rem">
          <LaneTimeline
            {...timelineProps}
            emptyState={
              <EmptyState
                description="Add a lane for each person and the week fills itself in."
                heading="Nobody has a lane yet"
                headingLevel={3}
                size="sm"
              />
            }
            label="The week, empty with a custom message"
            lanes={[]}
          />
        </Frame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * **The story that proves the fold**, and the only honest way to show
 * it: three fixed-width panels inside one browser window that never
 * moves.
 *
 * The narrow panel is not a phone. It is the same timeline in a
 * sidebar, in a split window, or on a display somebody has zoomed to
 * 175% — and the component cannot tell those apart from each other,
 * only from a box with room for an axis in it.
 *
 * Watch what the fold actually is. It is **not** a width: it is the
 * width divided by the number of days, so the same 24rem panel keeps
 * its axis for a week and loses it for a quarter. When it goes, the
 * axis is abandoned rather than squeezed — each lane becomes a
 * one-column list with every span written out in words, and nothing
 * scrolls sideways.
 */
export const Responsive: Story = {
  render: (timelineProps) => (
    <div className="flex flex-col gap-8">
      <ContainerBoard>
        {(width) => (
          <LaneTimeline
            {...timelineProps}
            label={`The week at ${width}`}
          />
        )}
      </ContainerBoard>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-content-muted text-xs">
          the same three widths, one month instead of one
          week
        </span>

        <ContainerBoard>
          {(width) => (
            <LaneTimeline
              {...timelineProps}
              label={`The month at ${width}`}
              range={MONTH}
            />
          )}
        </ContainerBoard>
      </div>
    </div>
  ),
}

/**
 * The Narrow View on its own, big enough to read.
 *
 * Each lane keeps its name, its count and its colour, and every item
 * becomes a line with its span in words underneath it. Nothing is
 * behind a gesture and nothing is off the side of the box — *"no
 * horizontal scroll, ever"*, the same rule `Board` settled, for the
 * same reason: a pan surface hides content with no affordance and
 * fights the trackpad's own back-navigation.
 */
export const NarrowView: Story = {
  render: (timelineProps) => (
    // 20rem is a small phone, and it is deliberately a width rather
    // than a device: the same layout is what a docked sidebar gets on
    // a 4K monitor.
    <Frame inlineSize="20rem">
      <LaneTimeline
        {...timelineProps}
        label="The week, Narrow View"
      />
    </Frame>
  ),
}

/**
 * A month, where the tick labels **thin** rather than shrink.
 *
 * Type that shrinks to fit is type somebody cannot read, and the
 * density axis already owns font size. So the axis drops to one
 * label a week — whole weeks, never a step of two or three, because
 * labels landing on Tuesday then Thursday then Saturday give the eye
 * nothing to lock onto.
 */
export const LongRange: Story = {
  render: (timelineProps) => (
    <Frame inlineSize="72rem">
      <LaneTimeline
        {...timelineProps}
        label="The month"
        range={MONTH}
      />
    </Frame>
  ),
}

/**
 * Every bar is a real control, and the keyboard path is the same one
 * a pointer takes.
 *
 * Tab moves through the bars in **chronological** order within a
 * lane and lane by lane down the page, which is the order the DOM is
 * written in rather than the order the packer happened to stack
 * them. Enter or Space fires the item. There is no drag and no
 * resize: moving a bar is a write, and a write is a different
 * component with a different decision behind it.
 */
const SelectableTimeline = (): ReactNode => {
  const [selectedTitle, setSelectedTitle] = useState("")

  return (
    <Frame inlineSize="64rem">
      <div className="flex flex-col gap-3">
        <LaneTimeline
          label="The week, selectable"
          locale="en-GB"
          lanes={LANES.map((lane) => ({
            ...lane,
            items: lane.items.map(
              ({
                href: _href,
                onSelect: _onSelect,
                ...item
              }): TimelineItem => ({
                ...item,
                onSelect: () => {
                  setSelectedTitle(item.title)
                },
              }),
            ),
          }))}
          range={WEEK}
        />

        <p className="text-content-secondary text-sm">
          {selectedTitle
            ? `Picked: ${selectedTitle}`
            : "Nothing picked yet."}
        </p>
      </div>
    </Frame>
  )
}

export const Interactive: Story = {
  render: () => <SelectableTimeline />,
}
