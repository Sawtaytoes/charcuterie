import type { Meta, StoryObj } from "@storybook/react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { IconButton } from "../IconButton/IconButton.tsx"
import { SettingsIcon } from "../icons.storyHelpers.tsx"
import { ProgressBar } from "../ProgressBar/ProgressBar.tsx"
import { Card, ELEVATION_CLASS } from "./Card.tsx"
import { ACCENT_EDGE_CATEGORICAL_CLASS } from "./cardAccentEdge.ts"

const meta = {
  title: "Components/Layout/Card",
  component: Card,
  parameters: { layout: "padded" },
  argTypes: {
    // An object union, so an object control is the right one — but
    // it is stated rather than inferred, because docgen's fallback
    // for a type it cannot read is also an object control and the
    // two are indistinguishable in the panel.
    accentEdge: { control: "object" },
    elevation: toStoryChoice(
      Object.keys(
        ELEVATION_CLASS,
      ) as (keyof typeof ELEVATION_CLASS)[],
    ),
  },
  args: {
    elevation: "low",
    headingLevel: 2,
    padding: "md",
    surface: "raised",
  },
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <p className="text-content-secondary text-sm">
        Ripping <em>Blade Runner (1982)</em> — title 4 of 9.
      </p>
    ),
    heading: "Bay 3",
  },
}

export const AllVariants: Story = {
  args: { children: "Content" },
  render: () => (
    <StorySection title="Three surfaces x four elevations. `raised` means more separated from base, not lighter — which is why light mode's base is #F5F7FA and its raised is white.">
      <StoryGrid columns={3}>
        {(["base", "raised", "sunken"] as const).flatMap(
          (surface) =>
            (
              ["none", "low", "medium", "high"] as const
            ).map((elevation) => (
              <StoryCell
                align="stretch"
                key={`${surface}-${elevation}`}
                label={`${surface} · ${elevation}`}
              >
                <Card
                  elevation={elevation}
                  // Distinct, because two `<section>`s sharing an
                  // accessible name is an axe `landmark-unique`
                  // violation — a real one: a screen-reader user
                  // navigating by landmark gets two "raised"
                  // regions and no way to tell them apart.
                  heading={`${surface} · ${elevation}`}
                  surface={surface}
                >
                  <p className="text-content-secondary text-sm">
                    shadow-{elevation}
                  </p>
                </Card>
              </StoryCell>
            )),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: { children: "Content" },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="heading only">
        <Card heading="Bay 1" />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="no heading — not a landmark, by design"
      >
        <Card>
          <p className="text-content-secondary text-sm">
            A card with no name cannot be a region, so it is
            not pretending to be one.
          </p>
        </Card>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="heading + actions + footer"
      >
        <Card
          actions={
            <>
              <Badge intent="info" size="sm">
                ripping
              </Badge>

              <IconButton
                appearance="ghost"
                label="Bay 3 settings"
                size="sm"
              >
                <SettingsIcon />
              </IconButton>
            </>
          }
          footer="Started 14:02 · MakeMKV 1.17.8"
          heading="Bay 2"
        >
          <ProgressBar
            isValueShown
            label="Ripping title 4 of 9"
            value={47}
          />
        </Card>
      </StoryCell>

      <StoryCell
        align="stretch"
        label="padding=none — for a poster grid"
      >
        <Card heading="Recently added" padding="none">
          <div className="h-16 rounded-md bg-surface-sunken" />
        </Card>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The header stacks below `--cq-sm` and sits on one row above it —
 * and the container is the *card*, not the window, which is the case
 * a media query genuinely cannot express: the same card in a sidebar
 * and full-bleed on a dashboard.
 */
export const Responsive: Story = {
  args: { children: "Content" },
  render: () => (
    <ContainerBoard>
      {(width) => (
        <Card
          actions={
            <Button appearance="soft" size="sm">
              Start rip
            </Button>
          }
          heading={`Bay 3 at ${width} — Blade Runner (1982)`}
        >
          <ProgressBar
            label={`Ripping title 4 of 9 at ${width}`}
            value={47}
          />
        </Card>
      )}
    </ContainerBoard>
  ),
}

/**
 * Two identical "Start rip" buttons on one page.
 *
 * Unscoped, `getByRole("button", { name: "Start rip" })` is
 * ambiguous — which is exactly what `expectAgentDrivable` refuses.
 * Scoping by region is the fix, and it only exists because the cards
 * are named. That is the whole a11y argument for this component: an
 * agent driving a 16-bay tower can say *which* "Start" it means.
 */
export const Interactive: Story = {
  args: { children: "Content" },
  render: () => (
    <div className="flex flex-col gap-3">
      {[3, 4].map((bay) => (
        <Card
          actions={<Button size="sm">Start rip</Button>}
          heading={`Bay ${bay}`}
          key={bay}
        >
          <ProgressBar
            label={`Bay ${bay} progress`}
            value={bay * 10}
          />
        </Card>
      ))}
    </div>
  ),
}

/**
 * The leading edge, and the two answers the fleet has for what
 * colour it is.
 *
 * A **categorical index** is a colour a user picked — Docket's
 * project colours come from this ten-wide family, and every pair in
 * it is contrast-audited. An explicit **colour** is one the app
 * computed: Folio hashes a repo's name so a repo added tomorrow
 * already has a hue and nobody maintains a palette, which is 360
 * answers rather than ten.
 *
 * Both bars follow the card's own corner, because the treatment
 * inherits its radius instead of naming one. Every app that grew
 * this shape by hand drew it as a straight border beside a rounded
 * box, and a border cannot follow a curve.
 */
export const AccentEdge: Story = {
  args: { children: "Content" },
  render: () => (
    <StorySection title="A categorical index, and an app's own colour. Both take the card's radius.">
      <StoryGrid columns={3}>
        {(
          Object.keys(
            ACCENT_EDGE_CATEGORICAL_CLASS,
          ) as unknown as (keyof typeof ACCENT_EDGE_CATEGORICAL_CLASS)[]
        ).map((index) => (
          <StoryCell
            align="stretch"
            key={index}
            label={`categorical ${index}`}
          >
            <Card
              accentEdge={{
                categorical: Number(index) as 1,
              }}
              heading={`Project ${index}`}
            >
              <p className="text-content-secondary text-sm">
                A colour the user picked.
              </p>
            </Card>
          </StoryCell>
        ))}

        <StoryCell align="stretch" label="a hashed hue">
          <Card
            accentEdge={{ color: "hsl(287 55% 52%)" }}
            heading="home-assistant"
          >
            <p className="text-content-secondary text-sm">
              A hue hashed from the name, not an index.
            </p>
          </Card>
        </StoryCell>

        <StoryCell
          align="stretch"
          label="a rounder card, same rule"
        >
          <Card
            accentEdge={{ color: "hsl(24 55% 52%)" }}
            className="rounded-3xl"
            heading="A wider radius"
          >
            <p className="text-content-secondary text-sm">
              The bar reads the radius off the card rather
              than naming one, so an override still lines
              up.
            </p>
          </Card>
        </StoryCell>

        <StoryCell align="stretch" label="a link inside it">
          <Card
            accentEdge={{ categorical: 4 }}
            heading="Still clickable"
          >
            <Button size="sm">Open</Button>
          </Card>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}
