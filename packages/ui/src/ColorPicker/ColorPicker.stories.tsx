import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"
import { userEvent, within } from "storybook/test"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Field } from "../Field/Field.tsx"
import type { ColorPreset } from "./ColorPicker.tsx"
import { ColorPicker } from "./ColorPicker.tsx"
import { parseHexColor } from "./parseHexColor.ts"

/**
 * A palette with several shades of one hue on purpose: the case that
 * made this a searchable list is a family where every child wants a
 * different pink.
 */
const PRESETS: ColorPreset[] = [
  { name: "Red", value: "#E63946" },
  {
    keywords: ["pink", "red"],
    name: "Raspberry",
    value: "#DB2777",
  },
  {
    keywords: ["pink"],
    name: "Hot Pink",
    value: "#FF006E",
  },
  { keywords: ["pink"], name: "Blush", value: "#FB7185" },
  {
    keywords: ["pink"],
    name: "Bubblegum",
    value: "#FF69B4",
  },
  {
    keywords: ["pink"],
    name: "Cotton Candy",
    value: "#F9A8D4",
  },
  {
    keywords: ["purple"],
    name: "Lavender",
    value: "#A78BFA",
  },
  { name: "Purple", value: "#8338EC" },
  { name: "Blue", value: "#3A86FF" },
  {
    keywords: ["green", "blue"],
    name: "Teal",
    value: "#2A9D8F",
  },
  { name: "Green", value: "#22C55E" },
  { name: "Yellow", value: "#FFBE0B" },
  { name: "Orange", value: "#FB5607" },
  { name: "Brown", value: "#B5651D" },
]

/**
 * A stand-in for an app's own rule. This one refuses grays and
 * near-whites, the way a reader board that draws the color on a dark
 * panel would.
 */
const getStoryColorError = (hex: string): null | string => {
  const digits = (parseHexColor(hex) ?? "").slice(1)
  const channels = [0, 2, 4].map(
    (start) =>
      Number.parseInt(digits.slice(start, start + 2), 16) /
      255,
  )
  const highest = Math.max(...channels)
  const lowest = Math.min(...channels)

  if (highest - lowest < 0.2) {
    return "Pick a color with more hue. Gray, white, and black do not show on the board."
  }

  return null
}

const meta = {
  title: "Components/Controls/ColorPicker",
  component: ColorPicker,
  parameters: { layout: "padded" },
  argTypes: {
    size: controlSizeArgType,
  },
  args: {
    isCustomAllowed: true,
    label: "Color",
    onChange: () => {},
    presets: PRESETS,
  },
} satisfies Meta<typeof ColorPicker>

export default meta

type Story = StoryObj<typeof meta>

const ColorPickerHarness = ({
  hasColorRule = false,
  initialValue,
  isCustomAllowed = true,
  label,
}: {
  hasColorRule?: boolean
  initialValue?: string
  isCustomAllowed?: boolean
  label: string
}): ReactNode => {
  const [value, setValue] = useState(initialValue)

  return (
    <div className="flex flex-col gap-2">
      <ColorPicker
        getColorError={
          hasColorRule ? getStoryColorError : undefined
        }
        isCustomAllowed={isCustomAllowed}
        label={label}
        onChange={setValue}
        presets={PRESETS}
        value={value}
      />
      <p className="text-content-muted text-xs">
        Value: {value ?? "none"}
      </p>
    </div>
  )
}

/** A preset chosen, custom colors allowed, and an app rule. */
export const Playground: Story = {
  parameters: playgroundParameters,
  render: () => (
    <ColorPickerHarness
      hasColorRule
      initialValue="#FF006E"
      label="Color"
    />
  ),
}

/** The three sizes, each reading a density-aware control height. */
export const AllVariants: Story = {
  render: () => (
    <StorySection title="Sizes">
      <StoryRow>
        {(["sm", "md", "lg"] as const).map((size) => (
          <ColorPicker
            key={size}
            label={`Color ${size}`}
            onChange={() => {}}
            presets={PRESETS}
            size={size}
            value="#3A86FF"
          />
        ))}
      </StoryRow>
    </StorySection>
  ),
}

/**
 * A preset, a custom color (the trigger reads the code), nothing chosen
 * yet, presets only, and disabled.
 */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <StorySection title="A preset">
        <StoryRow>
          <ColorPickerHarness
            initialValue="#FF69B4"
            label="Preset color"
          />
        </StoryRow>
      </StorySection>

      <StorySection title="A custom color reads its code">
        <StoryRow>
          <ColorPickerHarness
            initialValue="#C2185B"
            label="Custom color"
          />
        </StoryRow>
      </StorySection>

      <StorySection title="Nothing chosen">
        <StoryRow>
          <ColorPickerHarness label="Empty color" />
        </StoryRow>
      </StorySection>

      <StorySection title="Presets only">
        <StoryRow>
          <ColorPickerHarness
            initialValue="#22C55E"
            isCustomAllowed={false}
            label="Presets-only color"
          />
        </StoryRow>
      </StorySection>

      <StorySection title="Disabled">
        <StoryRow>
          <ColorPicker
            isDisabled
            label="Disabled color"
            onChange={() => {}}
            presets={PRESETS}
            value="#8338EC"
          />
        </StoryRow>
      </StorySection>
    </div>
  ),
}

/**
 * The custom panel, opened: the browser's color wheel beside a hex
 * field, and an app rule refusing a gray.
 */
export const CustomPanel: Story = {
  render: () => (
    <ColorPickerHarness
      hasColorRule
      initialValue="#808080"
      label="Rule color"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole("button", {
        name: "Rule color: #808080",
      }),
    )

    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole(
        "option",
        { name: "Custom color…" },
      ),
    )
  },
}

/**
 * Drive it: open, type "pink" to narrow the list, choose one, then
 * choose "Custom color…" and apply a code of your own.
 */
export const Interactive: Story = {
  render: () => (
    <ColorPickerHarness
      hasColorRule
      initialValue="#3A86FF"
      label="Interactive color"
    />
  ),
}

/**
 * Inside a `Field` the trigger stretches to the container, and a long
 * name truncates rather than pushing the chevron out.
 */
export const Responsive: Story = {
  render: () => (
    <ContainerBoard>
      {(width) => (
        <Field label={`Color at ${width}`}>
          <ColorPicker
            isCustomAllowed
            label={`Color at ${width}`}
            onChange={() => {}}
            presets={PRESETS}
            value="#F9A8D4"
          />
        </Field>
      )}
    </ContainerBoard>
  ),
}
