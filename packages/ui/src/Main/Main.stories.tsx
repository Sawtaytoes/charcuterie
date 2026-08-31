import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import { Card } from "../Card/Card.tsx"
import { Header } from "../Header/Header.tsx"
import { Rail } from "../Rail/Rail.tsx"
import { toMaxInlineSize } from "../Shell/contentWidth.ts"
import { Shell } from "../Shell/Shell.tsx"
import { Spinner } from "../Spinner/Spinner.tsx"
import {
  HeaderSchemeToggle,
  OverflowingContent,
  PageContent,
  RailNavigation,
} from "../shell.storyHelpers.tsx"
import { Main } from "./Main.tsx"

const CONTENT_WIDTH_OPTIONS = [
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "full",
] as const

const meta = {
  title: "Components/Layout/Main",
  component: Main,
  parameters: { layout: "fullscreen" },
  argTypes: {
    contentWidth: toStoryChoice(CONTENT_WIDTH_OPTIONS),
  },
  args: {},
} satisfies Meta<typeof Main>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A page whose grid answers to **the column**, not the window.
 *
 * `Main` establishes a container query, so the tile grid below
 * goes one-up, two-up, three-up as the *content column* changes —
 * which is a different number from the window's the moment a rail
 * is open. Open the rail and the same window width gives a
 * narrower grid, which is the case a `md:` media query cannot
 * tell apart and the reason the fleet's poster grids look wrong
 * at intermediate widths.
 */
export const Default: Story = {
  render: (mainProps) => (
    <Shell>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Library"
      />

      <Rail label="Sections" landmark="navigation">
        <RailNavigation />
      </Rail>

      <Main {...mainProps}>
        <div className="grid grid-cols-1 gap-4 cq-md:grid-cols-2 cq-xl:grid-cols-3">
          {[
            "Adventure Time",
            "Cowboy Bebop",
            "Deep Space Nine",
            "Twin Peaks",
            "Utopia",
            "Yellowjackets",
          ].map((title) => (
            <Card heading={title} key={title} padding="sm">
              <p className="text-content-secondary text-sm">
                4 seasons
              </p>
            </Card>
          ))}
        </div>
      </Main>
    </Shell>
  ),
}

/**
 * The width scale, drawn — because the fleet's real answer to
 * "how wide is the content column" is eight different numbers.
 *
 * Each bar is the actual `max-inline-size` a `contentWidth`
 * resolves to, taken from `toMaxInlineSize` rather than restated,
 * so a change to the `screen.*` scale moves the drawing.
 *
 * There is one bar per step and **no second `<main>`**: `<main>`
 * is the page's one main landmark, so a board that rendered six
 * of them to compare them would be an accessibility violation
 * demonstrating an accessibility component.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-6">
      <h3 className="font-semibold text-content-secondary text-sm">
        `screen.*` steps, plus the `full` escape hatch. `lg`
        is the default.
      </h3>

      {CONTENT_WIDTH_OPTIONS.map((step) => (
        <div className="flex items-center gap-3" key={step}>
          <span className="w-12 shrink-0 font-mono text-content-muted text-xs">
            {step}
          </span>

          <div
            className="h-6 w-full rounded-md border border-border-subtle bg-surface-raised"
            style={{ maxInlineSize: toMaxInlineSize(step) }}
          />
        </div>
      ))}
    </div>
  ),
}

/**
 * The 390px fixture. An unbroken 130-character path and a table
 * wider than the phone it is on, in one column.
 *
 * The path wraps because `Main` sets `overflow-wrap: break-word`;
 * the table cannot wrap at all and lives in a labelled,
 * keyboard-reachable scroll container. Neither widens the page,
 * which is the assertion `Main.test.tsx` makes at a real 390px
 * viewport.
 */
export const Responsive: Story = {
  render: (mainProps) => (
    <Shell>
      <Header heading="Transfers" />

      <Main {...mainProps}>
        <OverflowingContent />
      </Main>
    </Shell>
  ),
}

/**
 * Where the skip link lands. `<main>` carries `tabIndex={-1}` so
 * activating it moves **focus** and not merely the scroll
 * position — without that, Safari and Firefox scroll the page and
 * leave the next Tab back up in the header, which reads as the
 * skip link not working.
 */
export const Interactive: Story = {
  render: (mainProps) => (
    <Shell>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Rip Deck"
      />

      <Main {...mainProps}>
        <PageContent />
      </Main>
    </Shell>
  ),
}

const EPISODE_TITLES = Array.from(
  { length: 40 },
  (_unused, index) => `Episode ${index + 1}`,
)

type HistoryEntry = {
  episode: string | null
  key: string
}

/**
 * A history stack, small enough to read and honest about the one
 * thing that matters: **Back returns to the entry it left, with
 * the key it had.** That key is what the offset is filed under,
 * and reusing it is the whole mechanism.
 *
 * `contentDelayMs` is the second half of the problem. A real list
 * is fetched, so the commit that changes the route draws an empty
 * scrollport and the rows land later — an offset applied against
 * that clamps to `0`. Set it and the restore has to wait for the
 * content, which is the case the `ResizeObserver` in
 * `useScrollMemory` exists for.
 */
const ScrollMemoryDemo = ({
  contentDelayMs,
}: {
  contentDelayMs: number
}) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([
    { episode: null, key: "entry-1" },
  ])
  const [entryIndex, setEntryIndex] = useState(0)
  const [isContentReady, setIsContentReady] = useState(
    contentDelayMs === 0,
  )

  const entry = entries[entryIndex]

  useEffect(() => {
    if (contentDelayMs === 0) {
      return undefined
    }

    setIsContentReady(false)

    const timer = globalThis.setTimeout(() => {
      setIsContentReady(true)
    }, contentDelayMs)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [contentDelayMs])

  const open = (episode: string) => {
    const opened = [
      ...entries.slice(0, entryIndex + 1),
      { episode, key: `entry-${entries.length + 1}` },
    ]

    setEntries(opened)
    setEntryIndex(opened.length - 1)
  }

  return (
    <Shell>
      <Header
        actions={
          <Button
            appearance="outline"
            isDisabled={entryIndex === 0}
            onClick={() => {
              setEntryIndex(entryIndex - 1)
            }}
            size="sm"
          >
            Back
          </Button>
        }
        heading="Library"
      />

      <Main scrollKey={entry?.key}>
        {!isContentReady && <Spinner label="Loading" />}

        {isContentReady && entry?.episode == null && (
          <div className="flex flex-col gap-3">
            {EPISODE_TITLES.map((title) => (
              <Card
                heading={title}
                key={title}
                padding="sm"
              >
                <Button
                  appearance="ghost"
                  onClick={() => {
                    open(title)
                  }}
                  size="sm"
                >
                  Open {title}
                </Button>
              </Card>
            ))}
          </div>
        )}

        {isContentReady && entry?.episode != null && (
          <Card heading={entry.episode}>
            <p className="text-content-secondary text-sm">
              A page short enough that the scrollport
              collapses behind it. Press Back: the list
              returns to where it was, not to the top.
            </p>
          </Card>
        )}
      </Main>
    </Shell>
  )
}

/**
 * The reader's place, kept.
 *
 * `Shell` makes `<main>` the page's only vertical scrollport, and
 * a browser restores the **document** scroller and nothing else —
 * so without `scrollKey` this list comes back at the top every
 * time, in every browser, with no setting that changes it.
 *
 * Scroll the list, open an episode, then press Back.
 */
export const ScrollMemory: Story = {
  render: () => <ScrollMemoryDemo contentDelayMs={0} />,
}

/**
 * The same thing, with the rows arriving 250ms late — which is
 * what a fetched list does, and what makes a naive
 * `scrollTop = offset` do nothing at all.
 *
 * Back lands on an empty scrollport with no room for the offset,
 * so the browser clamps it to `0`. The restore therefore re-applies
 * as the content grows and stops the moment the offset lands, or
 * the moment the reader scrolls.
 */
export const ScrollMemoryWithLateContent: Story = {
  render: () => <ScrollMemoryDemo contentDelayMs={250} />,
}
