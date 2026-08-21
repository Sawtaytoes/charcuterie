import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import type { Step } from "./Stepper.tsx"
import { Stepper } from "./Stepper.tsx"

const RIP: Step[] = [
  {
    description: "3 of 3 discs read",
    key: "rip",
    label: "Rip",
    status: "done",
  },
  {
    description: "2 of 5 titles tagged",
    key: "tag",
    label: "Tag",
    status: "current",
  },
  {
    description: "Opens when Tag is finished",
    key: "file",
    label: "File",
    status: "upcoming",
  },
]

const meta = {
  title: "Components/Data/Stepper",
  component: Stepper,
  parameters: { layout: "padded" },
  args: {
    headingLevel: 3,
    label: "Ingest sequence",
    orientation: "vertical",
    steps: RIP,
  },
} satisfies Meta<typeof Stepper>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The marker is the ordinal and never a tick — this library ships
 * no icons and no symbol glyphs, and a `✓` the font lacks renders
 * as an empty box in the one position where an empty box reads as
 * an error.
 */
export const Default: Story = {}

export const AllVariants: Story = {
  render: (stepperProps) => (
    <StorySection title="Four statuses, two orientations, and the case the component exists for: steps that CARRY something.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="vertical">
          <Stepper {...stepperProps} />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="orientation=horizontal"
        >
          <Stepper
            {...stepperProps}
            label="Ingest sequence, across"
            orientation="horizontal"
          />
        </StoryCell>

        <StoryCell align="stretch" label="status=blocked">
          {/* Blocked is not a worse `upcoming`. Its turn HAS come
              and something is in the way — a thing to go and fix
              rather than a thing to wait for. */}
          <Stepper
            {...stepperProps}
            label="A sequence held up"
            steps={[
              { key: "a", label: "Rip", status: "done" },
              {
                description:
                  "Waiting on Rip, which has no titles yet — add one, or delete the step",
                key: "b",
                label: "Tag",
                status: "blocked",
              },
              {
                key: "c",
                label: "File",
                status: "upcoming",
              },
            ]}
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="steps that carry content"
        >
          <Stepper
            {...stepperProps}
            label="A sequence with its work under it"
            steps={[
              {
                content: (
                  <Card>Read the disc into an ISO</Card>
                ),
                key: "a",
                label: "Rip",
                status: "done",
              },
              {
                content: <Card>Match each title</Card>,
                key: "b",
                label: "Tag",
                status: "current",
              },
            ]}
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  render: (stepperProps) => (
    <StorySection title="Every status beside every other, so the four are legible as a set rather than one at a time.">
      <Stepper
        {...stepperProps}
        label="Every status"
        steps={[
          { key: "a", label: "Done", status: "done" },
          {
            key: "b",
            label: "In progress",
            status: "current",
          },
          { key: "c", label: "Blocked", status: "blocked" },
          {
            key: "d",
            label: "Not started",
            status: "upcoming",
          },
        ]}
      />
    </StorySection>
  ),
}

/**
 * `horizontal` is a REQUEST. Below `cq-md` it falls back to the
 * column, because four steps side by side in a narrow container
 * squash into `2. / De- / dupe` — measured, in the app this
 * component came out of.
 */
export const Responsive: Story = {
  args: { orientation: "horizontal" },
  render: (stepperProps) => (
    <ContainerBoard>
      <Stepper {...stepperProps} />
    </ContainerBoard>
  ),
}

/**
 * The whole keyboard path, which is the point of the headings: a
 * stepper is a document outline, not a widget. There is nothing to
 * focus and nothing to arrow between — advancing is the app's
 * operation, and the component only reports where the sequence got
 * to.
 */
export const Interactive: Story = {
  render: (stepperProps) => {
    const [reached, setReached] = useState(1)

    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button
            isDisabled={reached === 0}
            onClick={() => {
              setReached((was) => was - 1)
            }}
            type="button"
          >
            Back
          </Button>
          <Button
            intent="accent"
            isDisabled={reached === RIP.length}
            onClick={() => {
              setReached((was) => was + 1)
            }}
            type="button"
          >
            Advance
          </Button>
        </div>

        <Stepper
          {...stepperProps}
          steps={RIP.map((step, index) => ({
            ...step,
            description: undefined,
            status:
              index < reached
                ? ("done" as const)
                : index === reached
                  ? ("current" as const)
                  : ("upcoming" as const),
          }))}
        />
      </div>
    )
  },
}
