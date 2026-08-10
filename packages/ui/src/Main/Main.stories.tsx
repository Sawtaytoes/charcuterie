import type { Meta, StoryObj } from "@storybook/react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Card } from "../Card/Card.tsx"
import { Header } from "../Header/Header.tsx"
import { Rail } from "../Rail/Rail.tsx"
import { toMaxInlineSize } from "../Shell/contentWidth.ts"
import { Shell } from "../Shell/Shell.tsx"
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
  title: "Components/Main",
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
