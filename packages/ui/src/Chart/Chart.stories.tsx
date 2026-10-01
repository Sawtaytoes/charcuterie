import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Chart } from "./Chart.tsx"

const meta = {
  title: "Components/Data/Chart",
  component: Chart,
  args: {
    title: "Daily progress",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    series: [
      {
        id: "net",
        label: "Net points",
        values: [300, 520, -50, null, 600],
        color: "var(--color-intent-accent-solid)",
      },
    ],
  },
} satisfies Meta<typeof Chart>
export default meta
type Story = StoryObj<typeof meta>
export const Playground: Story = {
  parameters: playgroundParameters,
}
export const AllVariants: Story = {
  render: (props) => (
    <StoryGrid columns={2}>
      {(["bar", "line"] as const).map((kind) => (
        <StoryCell align="stretch" key={kind} label={kind}>
          <Chart {...props} kind={kind} />
        </StoryCell>
      ))}
    </StoryGrid>
  ),
}
export const AllStates: Story = {
  render: (props) => (
    <StoryGrid columns={2}>
      {[
        [0, 0],
        [null, null],
        [50, -50],
        [20, 20],
      ].map((values, index) => (
        <StoryCell
          align="stretch"
          key={JSON.stringify(values)}
          label={`State ${index + 1}`}
        >
          <Chart
            {...props}
            labels={["Mon", "Tue"]}
            series={[
              { id: "a", label: "Net points", values },
            ]}
          />
        </StoryCell>
      ))}
    </StoryGrid>
  ),
}
export const Responsive: Story = {
  render: (props) => (
    <ContainerBoard>
      {() => <Chart {...props} />}
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
          {isTableVisible ? "Hide values" : "Show values"}
        </Button>
        <Chart {...props} isTableVisible={isTableVisible} />
      </>
    )
  },
}
