import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  InboxIcon,
  PlayIcon,
  SearchIcon,
} from "../icons.storyHelpers.tsx"
import type { RadioItem } from "./RadioGroup.tsx"
import { RadioGroup } from "./RadioGroup.tsx"

/**
 * Options carrying a real sentence each — the case an in-line
 * `SegmentedControl` strip would wrap, and the reason to stack.
 */
const NAMING_ITEMS: RadioItem[] = [
  { label: "Match the Plex agent", value: "plex" },
  { label: "Match AniDB titles", value: "anidb" },
  {
    label: "Keep the original filenames",
    value: "original",
  },
  { label: "Use a custom pattern", value: "custom" },
]

/**
 * The same control with a name and a line of help per option — the
 * shape four apps in the fleet had each hand-painted, and the reason
 * none of them reached for this component.
 */
const IMPORT_ITEMS: RadioItem[] = [
  {
    hint: "Nothing is left behind at the source.",
    label: "Move the files",
    value: "move",
  },
  {
    hint: "Twice the space, and the source is untouched.",
    label: "Copy the files",
    value: "copy",
  },
  {
    hint: "One copy on disk, two names for it. Same volume only.",
    label: "Hard link",
    value: "link",
  },
  {
    hint: "Catalogue them where they are.",
    label: "Leave in place",
    value: "leave",
  },
]

const ICON_ITEMS: RadioItem[] = [
  {
    hint: "Everything that arrived since the last run.",
    icon: <InboxIcon />,
    label: "New arrivals",
    value: "new",
  },
  {
    hint: "Whatever the saved query matches today.",
    icon: <SearchIcon />,
    label: "Saved search",
    value: "search",
  },
  {
    hint: "Pick up where the last session stopped.",
    icon: <PlayIcon />,
    label: "Continue",
    value: "continue",
  },
]

const meta = {
  title: "Components/Controls/RadioGroup",
  component: RadioGroup,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: {
    isReadOnly: false,
    itemShape: "row",
    minTileInlineSize: 200,
    size: "md",
  },
} satisfies Meta<typeof RadioGroup>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { items: NAMING_ITEMS, label: "Naming scheme" },
}

export const AllVariants: Story = {
  args: { items: NAMING_ITEMS, label: "Naming scheme" },
  render: (controlProps) => (
    <StorySection title="Three control heights, all reading the density axis rather than hardcoding a length.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={size}>
            <RadioGroup
              {...controlProps}
              label={`Naming scheme at ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * `itemShape="tile"` is the same `radiogroup` in a box: one choice
 * out of several, exclusive, announced as "3 of 6", drawn as cards
 * in a grid that gains columns with its **container**.
 *
 * The selected tile is an accent **edge** and a lifted surface, not
 * a fill — the radio dot inside it is still the thing a screen
 * reader reads, and a state told in colour alone is the one state a
 * monochrome ePaper build cannot show.
 */
export const Tiles: Story = {
  args: {
    items: IMPORT_ITEMS,
    itemShape: "tile",
    label: "On import",
  },
}

/**
 * The tile at all three sizes.
 *
 * `AllVariants` above covers the three heights of a **row**, and
 * every tile story took the default `md` — so the largest tile had
 * no snapshot at all, and `TILE_PADDING_CLASS.lg` could be changed
 * without a single pixel moving in the report. It was, on
 * 2026-09-02, when `lg` grew to a landing-page tile's padding.
 *
 * The padding is shared with `ActionTiles` through `tileStyles.ts`,
 * which is the promise this board is here to photograph.
 */
export const TileSizes: Story = {
  args: {
    items: IMPORT_ITEMS,
    itemShape: "tile",
    label: "On import",
  },
  render: (controlProps) => (
    <StorySection title="One box at three sizes, and the same box ActionTiles reads from.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell
            align="stretch"
            key={size}
            label={size}
          >
            <RadioGroup
              {...controlProps}
              label={`On import at ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * A tile may lead with an icon. The library ships none — these are
 * story-only SVGs, exactly what an app passes — and the icon is
 * `aria-hidden` by construction, because the name it sits above is
 * in the same button.
 */
export const TilesWithIcons: Story = {
  args: {
    items: ICON_ITEMS,
    itemShape: "tile",
    label: "Where to start",
  },
}

const STATE_ITEMS: RadioItem[] = [
  { label: "Match the Plex agent", value: "plex" },
  { label: "Match AniDB titles", value: "anidb" },
  {
    isDisabled: true,
    label: "Keep the original filenames",
    value: "original",
  },
  { label: "Use a custom pattern", value: "custom" },
]

/**
 * A disabled option is out of the *focus* group and still one of the
 * *options* — it can even be the one a consumer names as the initial
 * `selectedValue`, which is what a saved preference pointing at a
 * scheme the source no longer supports looks like.
 */
export const AllStates: Story = {
  args: { items: STATE_ITEMS, label: "Naming scheme" },
  render: (controlProps) => (
    <StorySection title="What varies is which option is checked and which are reachable.">
      <StoryGrid columns={2}>
        <StoryCell label="first option checked">
          <RadioGroup
            {...controlProps}
            label="Naming scheme starting on Plex"
          />
        </StoryCell>

        <StoryCell label="starts on the fourth option">
          <RadioGroup
            {...controlProps}
            label="Naming scheme starting on custom"
            selectedValue="custom"
          />
        </StoryCell>

        <StoryCell label="a disabled option">
          <RadioGroup
            {...controlProps}
            label="Naming scheme with original unavailable"
          />
        </StoryCell>

        <StoryCell label="two options">
          <RadioGroup
            {...controlProps}
            items={[
              { label: "Move the files", value: "move" },
              { label: "Copy the files", value: "copy" },
            ]}
            label="On import"
          />
        </StoryCell>

        <StoryCell label="read-only">
          <RadioGroup
            {...controlProps}
            isReadOnly
            items={NAMING_ITEMS}
            label="Naming scheme, read-only"
            selectedValue="anidb"
          />
        </StoryCell>

        <StoryCell align="stretch" label="a hint on a row">
          <RadioGroup
            {...controlProps}
            items={IMPORT_ITEMS}
            label="On import, as rows"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="tiles, third chosen"
        >
          <RadioGroup
            {...controlProps}
            items={IMPORT_ITEMS}
            itemShape="tile"
            label="On import, as tiles"
            selectedValue="link"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="tiles, read-only and disabled"
        >
          <RadioGroup
            {...controlProps}
            isReadOnly
            items={[
              ...IMPORT_ITEMS.slice(0, 2),
              {
                hint: "The source volume is read-only.",
                isDisabled: true,
                label: "Hard link",
                value: "link",
              },
            ]}
            itemShape="tile"
            label="On import, read-only tiles"
            selectedValue="copy"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Column count comes from the **container**, never the window — the
 * standing rule for any list of cards, and the reason this board
 * varies a wrapper's width rather than the viewport's.
 *
 * At the 200px default floor: one track at 15rem, one at 24rem, two
 * at 34rem. `auto-fill` and deliberately not `auto-fit`, so the
 * tiles keep their size in a container with room to spare instead of
 * stretching to fill it.
 */
export const Responsive: Story = {
  args: {
    items: IMPORT_ITEMS,
    itemShape: "tile",
    label: "On import",
  },
  render: (controlProps) => (
    <ContainerBoard>
      {(width) => (
        <RadioGroup
          {...controlProps}
          label={`On import at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path. Tab enters the group **once** — the
 * roving-tabindex rule — then the arrow keys move and check
 * together, the same activation model as `SegmentedControl`.
 */
export const Interactive: Story = {
  args: { items: NAMING_ITEMS, label: "Naming scheme" },
}
