import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import {
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import { SegmentedControl } from "../SegmentedControl/SegmentedControl.tsx"
import { AdaptiveGrid } from "./AdaptiveGrid.tsx"
import { getColumnChoices } from "./chooseColumns.ts"
import type { BlockSizeResolver } from "./useAdaptiveColumns.ts"

/**
 * A fixed block size, so a story shows the rule rather than the
 * height of whichever frame Storybook happened to render it in.
 *
 * This is also the seam that makes the DOM tests deterministic: the
 * source app forced the viewport with
 * `Object.defineProperty(window, "innerHeight", …)`, because in a
 * real chromium `innerHeight` is a read-only accessor and a plain
 * assignment is a silent no-op. Injecting a resolver retires that
 * trick entirely.
 */
const fixedBlockSize = (
  blockSize: number,
): BlockSizeResolver => ({
  get: () => blockSize,
  subscribe: () => () => {},
})

/**
 * `getColumnChoices({ maxColumns: 4 })`, as the picker's items —
 * `"auto"` first, because a picker that only offers numbers once a
 * number has been chosen is a one-way door.
 */
const COLUMN_ITEMS = getColumnChoices({ maxColumns: 4 }).map(
  (choice) => ({
    label: String(choice),
    value: String(choice),
  }),
)

const NINE_ITEMS = Array.from(
  { length: 9 },
  (_, index) => `Bay ${index + 1}`,
)

const Item = ({ label }: { label: string }) => (
  <Card padding="md" surface="raised">
    <p className="font-semibold text-content-primary">
      {label}
    </p>

    {/*
     * An unbroken string with no wrap opportunity — the thing a
     * grid item's `min-content` minimum turns into a horizontal
     * scrollbar. `truncate` clips it; `[&>*]:min-w-0` inside
     * `AdaptiveGrid` is what lets the track get small enough for
     * the clipping to matter.
     */}
    <p className="truncate text-content-muted text-sm">
      /mnt/Bunnies/Family/Media/very/long/unbroken/path/that/would/push/a/track/wide
    </p>
  </Card>
)

const meta = {
  title: "Components/AdaptiveGrid",
  component: AdaptiveGrid,
  parameters: { layout: "padded" },
  args: {
    children: NINE_ITEMS.map((label) => (
      <Item key={label} label={label} />
    )),
    chromeBlockSize: 260,
    itemBlockSize: 150,
  },
} satisfies Meta<typeof AdaptiveGrid>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Nine items in a 1080px-tall window. Five stack, so two columns
 * carry nine — and the content cap widens from 56rem to 72rem to
 * hold them.
 */
export const Default: Story = {
  args: { blockSizeResolver: fixedBlockSize(1080) },
}

/**
 * The same nine items, the same width, three window heights.
 *
 * This is the whole rule in one board, and the middle panel is the
 * part that reads backwards: a **taller** window takes **fewer**
 * columns, because height is what a column is bought with.
 */
export const AllVariants: Story = {
  render: (gridProps) => (
    <StorySection title="Same items, same width — only the height changes.">
      {[
        { blockSize: 1440, label: "1440px tall — 2 columns" },
        { blockSize: 900, label: "900px tall — 3 columns" },
        { blockSize: 600, label: "600px tall — 3 columns" },
      ].map((panel) => (
        <StoryRow key={panel.label}>
          <div className="flex w-full flex-col gap-2">
            <span className="font-mono text-content-muted text-xs">
              {panel.label}
            </span>

            <AdaptiveGrid
              {...gridProps}
              blockSizeResolver={fixedBlockSize(
                panel.blockSize,
              )}
            >
              {NINE_ITEMS.map((label) => (
                <Item key={label} label={label} />
              ))}
            </AdaptiveGrid>
          </div>
        </StoryRow>
      ))}
    </StorySection>
  ),
}

/**
 * One item is one column at every size — the case that would
 * otherwise stretch a lone card across an ultrawide.
 */
export const AllStates: Story = {
  args: { blockSizeResolver: fixedBlockSize(900) },
  render: (gridProps) => (
    <StoryGrid columns={1}>
      <StoryCell align="stretch" label="one item">
        <AdaptiveGrid {...gridProps}>
          <Item label="Bay 1" />
        </AdaptiveGrid>
      </StoryCell>

      <StoryCell align="stretch" label="nine items">
        <AdaptiveGrid {...gridProps}>
          {NINE_ITEMS.map((label) => (
            <Item key={label} label={label} />
          ))}
        </AdaptiveGrid>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Three container widths, with the column floor dropped to 160px so
 * the panels differ inside a docs page.
 *
 * The honest demonstration that the inline size is read from the
 * **container** and not the window: the browser never moves, and
 * the cap still falls from three columns to one.
 */
export const Responsive: Story = {
  args: {
    blockSizeResolver: fixedBlockSize(600),
    minColumnInlineSize: 160,
  },
  render: (gridProps) => (
    <div className="flex flex-wrap items-start gap-6">
      {[
        { inlineSize: "15rem", label: "15rem container" },
        { inlineSize: "24rem", label: "24rem container" },
        { inlineSize: "34rem", label: "34rem container" },
      ].map((panel) => (
        <div
          // `shrink-0`, or flex shrinks the widest panel back to
          // the viewport and all three grids answer the same.
          className="flex shrink-0 flex-col gap-2"
          key={panel.label}
          style={{ inlineSize: panel.inlineSize }}
        >
          <span className="font-mono text-content-muted text-xs">
            {panel.label}
          </span>

          <AdaptiveGrid {...gridProps}>
            {NINE_ITEMS.slice(0, 6).map((label) => (
              <Item key={label} label={label} />
            ))}
          </AdaptiveGrid>
        </div>
      ))}
    </div>
  ),
}

/**
 * The manual override beside the automatic answer.
 *
 * A picker that only offered numbers once a number had been chosen
 * would strand a person on a layout they tried once, so `"auto"` is
 * always in the list.
 */
export const Interactive: Story = {
  args: { blockSizeResolver: fixedBlockSize(1080) },
  render: (gridProps) => {
    const [choice, setChoice] = useState<string>("auto")

    return (
      <StorySection title="Pick a count, or hand it back to auto.">
        <SegmentedControl
          items={COLUMN_ITEMS}
          label="Columns"
          onChange={(value) => {
            setChoice(value ?? "auto")
          }}
          selectedValue={choice}
        />

        <AdaptiveGrid
          {...gridProps}
          columns={
            choice === "auto" ? undefined : Number(choice)
          }
        >
          {NINE_ITEMS.map((label) => (
            <Item key={label} label={label} />
          ))}
        </AdaptiveGrid>
      </StorySection>
    )
  },
}
