import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import { SearchInput } from "./SearchInput.tsx"

const ClearIcon = () => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
    <path
      d="m6 6 12 12M18 6 6 18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
)

const ControlledSearch = ({
  size = "md",
}: {
  size?: "md" | "lg"
}) => {
  const [value, setValue] = useState("filter paper")

  return (
    <Field label="Search inventory">
      <SearchInput
        clearIcon={<ClearIcon />}
        onChange={(event) => setValue(event.target.value)}
        onClear={() => setValue("")}
        placeholder="Name or location…"
        size={size}
        value={value}
      />
    </Field>
  )
}

const meta = {
  title: "Components/Controls/SearchInput",
  component: SearchInput,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  args: {
    clearIcon: <ClearIcon />,
    onClear: () => undefined,
    placeholder: "Name or location…",
    readOnly: true,
    size: "md",
    value: "filter paper",
  },
} satisfies Meta<typeof SearchInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <ControlledSearch />,
}

export const AllVariants: Story = {
  render: () => (
    <StorySection title="The field and its clear button share one density-aware control size.">
      <StoryGrid columns={3}>
        {(["md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={size}>
            <ControlledSearch size={size} />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="empty">
        <SearchInput
          aria-label="Empty search"
          clearIcon={<ClearIcon />}
          onClear={() => undefined}
          value=""
        />
      </StoryCell>
      <StoryCell label="filled">
        <SearchInput
          aria-label="Filled search"
          clearIcon={<ClearIcon />}
          onClear={() => undefined}
          readOnly
          value="filter paper"
        />
      </StoryCell>
      <StoryCell label="disabled">
        <SearchInput
          aria-label="Disabled search"
          clearIcon={<ClearIcon />}
          disabled
          onClear={() => undefined}
          readOnly
          value="filter paper"
        />
      </StoryCell>
      <StoryCell label="invalid">
        <SearchInput
          aria-label="Invalid search"
          aria-invalid="true"
          clearIcon={<ClearIcon />}
          onClear={() => undefined}
          readOnly
          value="filter paper"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      <ControlledSearch />
    </ContainerBoard>
  ),
}

export const Interactive: Story = {
  render: () => <ControlledSearch />,
}
