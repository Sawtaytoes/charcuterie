import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { intentArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { ProgressCard } from "./ProgressCard.tsx"

const metrics = [
  { label: "Speed", value: "17.2 MB/s" },
  { label: "Remaining", value: "9m" },
  { label: "Finishes", value: "4:44 AM" },
]

const meta = {
  title: "Components/Feedback/ProgressCard",
  component: ProgressCard,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    progressIntent: intentArgType,
  },
  args: {
    "aria-label": "Archive transfer",
    header: "Archive transfer",
    layout: "band",
    metrics,
    progressLabel: "Transfer progress",
    status: "Transferring",
    value: 82.5,
    valueText: "82.5%",
  },
} satisfies Meta<typeof ProgressCard>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: playgroundParameters,
}

export const AllVariants: Story = {
  render: (props) => (
    <StoryGrid columns={2}>
      {(["band", "hierarchy"] as const).map((layout) => (
        <StoryCell
          align="stretch"
          key={layout}
          label={layout}
        >
          <ProgressCard
            {...props}
            aria-label={`Transfer ${layout}`}
            layout={layout}
          />
        </StoryCell>
      ))}
    </StoryGrid>
  ),
}

export const AllStates: Story = {
  render: (props) => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="Preparing">
        <ProgressCard
          {...props}
          aria-label="Preparing transfer"
          isIndeterminate
          isValueEmphasized={false}
          metrics={[]}
          status={undefined}
          valueText="Preparing"
        />
      </StoryCell>
      <StoryCell align="stretch" label="Warning">
        <ProgressCard
          {...props}
          aria-label="Transfer warning"
          intent="warning"
          progressIntent="warning"
          status="Needs attention"
        >
          <p className="mt-2 text-intent-warning-content text-sm">
            The source stopped responding.
          </p>
        </ProgressCard>
      </StoryCell>
      <StoryCell align="stretch" label="Failed">
        <ProgressCard
          {...props}
          aria-label="Failed transfer"
          intent="danger"
          isValueEmphasized={false}
          metrics={[]}
          progressIntent="danger"
          status={undefined}
          valueText="Failed"
        />
      </StoryCell>
      <StoryCell align="stretch" label="Complete">
        <ProgressCard
          {...props}
          aria-label="Complete transfer"
          isValueEmphasized={false}
          metrics={[]}
          progressIntent="success"
          status={undefined}
          value={100}
          valueText="Complete"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

export const Responsive: Story = {
  render: (props) => (
    <ContainerBoard>
      {(width) => (
        <ProgressCard
          {...props}
          aria-label={`Transfer at ${width}`}
          header="ARCHIVE_TRANSFER_WITH_A_VERY_LONG_UNBROKEN_NAME"
          media={
            <span className="rounded-md bg-surface-sunken p-2">
              07
            </span>
          }
          actions={
            <Button
              appearance="outline"
              intent="danger"
              size="sm"
            >
              Cancel
            </Button>
          }
        />
      )}
    </ContainerBoard>
  ),
}

const ControlledProgressCard = () => {
  const [isCanceled, setIsCanceled] = useState(false)
  return (
    <ProgressCard
      aria-label="Cancelable transfer"
      header="Archive transfer"
      actions={
        <Button
          appearance="outline"
          intent="danger"
          isDisabled={isCanceled}
          onClick={() => setIsCanceled(true)}
        >
          Cancel
        </Button>
      }
      isValueEmphasized={!isCanceled}
      metrics={isCanceled ? [] : metrics}
      progressLabel="Transfer progress"
      status={isCanceled ? undefined : "Transferring"}
      value={82.5}
      valueText={isCanceled ? "Canceled" : "82.5%"}
    />
  )
}

export const Interactive: Story = {
  render: () => <ControlledProgressCard />,
}
