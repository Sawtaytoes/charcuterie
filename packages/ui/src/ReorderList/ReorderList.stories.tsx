import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { toClassName } from "../toClassName.ts"
import type { ReorderListItem } from "./ReorderList.tsx"
import { ReorderList } from "./ReorderList.tsx"

/**
 * **Invented, all of it** — the same rule `Board.stories.tsx` and
 * `DropRail.stories.tsx` state, for the same reason. The lists this
 * component was built for are a real household's, a published repo
 * must never carry that, and a committed screenshot is worse than a
 * committed string because no text scrub can reach inside a PNG.
 */
const CHECKLIST: ReorderListItem[] = [
  { key: "measure", label: "Measure the alcove" },
  { key: "cut", label: "Cut the shelf to width" },
  { key: "sand", label: "Sand the cut edge" },
  { key: "mount", label: "Mount the brackets" },
  { key: "level", label: "Check it is level" },
]

/**
 * The two buttons and the handle, drawn the way a host draws them.
 *
 * The **position is the handle**, which is not a stylistic choice: a
 * list that is ordered wants its position printed anyway, so the
 * number costs the row nothing — and this library ships no icons, so
 * a `⠿` would render as an empty box in any font that lacks it.
 */
const StoryList = ({
  initialItems = CHECKLIST,
  isSingle = false,
}: {
  initialItems?: ReorderListItem[]
  isSingle?: boolean
}) => {
  const [items, setItems] = useState(
    isSingle ? initialItems.slice(0, 1) : initialItems,
  )

  return (
    <ReorderList
      className="flex max-w-md flex-col gap-1"
      items={items}
      itemClassName="list-none"
      label="Shelf build"
      onReorder={(fromIndex, toIndex) => {
        setItems((current) => {
          const next = [...current]

          const [moved] = next.splice(fromIndex, 1)

          if (moved) {
            next.splice(toIndex, 0, moved)
          }

          return next
        })
      }}
      renderItem={({
        gripProps,
        isDragged,
        isFirst,
        isLast,
        item,
        moveBy,
        position,
      }) => (
        <div
          className={toClassName(
            "flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised p-2",
            isDragged && "opacity-50",
          )}
        >
          <button
            aria-label={`Move ${item.label} earlier`}
            className="rounded-sm px-1 text-content-secondary hover:bg-surface-sunken disabled:opacity-40"
            disabled={isFirst}
            onClick={() => {
              moveBy(-1)
            }}
            type="button"
          >
            ↑
          </button>

          <span
            className="cursor-grab select-none rounded-sm px-1 text-content-muted text-xs tabular-nums"
            {...gripProps}
          >
            {position}
          </span>

          <button
            aria-label={`Move ${item.label} later`}
            className="rounded-sm px-1 text-content-secondary hover:bg-surface-sunken disabled:opacity-40"
            disabled={isLast}
            onClick={() => {
              moveBy(1)
            }}
            type="button"
          >
            ↓
          </button>

          <span className="text-content-primary text-sm">
            {item.label}
          </span>
        </div>
      )}
    />
  )
}

const meta = {
  title: "Components/Layout/ReorderList",
  component: ReorderList,
  parameters: { layout: "padded" },
  args: {
    items: CHECKLIST,
    label: "Shelf build",
    onReorder: () => {},
    renderItem: ({ item }) => item.label,
  },
} satisfies Meta<typeof ReorderList<ReorderListItem>>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A checklist in the order it will be worked through. Press ↑ or ↓,
 * or press and hold the position and drag it somewhere else.
 */
export const Default: Story = {
  render: () => <StoryList />,
}

/**
 * **One row gets no controls at all.** A single item cannot be put
 * anywhere else, so the handle is inert and the buttons are both
 * disabled — the component says so through `gripProps` being empty,
 * rather than leaving each host to remember it. Every hand-rolled
 * copy of this shape forgot.
 */
export const SingleItem: Story = {
  render: () => <StoryList isSingle />,
}
