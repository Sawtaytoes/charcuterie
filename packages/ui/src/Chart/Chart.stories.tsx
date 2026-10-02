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
    const [isUpdated, setIsUpdated] = useState(false)
    return (
      <>
        <Button onClick={() => setIsUpdated(!isUpdated)}>
          Update values
        </Button>
        <Button
          onClick={() => setIsTableVisible(!isTableVisible)}
        >
          {isTableVisible ? "Hide values" : "Show values"}
        </Button>
        <Chart
          {...props}
          series={props.series.map((entry) => ({
            ...entry,
            values: entry.values.map((value) =>
              value === null
                ? null
                : value + (isUpdated ? 100 : 0),
            ),
          }))}
          isTableVisible={isTableVisible}
        />
      </>
    )
  },
}

export const StackedDaily: Story = {
  args: {
    barLayout: "stacked",
    series: [
      {
        id: "tasks",
        label: "Tasks",
        values: [200, 280, 180, 260, 300],
        color: "var(--color-intent-accent-solid)",
      },
      {
        id: "bonuses",
        label: "Bonuses",
        values: [10, 20, 0, 10, 0],
        color: "var(--color-intent-success-solid)",
      },
      {
        id: "penalties",
        label: "Penalties",
        values: [0, -50, -50, 0, 0],
        color: "var(--color-intent-danger-solid)",
      },
      {
        id: "reversals",
        label: "Reversals",
        values: [0, -10, 0, 0, 0],
        color: "var(--color-content-muted)",
      },
    ],
  },
}
export const PortableFallback: Story = {
  args: { renderer: "portable" },
}
