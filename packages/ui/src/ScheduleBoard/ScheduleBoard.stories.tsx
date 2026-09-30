import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { ContainerBoard } from "../board.storyHelpers.tsx"
import { Dialog } from "../Dialog/Dialog.tsx"
import { ScheduleBoard } from "./ScheduleBoard.tsx"

const meta = {
  title: "Components/Data/ScheduleBoard",
  component: ScheduleBoard,
  parameters: { layout: "padded" },
  args: {
    label: "Studio schedule",
    days: [
      {
        key: "mon",
        label: "Mon",
        dateLabel: "6 Apr",
        isCurrent: true,
      },
      { key: "tue", label: "Tue", dateLabel: "7 Apr" },
      { key: "wed", label: "Wed", dateLabel: "8 Apr" },
    ],
    bands: [
      {
        key: "morning",
        label: "Morning",
        detail: "Before noon",
        startMinute: 0,
        endMinute: 720,
      },
      {
        key: "afternoon",
        label: "Afternoon",
        detail: "Noon–4p",
        startMinute: 720,
        endMinute: 960,
      },
      {
        key: "evening",
        label: "Evening",
        detail: "After 4p",
        startMinute: 960,
        endMinute: 1440,
      },
    ],
    items: [
      {
        key: "mix",
        dayKey: "mon",
        title: "Mixing session",
        timeLabel: "9a–11a",
        sourceLabel: "Studio A",
        sourceMarker: "A",
        startMinute: 540,
        endMinute: 660,
        categorical: 1,
      },
      {
        key: "review",
        dayKey: "mon",
        title: "Client review",
        timeLabel: "10a–12p",
        sourceLabel: "Studio B",
        sourceMarker: "B",
        startMinute: 600,
        endMinute: 720,
        categorical: 3,
      },
      {
        key: "delivery",
        dayKey: "tue",
        title: "Microphone delivery",
        timeLabel: "All day",
        sourceLabel: "Studio A",
        startMinute: null,
        endMinute: null,
        categorical: 1,
      },
      {
        key: "record",
        dayKey: "tue",
        title:
          "Location recording and equipment preparation",
        timeLabel: "2p–4p",
        sourceLabel: "Studio B",
        startMinute: 840,
        endMinute: 960,
        categorical: 3,
      },
    ],
    layout: "bands",
  },
} satisfies Meta<typeof ScheduleBoard>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: playgroundParameters,
  render: (args) => (
    <div style={{ inlineSize: "56rem" }}>
      <ScheduleBoard {...args} />
    </div>
  ),
}
export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-8">
      {(["bands", "hours", "cards"] as const).map(
        (layout) => (
          <ScheduleBoard
            {...args}
            key={layout}
            label={`Schedule ${layout}`}
            layout={layout}
          />
        ),
      )}
    </div>
  ),
}
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-8">
      <ScheduleBoard
        {...args}
        items={[]}
        label="Empty schedule"
      />
      <ScheduleBoard
        {...args}
        label="Unknown schedule"
        days={args.days.map((day) => ({
          ...day,
          emptyLabel: "Not read yet",
        }))}
        items={[]}
        layout="cards"
      />
    </div>
  ),
}
export const Responsive: Story = {
  render: (args) => (
    <ContainerBoard>
      {(width) => (
        <ScheduleBoard
          {...args}
          label={`Schedule at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}
export const Interactive: Story = {
  render: (args) => {
    const [selected, setSelected] = useState<string | null>(
      null,
    )
    const item = args.items.find(
      (entry) => entry.key === selected,
    )
    return (
      <>
        <ScheduleBoard {...args} onSelect={setSelected} />
        <Dialog
          heading={item?.title ?? "Event"}
          isVisible={selected !== null}
          onClose={() => {
            setSelected(null)
          }}
        >
          {item?.timeLabel} · {item?.sourceLabel}
        </Dialog>
      </>
    )
  },
}
export const HourGrid: Story = {
  args: { layout: "hours" },
  render: (args) => (
    <div style={{ inlineSize: "56rem" }}>
      <ScheduleBoard {...args} />
    </div>
  ),
}
