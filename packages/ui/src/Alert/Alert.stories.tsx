import type { Meta, StoryObj } from "@storybook/react"

import {
  intentArgType,
  toStoryChoice,
} from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Alert } from "./Alert.tsx"

const INTENTS = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const

const meta = {
  title: "Components/Feedback/Alert",
  component: Alert,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    size: toStoryChoice(["sm", "md"] as const),
  },
  // The component's own defaults, restated — Storybook does not seed
  // `args` from docgen, so an unstated default shows in the props
  // table with nothing selected in its control.
  args: {
    intent: "neutral",
    size: "md",
  },
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

/**
 * rip-deck's grouped tower alert, verbatim: one trouble, the bays it
 * touches, and whether the house speakers already said it out loud.
 */
export const Default: Story = {
  args: {
    description: "4 bays · 3, 4, 5, 6 · confirmed",
    heading:
      "Four bays stalled at once — check the USB hub's power",
    intent: "danger",
  },
}

export const AllVariants: Story = {
  args: { heading: "The disc may need cleaning" },
  render: (alertProps) => (
    <StorySection title="Six intents. rip-deck declares this map twice, in two files, with hardcoded hexes and no light mode.">
      <StoryGrid columns={3}>
        {INTENTS.map((intent) => (
          <StoryCell
            align="stretch"
            key={intent}
            label={intent}
          >
            <Alert
              {...alertProps}
              heading={`intent: ${intent}`}
              intent={intent}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Every part is optional except the sentence, and `size="sm"` is the
 * in-card form — rip-deck's verdict chip, which sits under a bay's
 * progress bar rather than at the top of the page.
 */
export const AllStates: Story = {
  args: { heading: "The disc may need cleaning" },
  render: (alertProps) => (
    <StorySection title="An alert is static: no hover, no focus, no disabled. What varies is which parts are present.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="heading only">
          <Alert {...alertProps} intent="warning" />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="heading + description"
        >
          <Alert
            {...alertProps}
            description="Bay 4 · suspected"
            intent="warning"
          />
        </StoryCell>

        <StoryCell align="stretch" label="with evidence">
          <Alert
            {...alertProps}
            details={[
              "3 read errors in 40 s",
              "throughput 1.2x against a 6.0x baseline",
            ]}
            intent="warning"
          />
        </StoryCell>

        <StoryCell align="stretch" label="with an action">
          <Alert
            {...alertProps}
            actions={
              <Button size="sm" appearance="outline">
                Open trays
              </Button>
            }
            description="2 discs · slots 4, 7"
            heading="There are still discs in the tower"
            intent="info"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label='size="sm" — the in-card verdict'
        >
          <Alert
            {...alertProps}
            details={["seen on bays 3 and 7"]}
            heading="Part of the tower-wide problem above."
            intent="danger"
            size="sm"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="label ⇒ a named landmark"
        >
          <Alert
            {...alertProps}
            heading="The USB bus is flapping"
            intent="danger"
            label="USB connection alert"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The `@container` claim: actions sit beside the sentence when there
 * is room and drop under it when there is not — and the width that
 * decides is the **panel's**, not the window's. A banner in a
 * sidebar and the same banner full-bleed is exactly the pair a media
 * query cannot tell apart.
 */
export const Responsive: Story = {
  args: {
    description: "2 discs · slots 4, 7",
    heading: "There are still discs in the tower",
    intent: "info",
  },
  render: (alertProps) => (
    <ContainerBoard>
      {(width) => (
        <Alert
          {...alertProps}
          actions={
            <Button size="sm" appearance="outline">
              Open trays
            </Button>
          }
          label={`Discs still in the tower at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}

/**
 * An alert is not interactive, so what there is to drive is what it
 * *contains*. The action is an ordinary `Button` and stays reachable
 * by role and name from inside the landmark — which is the whole
 * reason `label` exists.
 */
export const Interactive: Story = {
  args: {
    details: [
      "3 read errors in 40 s",
      "throughput 1.2x against a 6.0x baseline",
    ],
    heading:
      "Bay 7 is reading with errors — clean the disc",
    intent: "warning",
    label: "Bay 7 verdict",
  },
  render: (alertProps) => (
    <Alert
      {...alertProps}
      actions={
        <Button size="sm" appearance="outline">
          Retry in another bay
        </Button>
      }
    />
  ),
}
