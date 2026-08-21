import type { Meta, StoryObj } from "@storybook/react"

import { Badge } from "../Badge/Badge.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { MediaTile } from "./MediaTile.tsx"

/**
 * An inline SVG rather than a fixture file or a placeholder service:
 * it decodes synchronously, needs no network, and makes the
 * `loaded` state deterministic in CI — which matters because the
 * *cached* path is one of the three states this component exists to
 * get right.
 */
const toPosterSrc = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="#3E38C4"/><text x="100" y="150" fill="#FFFFFF" font-family="sans-serif" font-size="18" text-anchor="middle">${label}</text></svg>`,
  )}`

/** 404s, which is what makes the error state real rather than mocked. */
const MISSING_SRC = "/charcuterie-missing-poster.png"

const meta = {
  title: "Components/Data/MediaTile",
  component: MediaTile,
  parameters: { layout: "padded" },
  args: { aspectRatio: "poster" },
} satisfies Meta<typeof MediaTile>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    alt: "Blade Runner (1982) poster",
    src: toPosterSrc("Blade Runner"),
    subtitle: "1982 · 4K remaster",
    title: "Blade Runner",
  },
}

export const AllVariants: Story = {
  args: { alt: "Poster", title: "Blade Runner" },
  render: () => (
    <StorySection title="Three trims. 2:3 is the poster standard — Plex, Kavita, and every physical sleeve in the collection.">
      <StoryGrid columns={3}>
        <StoryCell align="stretch" label="poster (2:3)">
          <MediaTile
            alt="Blade Runner (1982) poster"
            src={toPosterSrc("2:3")}
            subtitle="1982"
            title="Blade Runner"
          />
        </StoryCell>

        <StoryCell align="stretch" label="square">
          <MediaTile
            alt="Kind of Blue album art"
            aspectRatio="square"
            src={toPosterSrc("1:1")}
            subtitle="Miles Davis"
            title="Kind of Blue"
          />
        </StoryCell>

        <StoryCell align="stretch" label="video (16:9)">
          <MediaTile
            alt="Episode thumbnail"
            aspectRatio="video"
            src={toPosterSrc("16:9")}
            subtitle="S01E04"
            title="The Constant"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The three states are the component, and no hand-rolled version in
 * the fleet models more than one of them.
 */
export const AllStates: Story = {
  args: { alt: "Poster", title: "Blade Runner" },
  render: () => (
    <StoryGrid columns={4}>
      <StoryCell align="stretch" label="loaded">
        <MediaTile
          alt="Blade Runner (1982) poster"
          src={toPosterSrc("Blade Runner")}
          subtitle="1982 · 4K remaster"
          title="Blade Runner"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="loading — skeleton holds the box"
      >
        <MediaTile
          alt="Poster loading"
          subtitle="waiting for the image"
          title="Still loading"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="error — box and name survive"
      >
        <MediaTile
          alt="Dune (2021) poster"
          src={MISSING_SRC}
          subtitle="2021"
          title="Dune"
        />
      </StoryCell>

      <StoryCell align="stretch" label="link + badge">
        <MediaTile
          alt="Blade Runner (1982) poster"
          badge={
            <Badge intent="success" size="sm">
              4K
            </Badge>
          }
          href="#blade-runner"
          src={toPosterSrc("Blade Runner")}
          subtitle="1982 · 4K remaster"
          title="Blade Runner"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The caption's type steps up past `--cq-sm`, so a tile in a dense
 * 8-across grid and the same tile in a 3-across one are legible at
 * both — the intermediate widths where the fleet's poster grids look
 * wrong today.
 */
export const Responsive: Story = {
  args: { alt: "Poster", title: "Blade Runner" },
  render: () => (
    <ContainerBoard>
      <MediaTile
        alt="Blade Runner (1982) poster"
        src={toPosterSrc("Blade Runner")}
        subtitle="1982 · 4K remaster"
        title="Blade Runner"
      />
    </ContainerBoard>
  ),
}

export const Grid: Story = {
  args: { alt: "Poster", title: "Blade Runner" },
  render: () => (
    // Two elements, not one: the container and the grid that queries
    // it **must** be different, because a container query matches
    // descendants only. Collapsed into one `<div>` this compiles,
    // generates real CSS, and silently stays two columns — which on a
    // desktop is four 700px posters.
    <div className="@container">
      <div className="grid grid-cols-2 gap-4 cq-sm:grid-cols-3 cq-md:grid-cols-4 cq-lg:grid-cols-6">
        {[
          "Blade Runner",
          "Dune",
          "Arrival",
          "Solaris",
          "Stalker",
          "Annihilation",
        ].map((title, index) => (
          <MediaTile
            alt={`${title} poster`}
            href={`#${title.toLowerCase().replace(" ", "-")}`}
            key={title}
            src={
              index === 1 ? MISSING_SRC : toPosterSrc(title)
            }
            subtitle="Science fiction"
            title={title}
          />
        ))}
      </div>
    </div>
  ),
}

/**
 * The linked tile's contract: the accessible name is exactly the
 * title — not the title plus the subtitle plus the alt text — and
 * Tab reaches it. `getByRole("link", { name: "Blade Runner" })` is
 * what an agent will actually write.
 */
export const Interactive: Story = {
  args: {
    alt: "Blade Runner (1982) poster",
    href: "#blade-runner",
    src: toPosterSrc("Blade Runner"),
    subtitle: "1982 · 4K remaster",
    title: "Blade Runner",
  },
}

/**
 * Same chrome as the link — pointer, hover fade, focus ring —
 * as a button. Wrapping the tile in a bare `<button>` is how a
 * Collection thumbnail ended up with a text cursor.
 */
export const InteractiveButton: Story = {
  args: {
    alt: "Change cover for Blade Runner",
    onClick: () => undefined,
    src: toPosterSrc("Blade Runner"),
    title: "",
  },
}
