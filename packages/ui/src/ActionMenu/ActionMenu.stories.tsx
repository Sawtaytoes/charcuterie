import { playgroundParameters } from "@charcuterie/storybook-config/story-parameters"
import type { Meta, StoryObj } from "@storybook/react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Card } from "../Card/Card.tsx"
import {
  MoreIcon,
  RedoIcon,
  SettingsIcon,
  UndoIcon,
} from "../icons.storyHelpers.tsx"
import type { MenuEntry } from "../Menu/Menu.tsx"
import { ActionMenu } from "./ActionMenu.tsx"

const noop = () => undefined

const SHELF_ACTIONS: MenuEntry[] = [
  {
    icon: <UndoIcon />,
    key: "rename",
    label: "Rename",
    onSelect: noop,
  },
  {
    icon: <RedoIcon />,
    key: "move",
    label: "Move to another place",
    onSelect: noop,
  },
  { key: "divider", type: "separator" },
  {
    icon: <SettingsIcon />,
    isDisabled: true,
    key: "archive",
    label: "Archive",
    onSelect: noop,
  },
]

const meta = {
  title: "Components/Actions/ActionMenu",
  component: ActionMenu,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  args: {
    items: SHELF_ACTIONS,
    label: "Actions for Office Shelves",
    size: "md",
  },
} satisfies Meta<typeof ActionMenu>

export default meta

type Story = StoryObj<typeof meta>

/**
 * At the end of its row, where it lives: the panel opens at
 * `bottom-end`, so its end edge lines up with the button's and it
 * opens inward.
 */
export const Playground: Story = {
  parameters: playgroundParameters,
  render: (actionMenuProps) => (
    <div className="flex justify-end">
      <ActionMenu {...actionMenuProps} />
    </div>
  ),
}

/**
 * The default dots against an app's own glyph, at every size. The
 * dots are three round boxes, not a `⋮` and not an SVG, so they draw
 * in a font that has no such character.
 */
export const AllVariants: Story = {
  render: (actionMenuProps) => (
    <StorySection title="Default dots or the app's own icon, at sm, md and lg. Every trigger names the thing it acts on.">
      <StoryGrid columns={3}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell key={size} label={`size=${size}`}>
            <ActionMenu
              {...actionMenuProps}
              label={`Actions for shelf ${size}`}
              size={size}
            />
          </StoryCell>
        ))}

        {(["sm", "md", "lg"] as const).map((size) => (
          <StoryCell
            key={`icon-${size}`}
            label={`icon={<MoreIcon />} size=${size}`}
          >
            <ActionMenu
              {...actionMenuProps}
              icon={<MoreIcon />}
              label={`Actions for bin ${size}`}
              size={size}
            />
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Rest, hover and focus on the trigger. The open state is `Menu`'s
 * own board; this component adds nothing to the panel.
 */
export const AllStates: Story = {
  parameters: {
    pseudo: {
      focusVisible: ["#focus-target button"],
      hover: ["#hover-target button"],
    },
  },
  render: (actionMenuProps) => (
    <StoryGrid columns={3}>
      <StoryCell label="rest">
        <ActionMenu
          {...actionMenuProps}
          label="Actions for Cables"
        />
      </StoryCell>

      <StoryCell label="hover (forced)">
        <div id="hover-target">
          <ActionMenu
            {...actionMenuProps}
            label="Actions for Adapters"
          />
        </div>
      </StoryCell>

      <StoryCell label="focus-visible (forced)">
        <div id="focus-target">
          <ActionMenu
            {...actionMenuProps}
            label="Actions for Chargers"
          />
        </div>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Where it lives: at the end of a card's header row. The title wraps
 * and the trigger keeps its size, at every container width.
 */
export const Responsive: Story = {
  render: (actionMenuProps) => (
    <ContainerBoard>
      {(width) => (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <h3 className="m-0 min-w-0 font-semibold text-content-primary text-md wrap-anywhere">
              Office Shelves, the tall unit by the window
            </h3>
            <ActionMenu
              {...actionMenuProps}
              label={`Actions for Office Shelves at ${width}`}
            />
          </div>
        </Card>
      )}
    </ContainerBoard>
  ),
}

/**
 * Enter or Space opens it and focus moves to the first item; the
 * arrows walk the items and skip the disabled one; choosing an item
 * or pressing Escape closes it.
 */
export const Interactive: Story = {}
