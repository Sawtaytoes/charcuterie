import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { TableViewport } from "./TableViewport.tsx"

const comparison = (count: number) => (
  <table>
    <caption className="sr-only">
      Printer comparison
    </caption>
    <thead>
      <tr>
        {[
          "Feature",
          "Current service",
          "Provider fork",
          "Alternative",
          "Work needed",
        ].map((name) => (
          <th key={name} scope="col">
            {name}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {Array.from(
        { length: count },
        (_, index) => `Feature ${index + 1}`,
      ).map((feature) => (
        <tr key={feature}>
          <th scope="row">{feature}</th>
          <td>
            Existing integration supports prepared jobs and
            preserves the current workflow.
          </td>
          <td>
            Provider support exists. Hardware verification
            is still needed before deployment.
          </td>
          <td>
            Advertised support. Exact behavior remains
            unconfirmed.
          </td>
          <td>
            Verify compatibility, keep the existing
            controls, and test error recovery.
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)
const meta = {
  title: "Components/Data/TableViewport",
  component: TableViewport,
  args: {
    columnCount: 5,
    label: "Printer comparison",
    children: comparison(12),
  },
} satisfies Meta<typeof TableViewport>
export default meta
type Story = StoryObj<typeof meta>
export const Playground: Story = {
  parameters: playgroundParameters,
}
export const AllVariants: Story = {
  render: (props) => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="Short">
        <TableViewport {...props} label="Short comparison">
          {comparison(2)}
        </TableViewport>
      </StoryCell>
      <StoryCell align="stretch" label="Long">
        <TableViewport {...props} label="Long comparison">
          {comparison(16)}
        </TableViewport>
      </StoryCell>
    </StoryGrid>
  ),
}
export const AllStates: Story = {
  render: (props) => (
    <TableViewport {...props}>
      {comparison(0)}
    </TableViewport>
  ),
}
export const Responsive: Story = {
  render: (props) => (
    <ContainerBoard>
      {(width) => (
        <TableViewport
          {...props}
          label={`Comparison at ${width}`}
        />
      )}
    </ContainerBoard>
  ),
}
export const Interactive: Story = {}
