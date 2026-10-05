import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { ContainerBoard } from "../board.storyHelpers.tsx"
import { TableColumns } from "./TableColumns.tsx"

const meta = {
  title: "Components/Data/TableColumns",
  component: TableColumns,
  args: {
    columns: [
      {
        key: "name",
        label: "Name",
        isVisible: true,
        isRequired: true,
      },
      {
        key: "duration",
        label: "Duration",
        isVisible: true,
      },
      { key: "median", label: "Median", isVisible: false },
    ],
    onChange: () => {},
  },
} satisfies Meta<typeof TableColumns>
export default meta
type Story = StoryObj<typeof meta>
const Controlled = (
  props: React.ComponentProps<typeof TableColumns>,
) => {
  const [columns, setColumns] = useState([...props.columns])
  return (
    <>
      <TableColumns
        {...props}
        columns={columns}
        onChange={setColumns}
      />
      <p>
        {columns
          .filter((column) => column.isVisible)
          .map((column) => column.label)
          .join(", ")}
      </p>
    </>
  )
}
export const Playground: Story = {
  parameters: playgroundParameters,
  render: (props) => <Controlled {...props} />,
}
export const AllVariants: Story = {
  render: (props) => (
    <Controlled {...props} label="Choose columns" />
  ),
}
export const AllStates: Story = {
  args: {
    columns: [
      {
        key: "name",
        label: "Name",
        isVisible: true,
        isRequired: true,
      },
    ],
  },
  render: (props) => <Controlled {...props} />,
}
export const Responsive: Story = {
  render: (props) => (
    <ContainerBoard>
      {() => <Controlled {...props} />}
    </ContainerBoard>
  ),
}
export const Interactive: Story = {
  render: (props) => <Controlled {...props} />,
}
