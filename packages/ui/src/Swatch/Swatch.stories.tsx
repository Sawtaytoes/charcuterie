import type { Meta, StoryObj } from "@storybook/react"

import {
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import { Swatch } from "./Swatch.tsx"

/**
 * Colours that are **data**, not tokens — the whole reason the
 * component exists. These stand in for stickers on a controller, and
 * a design system re-theming them would be re-theming the hardware.
 */
const STICKERS = [
  { color: "#E5484D", label: "Red" },
  { color: "#3B82F6", label: "Blue" },
  { color: "#35D07F", label: "Green" },
  { color: "#F5C518", label: "Yellow" },
] as const

const meta = {
  title: "Components/Swatch",
  component: Swatch,
  parameters: { layout: "padded" },
  argTypes: { color: { control: "color" } },
  args: {
    appearance: "solid",
    color: "#E5484D",
    isLabelVisible: true,
    label: "Red",
    size: "md",
  },
} satisfies Meta<typeof Swatch>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A named graphic — `getByRole("img", { name: "Red" })` resolves,
 * because a colour a screen reader cannot see needs a name it can
 * read.
 */
export const Default: Story = {}

/**
 * `solid` fills; `outline` keeps the hue and drops the fill. The
 * second is the one state a status colour cannot borrow from
 * `intent` — "this thing is present but inactive" — which is what a
 * powered-off controller looks like beside its live siblings.
 */
export const AllVariants: Story = {
  render: (swatchProps) => (
    <StorySection title="`outline` is the same colour with the fill taken away — for a subject that is there but not active.">
      <StoryGrid columns={2}>
        <StoryCell label="solid">
          <StoryRow>
            {STICKERS.map((sticker) => (
              <Swatch
                {...swatchProps}
                appearance="solid"
                color={sticker.color}
                isLabelVisible={false}
                key={sticker.label}
                label={sticker.label}
              />
            ))}
          </StoryRow>
        </StoryCell>

        <StoryCell label="outline">
          <StoryRow>
            {STICKERS.map((sticker) => (
              <Swatch
                {...swatchProps}
                appearance="outline"
                color={sticker.color}
                isLabelVisible={false}
                key={sticker.label}
                label={sticker.label}
              />
            ))}
          </StoryRow>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  render: (swatchProps) => (
    <StoryGrid columns={2}>
      <StoryCell label="dot only — name still read">
        <Swatch {...swatchProps} isLabelVisible={false} />
      </StoryCell>

      <StoryCell label="label visible">
        <Swatch {...swatchProps} isLabelVisible />
      </StoryCell>

      <StoryCell label="sizes">
        <StoryRow>
          <Swatch
            {...swatchProps}
            isLabelVisible={false}
            size="sm"
          />

          <Swatch
            {...swatchProps}
            isLabelVisible={false}
            size="md"
          />

          <Swatch
            {...swatchProps}
            isLabelVisible={false}
            size="lg"
          />
        </StoryRow>
      </StoryCell>

      <StoryCell label="white stays visible in both schemes">
        <StoryRow>
          <Swatch
            {...swatchProps}
            color="#FFFFFF"
            isLabelVisible={false}
            label="White"
          />

          <Swatch
            {...swatchProps}
            appearance="outline"
            color="#FFFFFF"
            isLabelVisible={false}
            label="White"
          />
        </StoryRow>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The real placement: a row per item, the swatch answering "which
 * one" before the words do. This is castkit's album accent and
 * plex-channels' channel colours as much as it is a controller
 * sticker.
 */
export const InAList: Story = {
  render: () => (
    <Card heading="Controllers">
      <ul className="flex list-none flex-col gap-2 p-0">
        {STICKERS.map((sticker) => (
          <li
            className="flex items-center gap-3"
            key={sticker.label}
          >
            <Swatch
              color={sticker.color}
              label={`${sticker.label} sticker`}
              size="sm"
            />

            <span className="text-content-secondary text-sm">
              {sticker.label} controller
            </span>
          </li>
        ))}
      </ul>
    </Card>
  ),
}
