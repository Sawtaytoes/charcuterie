import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { getColumnChoices } from "../AdaptiveGrid/chooseColumns.ts"
import type { BlockSizeResolver } from "../AdaptiveGrid/useAdaptiveColumns.ts"
import { Button } from "../Button/Button.tsx"
import { StorySection } from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import { Header } from "../Header/Header.tsx"
import { Main } from "../Main/Main.tsx"
import { SegmentedControl } from "../SegmentedControl/SegmentedControl.tsx"
import { Shell } from "../Shell/Shell.tsx"
import { VirtualizedGrid } from "./VirtualizedGrid.tsx"

/**
 * A fixed block size, so a story shows the rule rather than the
 * height of whichever frame Storybook happened to render it in.
 * The same seam `AdaptiveGrid`'s stories inject, and for the same
 * reason: in a real chromium `innerHeight` is a read-only accessor
 * and assigning to it is a silent no-op.
 */
const fixedBlockSize = (
  blockSize: number,
): BlockSizeResolver => ({
  get: () => blockSize,
  subscribe: () => () => {},
})

const COLUMN_ITEMS = getColumnChoices({
  maxColumns: 4,
}).map((choice) => ({
  label: String(choice),
  value: String(choice),
}))

type Bay = {
  id: string
  label: string
}

/**
 * Two thousand of them, which is the point.
 *
 * The number is not decoration: it is roughly what QueuePilot's
 * Pending page holds, and it is the size at which rendering every
 * item stops being viable. A story with twelve items would mount
 * the same component and prove nothing about it.
 */
const MANY_ITEMS: Bay[] = Array.from(
  { length: 2000 },
  (_, index) => ({
    id: `bay-${index + 1}`,
    label: `Bay ${index + 1}`,
  }),
)

const Item = ({ label }: { label: string }) => (
  <Card padding="md" surface="raised">
    <p className="font-semibold text-content-primary">
      {label}
    </p>

    {/*
     * An unbroken string with no wrap opportunity — the thing a
     * grid item's `min-content` minimum turns into a horizontal
     * scrollbar. `truncate` clips it; `[&>*]:min-w-0` on the row
     * is what lets the track get small enough for the clipping to
     * matter.
     */}
    <p className="truncate text-content-muted text-sm">
      /mnt/Bunnies/Family/Media/very/long/unbroken/path/that/would/push/a/track/wide
    </p>
  </Card>
)

const meta = {
  title: "Components/Layout/VirtualizedGrid",
  component: VirtualizedGrid<Bay>,
  parameters: { layout: "padded" },
  args: {
    blockSizeResolver: fixedBlockSize(1080),
    chromeBlockSize: 260,
    getItemKey: (item: Bay) => item.id,
    itemBlockSize: 150,
    items: MANY_ITEMS,
    label: "Bays",
    renderItem: (item: Bay) => <Item label={item.label} />,
  },
  argTypes: {
    blockSizeResolver: { control: false },
    getItemKey: { control: false },
    items: { control: false },
    renderItem: { control: false },
  },
} satisfies Meta<typeof VirtualizedGrid<Bay>>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Two thousand items, of which a few dozen exist.
 *
 * The scrollbar is sized for all 2,000 — `getTotalSize()` is the
 * full list — so the page behaves as though every item were there.
 * Inspect the DOM and count: the row elements are the ones on
 * screen plus `overscanRows` above and below.
 */
export const Default: Story = {}

/**
 * The app-shell contract: `Main` is the one vertical scroll region,
 * and the grid follows it rather than adding document height.
 *
 * This is QueuePilot's Pending shape. It is a separate story because
 * a standalone grid still follows the browser window and both paths
 * need a real consumer.
 */
export const InShellScrollRegion: Story = {
  parameters: { layout: "fullscreen" },
  render: (gridProps) => (
    <Shell contentWidth="full">
      <Header heading="Pending" />

      <Main>
        <Button onClick={() => {}}>Mark all seen</Button>
        <VirtualizedGrid {...gridProps} />
      </Main>
    </Shell>
  ),
}

/**
 * The same 2,000 items at three window heights.
 *
 * Inherited from `AdaptiveGrid` rather than reimplemented, so the
 * rule that reads backwards holds here too: a **taller** window
 * takes **fewer** columns, because height is what a column is
 * bought with. Windowing changes how many rows are mounted, never
 * how many columns are drawn.
 */
export const AllVariants: Story = {
  render: (gridProps) => (
    <StorySection title="Same items, same width — only the height changes.">
      {[
        {
          blockSize: 1440,
          label: "1440px tall",
        },
        { blockSize: 900, label: "900px tall" },
        { blockSize: 600, label: "600px tall" },
      ].map((panel) => (
        <div
          className="flex w-full flex-col gap-2"
          key={panel.label}
        >
          <span className="font-mono text-content-muted text-xs">
            {panel.label}
          </span>

          <VirtualizedGrid
            {...gridProps}
            blockSizeResolver={fixedBlockSize(
              panel.blockSize,
            )}
          />
        </div>
      ))}
    </StorySection>
  ),
}

/**
 * Empty, one item, and two thousand.
 *
 * The empty case draws a zero-height box and no rows — a windowed
 * grid must not reserve space for a list that is not there, and it
 * is the state a filter lands on. One item is one column, the same
 * answer `AdaptiveGrid` gives, and the case that would otherwise
 * stretch a lone card across an ultrawide.
 */
export const AllStates: Story = {
  render: (gridProps) => (
    <div className="flex flex-col gap-6">
      {[
        { items: [], label: "no items" },
        {
          items: MANY_ITEMS.slice(0, 1),
          label: "one item",
        },
        { items: MANY_ITEMS, label: "2,000 items" },
      ].map((panel) => (
        <div
          className="flex w-full flex-col gap-2"
          key={panel.label}
        >
          <span className="font-mono text-content-muted text-xs">
            {panel.label}
          </span>

          <VirtualizedGrid
            {...gridProps}
            items={panel.items}
          />
        </div>
      ))}
    </div>
  ),
}

/**
 * Three container widths, with the column floor dropped to 160px.
 *
 * The browser never moves and the column count still falls, which
 * is the honest demonstration that the inline size comes off a
 * `ResizeObserver` on the container rather than off the window.
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

          <VirtualizedGrid
            {...gridProps}
            items={MANY_ITEMS.slice(0, 60)}
          />
        </div>
      ))}
    </div>
  ),
}

/**
 * The manual override beside the automatic answer, on a windowed
 * list.
 *
 * Changing the count re-rows 2,000 items — the row count is
 * `ceil(items / columns)` — so this is also the case that proves
 * the virtualizer is re-measured rather than left holding
 * positions for a layout that no longer exists.
 */
export const Interactive: Story = {
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

        <VirtualizedGrid
          {...gridProps}
          columns={
            choice === "auto" ? undefined : Number(choice)
          }
        />
      </StorySection>
    )
  },
}
