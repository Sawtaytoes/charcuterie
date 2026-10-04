import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import { CATEGORICAL_INDEXES } from "@charcuterie/tokens"
import type { Meta, StoryObj } from "@storybook/react"
import { categoricalArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { SettingsIcon } from "../icons.storyHelpers.tsx"
import { MetricCard } from "./MetricCard.tsx"

const meta = {
  title: "Components/Data/MetricCard",
  component: MetricCard,
  parameters: { layout: "padded" },
  argTypes: { categorical: categoricalArgType },
  args: {
    heading: "Energy",
    value: "0.35 kWh",
    categorical: 3,
    icon: <SettingsIcon />,
    children: <p>Measured during the selected period</p>,
  },
} satisfies Meta<typeof MetricCard>
export default meta
type Story = StoryObj<typeof meta>
export const Playground: Story = {
  parameters: playgroundParameters,
}
export const AllVariants: Story = {
  render: () => (
    <StoryGrid columns={2}>
      {CATEGORICAL_INDEXES.map((categorical) => (
        <StoryCell
          align="stretch"
          label={`Category ${categorical}`}
          key={categorical}
        >
          <MetricCard
            heading={`Category ${categorical}`}
            value="123.45"
            categorical={categorical}
            icon={<SettingsIcon />}
          />
        </StoryCell>
      ))}
    </StoryGrid>
  ),
}
export const AllStates: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="Zero is a value">
        <MetricCard
          heading="Recorded total"
          value="0"
          categorical={6}
        />
      </StoryCell>
      <StoryCell
        align="stretch"
        label="Unavailable is app-owned"
      >
        <MetricCard
          heading="Energy"
          value="Unavailable"
          categorical={10}
        >
          <p>No meter is connected.</p>
        </MetricCard>
      </StoryCell>
      <StoryCell align="stretch" label="Neutral, no icon">
        <MetricCard heading="Print time" value="14.5 h" />
      </StoryCell>
    </StoryGrid>
  ),
}
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      {(width) => (
        <MetricCard
          heading={`Recorded cost at ${width}`}
          value="$1,234.56"
          categorical={9}
          icon={<SettingsIcon />}
        >
          <p>
            Includes the recorded filament and energy costs.
          </p>
        </MetricCard>
      )}
    </ContainerBoard>
  ),
}
export const Interactive: Story = {
  args: {
    footer: (
      <Button appearance="outline">Inspect records</Button>
    ),
  },
}
