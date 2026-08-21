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

const meta = {
  title: "Components/Layout/Card",
  component: Card,
  parameters: { layout: "padded" },
  argTypes: {
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
