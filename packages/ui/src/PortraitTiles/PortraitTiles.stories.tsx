import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import type { PortraitTileItem } from "./PortraitTiles.tsx"
import { PortraitTiles } from "./PortraitTiles.tsx"

/**
 * The shape this was taken from: points-market's "Who's shopping?".
 *
 * Placeholder names on purpose. A component library's fixtures are
 * read by everyone who opens Storybook and are the one place a
 * household's real names would leak into a published repo — which
 * the fleet has a standing rule about, and which a PNG in a pull
 * request makes ungreppable afterwards.
 */
const SHOPPER_ITEMS: PortraitTileItem[] = [
  {
    hint: "points",
    initials: "A",
    label: "Avery",
    stat: "1,240",
    value: "avery",
  },
  {
    hint: "points",
    initials: "B",
    label: "Bailey",
    stat: "860",
    value: "bailey",
  },
  {
    hint: "points",
    initials: "C",
    label: "Casey",
    stat: "2,015",
    value: "casey",
  },
  {
    hint: "points",
    initials: "D",
    label: "Devon",
    stat: "430",
    value: "devon",
  },
]

/**
 * A set whose subjects persist, so each one owns its hue rather than
 * borrowing the one its position happened to give it.
 *
 * This is the arrangement any real household picker wants: add a
 * fifth member and the first four keep their colours.
 */
const PINNED_ITEMS: PortraitTileItem[] = [
  {
    ...(SHOPPER_ITEMS[0] as PortraitTileItem),
    categorical: 3,
  },
  {
    ...(SHOPPER_ITEMS[1] as PortraitTileItem),
    categorical: 8,
  },
  {
    ...(SHOPPER_ITEMS[2] as PortraitTileItem),
    categorical: 5,
  },
]

/** No number at all — a picker that is only ever "who are you". */
const NAME_ONLY_ITEMS: PortraitTileItem[] =
  SHOPPER_ITEMS.map(({ initials, label, value }) => ({
    initials,
    label,
    value,
  }))

const meta = {
  title: "Components/Actions/PortraitTiles",
  component: PortraitTiles,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: {
    layout: "auto",
    minTileInlineSize: 200,
    size: "md",
  },
} satisfies Meta<typeof PortraitTiles>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: SHOPPER_ITEMS,
    label: "Who's shopping?",
  },
}

/**
 * The two forms, side by side, forced rather than queried — so the
 * difference is visible without resizing anything.
 *
 * `auto` picks between them off the SET's width, which is why the
 * board below this one is the story that actually documents the
 * behaviour.
 */
export const AllVariants: Story = {
  args: {
    items: SHOPPER_ITEMS,
    label: "Who's shopping?",
  },
  render: (controlProps) => (
    <StorySection title="A row while the set is narrow, a column once it has room. Both are the same component and the same tokens; only the arrangement changes.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="row">
          <PortraitTiles
            {...controlProps}
            label="Who's shopping, as rows"
            layout="row"
            minTileInlineSize={260}
          />
        </StoryCell>

        <StoryCell align="stretch" label="column">
          <PortraitTiles
            {...controlProps}
            label="Who's shopping, as columns"
            layout="column"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Three sizes, each moving the face and the number together. The
 * type ramp does the rest on its own: `text-2xl` is 30px at
 * `comfortable` and 38px at `kiosk`, which is where points-market's
 * wall-mounted picker gets its size from without a single override.
 */
export const AllSizes: Story = {
  args: {
    items: SHOPPER_ITEMS.slice(0, 2),
    label: "Who's shopping?",
  },
  render: (controlProps) => (
    <StorySection title="One size axis, and it moves the picture, the name and the number together.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell
            align="stretch"
            key={size}
            label={size}
          >
            <PortraitTiles
              {...controlProps}
              label={`Who's shopping at ${size}`}
              layout="column"
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * `layout="auto"` reads the **container**, never the window.
 *
 * At 15rem the set is one narrow column and each portrait is a row —
 * a face beside a name, which is what fits. Past `cq-sm` (24rem) it
 * has room to stack, and every portrait becomes the tall column
 * points-market shows on its kiosk.
 *
 * Every panel here is the same window, which is the whole point: a
 * picker in a 320px sidebar on a 2560px monitor gets the row form,
 * and a media query would have given it the column.
 */
export const Responsive: Story = {
  args: {
    items: SHOPPER_ITEMS.slice(0, 3),
    label: "Who's shopping?",
  },
  render: (controlProps) => (
    <ContainerBoard>
      {(width) => (
        <PortraitTiles
          {...controlProps}
          label={`Who's shopping at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * A picture instead of initials. It is `alt=""` on purpose — the
 * name is beside it inside the same tile, so an alt here is the name
 * announced twice.
 *
 * The broken source is not a mistake in this story. It is the case
 * the component handles: a 404 falls back to the initials rather
 * than leaving a torn hole where a face was, next to three that
 * loaded.
 */
export const WithPictures: Story = {
  args: {
    items: [
      {
        ...(SHOPPER_ITEMS[0] as PortraitTileItem),
        imageSrc:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="%23c9d3e0"/><circle cx="80" cy="62" r="28" fill="%238b9bb4"/><path d="M20 160c0-33 27-52 60-52s60 19 60 52Z" fill="%238b9bb4"/></svg>',
          ),
      },
      {
        ...(SHOPPER_ITEMS[1] as ShopperItem),
        // The same URL `Avatar`'s fallback story points at, and
        // that is not a coincidence: `smokeStorybook.ts` keeps a
        // short allowlist of resources that are MEANT to 404, so a
        // real missing chunk still fails the run. A new spelling of
        // "this file is absent" is an unlisted 404 and fails the
        // storybook gate — which is exactly what it did here.
        imageSrc: "/charcuterie-missing-portrait.png",
      },
      SHOPPER_ITEMS[2] as PortraitTileItem,
    ],
    label: "Who's shopping?",
  },
}

/**
 * A hue named per subject rather than taken from the position.
 *
 * The default is positional because it costs a call site nothing. It
 * is also the wrong default for a household: adding a fifth member
 * re-colours the first four, and their colour was the thing the
 * picker was being read by.
 */
export const NamedHues: Story = {
  args: {
    items: PINNED_ITEMS,
    label: "Who's shopping, with pinned colours",
  },
}

export const AllStates: Story = {
  args: {
    items: SHOPPER_ITEMS,
    label: "Who's shopping?",
  },
  render: (controlProps) => (
    <StorySection title="What varies is what a portrait carries and whether it can be pressed.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="name and number">
          <PortraitTiles
            {...controlProps}
            items={SHOPPER_ITEMS.slice(0, 2)}
            label="Who's shopping?"
          />
        </StoryCell>

        <StoryCell align="stretch" label="name only">
          <PortraitTiles
            {...controlProps}
            items={NAME_ONLY_ITEMS.slice(0, 2)}
            label="Who's here?"
          />
        </StoryCell>

        <StoryCell align="stretch" label="links">
          <PortraitTiles
            {...controlProps}
            items={SHOPPER_ITEMS.slice(0, 2).map(
              (item) => ({
                ...item,
                href: `/${item.value}`,
              }),
            )}
            label="Who's shopping, as links"
          />
        </StoryCell>

        <StoryCell align="stretch" label="one unavailable">
          <PortraitTiles
            {...controlProps}
            items={[
              SHOPPER_ITEMS[0] as PortraitTileItem,
              {
                ...(SHOPPER_ITEMS[1] as PortraitTileItem),
                isDisabled: true,
              },
            ]}
            label="Who's shopping, with Bailey unavailable"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The keyboard path is the platform's, the same as `ActionTiles`:
 * Tab reaches each portrait, Enter and Space press a button one,
 * Enter follows a link one. Nothing stays selected, because nothing
 * was chosen — the page moved on.
 */
export const Interactive: Story = {
  args: {
    items: SHOPPER_ITEMS.slice(0, 2),
    label: "Who's shopping?",
  },
}
