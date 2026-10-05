import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import { ContainerBoard } from "../board.storyHelpers.tsx"
import { ComparisonChart } from "./ComparisonChart.tsx"

const meta = {
  title: "Components/Data/ComparisonChart",
  component: ComparisonChart,
  args: {
    title: "Activity comparison",
    labels: [
      "Practice",
      "Matching values",
      "Long activity title that remains readable in a narrow container",
    ],
    series: [
      {
        id: "a",
        label: "Alex",
        color: "var(--color-intent-accent-solid)",
        values: [6, 4, 0],
      },
      {
        id: "b",
        label: "Blair",
        color: "var(--color-intent-success-solid)",
        values: [2, 4, null],
      },
    ],
  },
} satisfies Meta<typeof ComparisonChart>
export default meta
type Story = StoryObj<typeof meta>
export const Playground: Story = {
  parameters: playgroundParameters,
}
export const AllVariants: Story = {
  render: (props) => (
    <div className="space-y-6">
      <ComparisonChart {...props} layout="nested" />
      <ComparisonChart {...props} layout="grouped" />
    </div>
  ),
}
export const AllStates: Story = {
  args: {
    labels: ["Empty", "Zero"],
    series: [
      {
        id: "a",
        label: "Alex",
        color: "var(--color-intent-accent-solid)",
        values: [null, 0],
      },
    ],
  },
}
export const Responsive: Story = {
  render: (props) => (
    <ContainerBoard>
      {() => <ComparisonChart {...props} />}
    </ContainerBoard>
  ),
}
export const Interactive: Story = {
  render: (props) => {
    const [isTableVisible, setIsTableVisible] =
      useState(false)
    return (
      <>
        <Button
          onClick={() => setIsTableVisible(!isTableVisible)}
        >
          Show values
        </Button>
        <ComparisonChart
          {...props}
          isTableVisible={isTableVisible}
        />
      </>
    )
  },
}
