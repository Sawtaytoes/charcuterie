import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  ImageIcon,
  InboxIcon,
  PlayIcon,
  SearchIcon,
  SettingsIcon,
} from "../icons.storyHelpers.tsx"
import { RadioGroup } from "../RadioGroup/RadioGroup.tsx"
import type { ActionTileItem } from "./ActionTiles.tsx"
import { ActionTiles } from "./ActionTiles.tsx"

/**
 * The shape this component was built for: a first step that opens
 * the next step. Nothing stays selected, because nothing was chosen
 * — the page moved on.
 */
const QUEUE_TYPE_ITEMS: ActionTileItem[] = [
  {
    hint: "Choose titles yourself, then arrange them in priority and random lanes.",
    label: "Picks",
    value: "picks",
  },
  {
    hint: "Set eligibility filters and let the app select matching titles.",
    label: "Rules",
    value: "rules",
  },
]

/** A tile may lead with an icon. The library ships none. */
const START_ITEMS: ActionTileItem[] = [
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

/**
 * Enough tiles to see the palette walk. Ten hues, taken in order,
 * and not one colour prop between them.
 */
const LIBRARY_ITEMS: ActionTileItem[] = [
  {
    hint: "Feature films.",
    icon: <PlayIcon />,
    label: "Movies",
    value: "movies",
  },
  {
    hint: "Episodic television.",
    icon: <InboxIcon />,
    label: "Shows",
    value: "shows",
  },
  {
    hint: "Albums and tracks.",
    icon: <SearchIcon />,
    label: "Music",
    value: "music",
  },
  {
    hint: "Scanned pages by series.",
    icon: <ImageIcon />,
    label: "Comics",
    value: "comics",
  },
  {
    hint: "Cores and ROMs.",
    icon: <SettingsIcon />,
    label: "Games",
    value: "games",
  },
]

/**
 * A tile that carries an `href` is a real `<a href>`, so
 * middle-click, ctrl-click and "copy link address" all work. The
 * same set may mix links and buttons.
 */
const TOOL_ITEMS: ActionTileItem[] = [
  {
    hint: "Read a container's tracks and say what would change.",
    href: "/tools/inspect",
    label: "Inspect",
    value: "inspect",
  },
  {
    hint: "Rewrite the container without touching a stream.",
    href: "/tools/remux",
    label: "Remux",
    value: "remux",
  },
  {
    hint: "The reference, on the upstream site.",
    href: "https://example.com/docs",
    isExternal: true,
    label: "Read the docs",
    value: "docs",
  },
]

const meta = {
  title: "Components/Actions/ActionTiles",
  component: ActionTiles,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: {
    accent: "auto",
    minTileInlineSize: 200,
    size: "md",
  },
} satisfies Meta<typeof ActionTiles>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { items: QUEUE_TYPE_ITEMS, label: "Queue type" },
}

export const AllVariants: Story = {
  args: { items: QUEUE_TYPE_ITEMS, label: "Queue type" },
  render: (controlProps) => (
    <StorySection title="Three sizes, all reading the density axis rather than hardcoding a length — the same three a RadioGroup tile has, from the same tokens.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell
            align="stretch"
            key={size}
            label={size}
          >
            <ActionTiles
              {...controlProps}
              label={`Queue type at ${size}`}
              minTileInlineSize={160}
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
 * inside the same tile.
 */
export const WithIcons: Story = {
  args: { items: START_ITEMS, label: "Where to start" },
}

/**
 * `href` makes the tile an anchor rather than a button, routed
 * through the injected `RouterLink` when the destination is the
 * router's. An `isExternal` tile falls back to a plain `<a
 * target="_blank">` and says so to a screen reader.
 */
export const Links: Story = {
  args: { items: TOOL_ITEMS, label: "Pick a tool" },
}

export const AllStates: Story = {
  args: { items: QUEUE_TYPE_ITEMS, label: "Queue type" },
  render: (controlProps) => (
    <StorySection title="What varies is what a tile does and whether it can be pressed. Nothing here is 'selected' — that state belongs to RadioGroup itemShape='tile'.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="two actions">
          <ActionTiles
            {...controlProps}
            label="Queue type"
          />
        </StoryCell>

        <StoryCell align="stretch" label="no hint">
          <ActionTiles
            {...controlProps}
            items={[
              { label: "Picks", value: "picks" },
              { label: "Rules", value: "rules" },
            ]}
            label="Queue type, names only"
          />
        </StoryCell>

        <StoryCell align="stretch" label="a disabled tile">
          <ActionTiles
            {...controlProps}
            items={[
              QUEUE_TYPE_ITEMS[0] as ActionTileItem,
              {
                hint: "No provider is configured to filter on.",
                isDisabled: true,
                label: "Rules",
                value: "rules",
              },
            ]}
            label="Queue type with Rules unavailable"
          />
        </StoryCell>

        <StoryCell align="stretch" label="a disabled link">
          <ActionTiles
            {...controlProps}
            items={[
              {
                hint: "Read a container's tracks and say what would change.",
                href: "/tools/inspect",
                label: "Inspect",
                value: "inspect",
              },
              {
                hint: "Nothing is loaded to remux yet.",
                href: "/tools/remux",
                isDisabled: true,
                label: "Remux",
                value: "remux",
              },
            ]}
            label="Pick a tool with Remux unavailable"
          />
        </StoryCell>

        <StoryCell align="stretch" label="links">
          <ActionTiles
            {...controlProps}
            items={TOOL_ITEMS}
            label="Pick a tool"
          />
        </StoryCell>

        <StoryCell align="stretch" label="icons">
          <ActionTiles
            {...controlProps}
            items={START_ITEMS}
            label="Where to start"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The two tile components, side by side, which is the comparison a
 * reader choosing between them actually needs.
 *
 * The box is the **same box** — `tileStyles.ts` holds the padding,
 * the border, the radius, the surface, the type ramp and the grid,
 * and both components read it. What differs is everything the box is
 * not: one announces "1 of 2" and keeps a tile selected, the other
 * presses and is done.
 */
export const BesideTheRadioTile: Story = {
  args: { items: QUEUE_TYPE_ITEMS, label: "Queue type" },
  render: (controlProps) => (
    <StorySection title="One box, two controls. The neutral action tile matches the resting radio tile on every side; the coloured one differs only on the leading edge, by the room its bar takes.">
      <StoryGrid columns={3}>
        <StoryCell
          align="stretch"
          label="ActionTiles — presses and is done"
        >
          <ActionTiles {...controlProps} />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="ActionTiles accent='none' — the same box exactly"
        >
          <ActionTiles
            {...controlProps}
            accent="none"
            label="Queue type, uncoloured"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="RadioGroup itemShape='tile' — holds a value"
        >
          <RadioGroup
            itemShape="tile"
            items={QUEUE_TYPE_ITEMS.map(
              ({ hint, label, value }) => ({
                hint,
                label,
                value,
              }),
            )}
            label="Queue type, as radios"
            size={controlProps.size}
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
 * stretching to fill it. Same formula as the `RadioGroup` tile, from
 * the same constant.
 */
export const Responsive: Story = {
  args: { items: START_ITEMS, label: "Where to start" },
  render: (controlProps) => (
    <ContainerBoard>
      {(width) => (
        <ActionTiles
          {...controlProps}
          label={`Where to start at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * The complete keyboard path, and it is the platform's: Tab reaches
 * **each** tile, Enter and Space press a button one, Enter follows a
 * link one. There is no roving tabindex here — a radio group borrows
 * one tab stop because exactly one of its options is true at a time,
 * and nothing here is true.
 */
export const Interactive: Story = {
  args: { items: QUEUE_TYPE_ITEMS, label: "Queue type" },
}

/**
 * The default: the set walks the ten-hue categorical palette in
 * order, so ten tiles get ten colours and the call site passes no
 * colour at all.
 *
 * The bar is `Card`'s accent-edge pseudo-element, which is why a
 * tile and a card on one page are the same bar rather than two that
 * nearly match, and why it follows the tile's corner instead of
 * running past it and stopping square.
 */
export const AutoHues: Story = {
  args: { items: LIBRARY_ITEMS, label: "Pick a library" },
}

/**
 * A tile that names its own `categorical` keeps that hue, and the
 * rest go on walking the palette from their own positions — so
 * naming one does not force naming all of them.
 *
 * Worth doing when the colour belongs to the THING rather than to
 * the list: a destination that is hue 7 everywhere else in the app
 * should not become hue 2 because a tile was inserted above it.
 */
export const NamedHues: Story = {
  args: {
    items: [
      { ...(LIBRARY_ITEMS[0] as ActionTileItem) },
      {
        ...(LIBRARY_ITEMS[1] as ActionTileItem),
        categorical: 7,
      },
      { ...(LIBRARY_ITEMS[2] as ActionTileItem) },
    ],
    label: "Pick a library, with Shows pinned to hue 7",
  },
}

/**
 * `accent="none"` is the paint this component shipped with, kept as
 * an opt-out rather than deleted.
 *
 * Reach for it when the tiles sit inside something already carrying
 * a colour of its own — a coloured panel, a lane header — where a
 * second palette is noise rather than information. Everything else
 * about the tile is unchanged.
 */
export const Neutral: Story = {
  args: {
    accent: "none",
    items: START_ITEMS,
    label: "Where to start",
  },
}
