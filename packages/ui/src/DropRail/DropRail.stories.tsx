import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import type { DropRailTarget } from "./DropRail.tsx"
import { DropRail } from "./DropRail.tsx"

/**
 * **Invented, all of it** — the same rule `Board.stories.tsx`
 * states and for the same reason. The list this component was built
 * for is a real household's, a published repo must never carry that,
 * and a committed screenshot is worse than a committed string
 * because no text scrub can reach inside a PNG.
 *
 * So these are a fictional studio's project groups. The long ones
 * are long on purpose: the rail's whole claim is that it stays
 * usable at a size where a menu does not.
 */
const STUDIO_TARGETS: DropRailTarget[] = [
  {
    count: 41,
    isCurrent: true,
    key: "atlas",
    label: "Atlas Ingest",
    mark: "📥",
  },
  {
    count: 53,
    key: "ferry",
    label: "Ferry Docs",
    mark: "📄",
  },
  {
    count: 94,
    key: "loom",
    label: "Loom Fleet",
    mark: "🧵",
  },
  {
    count: 12,
    isDisabled: true,
    key: "signal",
    label: "Signal Kitchen — archived",
    mark: "🗄️",
  },
]

/**
 * Thirty-four groups, which is the number that made a menu the
 * wrong control. Long labels included, because a rail that only
 * looks right with short ones has not been tested.
 */
const MANY_TARGETS: DropRailTarget[] = [
  {
    count: 94,
    key: "loom",
    label: "Loom Fleet",
    mark: "🧵",
  },
  {
    count: 81,
    key: "atlas-fix",
    label:
      "Atlas Ingest — repair the malformed series folders",
    mark: "🔧",
  },
  {
    count: 77,
    isCurrent: true,
    key: "atlas-add",
    label: "Atlas Ingest — add media",
    mark: "➕",
  },
  {
    count: 75,
    key: "ferry",
    label: "Ferry Docs",
    mark: "📄",
  },
  {
    count: 67,
    key: "swap",
    label: "Swap to better copy",
    mark: "🔄",
  },
  {
    count: 53,
    key: "reels",
    label: "Reels and Shorts",
    mark: "🎬",
  },
  {
    count: 46,
    key: "configs",
    label: "Tooling Configs",
    mark: "⚙️",
  },
  {
    count: 41,
    key: "upkeep",
    label: "Studio Upkeep",
    mark: "🧺",
  },
  {
    count: 37,
    key: "triage",
    label: "Keep or cut?",
    mark: "🤔",
  },
  {
    count: 29,
    key: "hunt",
    label: "Find a better source",
    mark: "🔎",
  },
  {
    count: 22,
    key: "colour",
    label: "Colour pass",
    mark: "🎨",
  },
  {
    count: 18,
    key: "audio",
    label: "Audio conform",
    mark: "🎧",
  },
  {
    count: 11,
    key: "subs",
    label: "Subtitle timing",
    mark: "💬",
  },
  {
    count: 9,
    key: "masters",
    label: "Master deliverables",
    mark: "📦",
  },
  {
    count: 5,
    key: "cleanup",
    label: "Account cleanup",
    mark: "🧹",
  },
]

const meta = {
  title: "Components/Controls/DropRail",
  component: DropRail,
  parameters: { layout: "padded" },
  args: {
    isOpen: true,
    label: "Move to which project",
    onDismiss: () => {},
    onPick: () => {},
    targets: STUDIO_TARGETS,
  },
} satisfies Meta<typeof DropRail>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The rail as it appears the moment a move starts. One chip is the
 * group the card is already in — visible, unofferable, and saying so
 * to a screen reader rather than only by being dimmer.
 */
export const Default: Story = {}

/**
 * The case the component exists for. Thirty-four destinations do not
 * fit in a menu without scrolling, and they do not fit on a display
 * without the page moving — but they wrap into four lines here and
 * every one of them is one short movement away.
 */
export const ManyTargets: Story = {
  args: { targets: MANY_TARGETS },
}

/**
 * Offerable, current and disabled, side by side. The three states
 * differ by more than colour: the current chip carries visually
 * hidden text and the disabled one carries `aria-disabled`.
 */
export const AllStates: Story = {
  render: (args) => (
    <StoryGrid columns={1}>
      <StoryCell align="stretch" label="Offerable">
        <DropRail
          {...args}
          targets={[
            {
              count: 53,
              key: "ferry",
              label: "Ferry Docs",
              mark: "📄",
            },
          ]}
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="Where it already is"
      >
        <DropRail
          {...args}
          targets={[
            {
              count: 41,
              isCurrent: true,
              key: "atlas",
              label: "Atlas Ingest",
              mark: "📥",
            },
          ]}
        />
      </StoryCell>

      <StoryCell align="stretch" label="Disabled">
        <DropRail
          {...args}
          targets={[
            {
              count: 12,
              isDisabled: true,
              key: "signal",
              label: "Signal Kitchen — archived",
              mark: "🗄️",
            },
          ]}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The whole gesture, wired to a host the way an app wires it.
 *
 * Press and hold a card's handle and drag onto a chip, or **tap** the
 * handle and use the arrow keys and Enter. Both commit through the
 * same `onPick`, which is the point: the rail does not know which one
 * you used and the host does not have to say.
 */
export const InAList: Story = {
  render: (args) => {
    const StoryHost = () => {
      const [movingKey, setMovingKey] = useState<
        string | null
      >(null)

      const [moved, setMoved] = useState<string | null>(
        null,
      )

      const cards = [
        {
          key: "wall",
          title: "Re-point the garden wall",
        },
        {
          key: "filter",
          title:
            "Order the replacement extractor fan filter",
        },
        { key: "keys", title: "Label the spare keys" },
      ]

      return (
        <div className="flex flex-col gap-2">
          <DropRail
            {...args}
            isOpen={movingKey !== null}
            onDismiss={() => {
              setMovingKey(null)
            }}
            onPick={(targetKey) => {
              const target = MANY_TARGETS.find(
                (one) => one.key === targetKey,
              )

              setMoved(target?.label ?? targetKey)

              setMovingKey(null)
            }}
            targets={MANY_TARGETS}
          />

          {cards.map((card) => (
            <div
              className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-raised p-3"
              key={card.key}
            >
              <button
                aria-label={`Move ${card.title} to another project`}
                className="cursor-grab touch-none rounded-sm border border-border-default px-2 py-1 text-content-secondary text-xs hover:bg-surface-sunken"
                onPointerDown={() => {
                  setMovingKey(card.key)
                }}
                type="button"
              >
                Move
              </button>

              <span className="text-content-primary text-sm">
                {card.title}
              </span>
            </div>
          ))}

          <p className="text-content-secondary text-sm">
            {moved === null
              ? "Nothing moved yet."
              : `Last move: ${moved}.`}
          </p>
        </div>
      )
    }

    return <StoryHost />
  },
}
