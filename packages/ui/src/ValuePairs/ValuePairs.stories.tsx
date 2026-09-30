import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"

import { ValuePairs } from "./ValuePairs.tsx"

const meta = {
  title: "Components/Data/ValuePairs",
  component: ValuePairs,
  parameters: { layout: "padded" },
  args: {
    label: "Payout",
    items: [
      { id: "short", label: "30 min", value: "100 pts" },
      { id: "long", label: "60 min", value: "250 pts" },
    ],
  },
} satisfies Meta<typeof ValuePairs>
export default meta
type Story = StoryObj<typeof meta>
export const Playground: Story = {
  parameters: playgroundParameters,
}
export const Single: Story = {
  args: {
    items: [
      { id: "scan", label: "Per scan", value: "50 pts" },
    ],
  },
}
export const Narrow: Story = {
  render: (props) => (
    <div style={{ width: 220 }}>
      <ValuePairs {...props} />
    </div>
  ),
  args: {
    items: [
      { id: "a", label: "15 min", value: "10 pts" },
      { id: "b", label: "30 min", value: "25 pts" },
      { id: "c", label: "60 min", value: "60 pts" },
      { id: "d", label: "90 min", value: "100 pts" },
    ],
  },
}
