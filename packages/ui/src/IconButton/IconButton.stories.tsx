import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"

import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  RedoIcon,
  SettingsIcon,
  UndoIcon,
} from "../icons.storyHelpers.tsx"
import { IconButton } from "./IconButton.tsx"

/**
 * The library ships **no icons** — lucide is the fleet recommendation
 * and `children` is whatever the app already has, so these are
 * story-only SVGs.
 *
 * `RawGlyph` below keeps plex-channels' actual `↶` for comparison:
 * the glyph is unchanged, the *name* is what this component adds.
 */
const UNDO_ICON = <UndoIcon />

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  args: {
    appearance: "ghost",
    isDisabled: false,
    isLoading: false,
    size: "md",
  },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The name is the whole component. plex-channels renders `↶` into a
 * bare `<button>` today, so a screen reader announces "↶" and
 * `getByRole("button", { name: "Undo" })` finds nothing.
 */
export const Default: Story = {
  args: { children: UNDO_ICON, label: "Undo" },
}

export const AllVariants: Story = {
  args: { children: UNDO_ICON, label: "Undo" },
  render: (iconButtonProps) => (
    <StorySection title="Same four appearances as Button — ghost is the toolbar default, because a row of six solid squares is a wall.">
      <StoryGrid columns={4}>
        <StoryCell label="solid">
          <IconButton
            {...iconButtonProps}
            appearance="solid"
          />
        </StoryCell>

        <StoryCell label="soft">
          <IconButton
            {...iconButtonProps}
            appearance="soft"
          />
        </StoryCell>

        <StoryCell label="outline">
          <IconButton
            {...iconButtonProps}
            appearance="outline"
          />
        </StoryCell>

        <StoryCell label="ghost">
          <IconButton
            {...iconButtonProps}
            appearance="ghost"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

export const AllStates: Story = {
  args: { children: UNDO_ICON, label: "Undo" },
  parameters: {
    pseudo: {
      active: ["#active"],
      focusVisible: ["#focus-target"],
      hover: ["#hover"],
    },
  },
  render: (iconButtonProps) => (
    <StoryGrid columns={4}>
      <StoryCell label="default">
        <IconButton {...iconButtonProps} />
      </StoryCell>

      <StoryCell label="hover (forced)">
        <IconButton {...iconButtonProps} id="hover" />
      </StoryCell>

      <StoryCell label="active (forced)">
        <IconButton {...iconButtonProps} id="active" />
      </StoryCell>

      <StoryCell label="focus-visible (forced)">
        <IconButton
          {...iconButtonProps}
          id="focus-target"
        />
      </StoryCell>

      <StoryCell label="disabled">
        <IconButton {...iconButtonProps} isDisabled />
      </StoryCell>

      <StoryCell label="loading">
        <IconButton {...iconButtonProps} isLoading />
      </StoryCell>
    </StoryGrid>
  ),
}

export const Sizes: Story = {
  args: { children: UNDO_ICON, label: "Undo" },
  render: (iconButtonProps) => (
    <StorySection title="Square on the control height, so an icon button lines up with the text button beside it.">
      <StoryRow>
        <IconButton {...iconButtonProps} size="sm" />

        <IconButton {...iconButtonProps} size="md" />

        <IconButton {...iconButtonProps} size="lg" />
      </StoryRow>
    </StorySection>
  ),
}

export const Responsive: Story = {
  args: { children: UNDO_ICON, label: "Undo" },
  render: (iconButtonProps) => (
    <ContainerBoard>
      <StoryRow>
        <IconButton
          {...iconButtonProps}
          appearance="ghost"
        />

        <IconButton
          {...iconButtonProps}
          appearance="ghost"
          label="Redo"
        >
          <RedoIcon />
        </IconButton>

        <IconButton
          {...iconButtonProps}
          appearance="ghost"
          label="Settings"
        >
          <SettingsIcon />
        </IconButton>
      </StoryRow>
    </ContainerBoard>
  ),
}

/**
 * plex-channels' `↶`, rendered exactly as it is today — and named,
 * which it is not today. `getByRole("button", { name: "Undo" })`
 * resolves here and finds nothing there.
 *
 * A glyph depends on a font having that code point: this repo's
 * headless Chromium has none for `↶`, so in a CI screenshot the
 * button is empty while the *name* is still correct. That is the
 * argument for an SVG icon set, made by the story rather than in a
 * comment.
 */
export const RawGlyph: Story = {
  args: { children: "↶", label: "Undo" },
}
