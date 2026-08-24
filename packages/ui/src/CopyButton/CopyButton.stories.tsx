import type { Meta, StoryObj } from "@storybook/react"
import { userEvent, within } from "storybook/test"

import {
  StoryCell,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import { CopyButton } from "./CopyButton.tsx"

const meta = {
  title: "Components/Actions/CopyButton",
  component: CopyButton,
  parameters: { layout: "padded" },
  // The component's own defaults, restated — Storybook does not
  // seed `args` from docgen, so an unstated default shows in the
  // props table with nothing selected in its control.
  args: {
    appearance: "solid",
    confirmDuration: 2000,
    intent: "accent",
    isDisabled: false,
    size: "md",
    value: "335590",
  },
} satisfies Meta<typeof CopyButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/**
 * The confirmation, held open. `confirmDuration` is enormous here so
 * the state can be read, hovered and screenshotted — a two-second
 * default is right in an app and useless in a docs page.
 */
export const Confirmed: Story = {
  args: {
    confirmDuration: 600_000,
    // Injected, not real. A headless browser refuses
    // `navigator.clipboard` outright — the document is not focused —
    // so a story that used the real one would document the *failure*
    // state under a name that promises the success one.
    copy: () => true,
    value: "335590",
  },
  // Driven, not faked: the story presses the button the way a reader
  // would. No assertion — those live in `CopyButton.test.tsx`.
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Copy",
      }),
    )
  },
}

/**
 * The clipboard refused. Injected rather than provoked: a story
 * cannot revoke the permission, and the failure path is the half of
 * this component the hand-rolled copies in the fleet do not have.
 */
export const Refused: Story = {
  args: {
    confirmDuration: 600_000,
    copy: () => false,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Copy",
      }),
    )
  },
}

/** Every appearance, so a toolbar's ghost copy is a real option. */
export const AllAppearances: Story = {
  render: (args) => (
    <StorySection title="Appearances">
      <StoryRow>
        <StoryCell label="solid">
          <CopyButton {...args} appearance="solid" />
        </StoryCell>
        <StoryCell label="soft">
          <CopyButton {...args} appearance="soft" />
        </StoryCell>
        <StoryCell label="outline">
          <CopyButton {...args} appearance="outline" />
        </StoryCell>
        <StoryCell label="ghost">
          <CopyButton {...args} appearance="ghost" />
        </StoryCell>
      </StoryRow>
    </StorySection>
  ),
}

/**
 * A caller's own words. The label is content, so a one-off surface
 * that copies something specific says which thing it copies.
 */
export const OwnLabels: Story = {
  args: {
    children: "Copy code",
    copiedLabel: "Code copied",
    value: "335590",
  },
}
