import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import { ContainerBoard } from "../board.storyHelpers.tsx"
import { WeekdayIndicator } from "./WeekdayIndicator.tsx"

const meta = {
  title: "Components/Data/WeekdayIndicator",
  component: WeekdayIndicator,
  args: { days: [0, 1, 2, 3], label: "Repeats" },
  argTypes: {
    categorical: {
      control: "select",
      options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
  },
} satisfies Meta<typeof WeekdayIndicator>
export default meta
type Story = StoryObj<typeof meta>
export const Playground: Story = {
  parameters: playgroundParameters,
}
export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {([1, 3, 5, 7, 9] as const).map((categorical) => (
        <WeekdayIndicator
          {...args}
          categorical={categorical}
          key={categorical}
        />
      ))}
    </div>
  ),
}
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <WeekdayIndicator days={[]} />
      <WeekdayIndicator days={[0, 1, 2, 3, 4, 5, 6]} />
      <WeekdayIndicator days={[5, 6]} />
    </div>
  ),
}
export const Responsive: Story = {
  render: (args) => (
    <ContainerBoard>
      <WeekdayIndicator {...args} />
    </ContainerBoard>
  ),
}
export const Interactive: Story = {
  render: () => {
    const [isWeekend, setIsWeekend] = useState(false)
    return (
      <div className="flex flex-col items-start gap-3">
        <Button
          onClick={() => {
            setIsWeekend(!isWeekend)
          }}
        >
          Switch pattern
        </Button>
        <WeekdayIndicator
          days={isWeekend ? [5, 6] : [0, 1, 2, 3, 4]}
        />
      </div>
    )
  },
}
