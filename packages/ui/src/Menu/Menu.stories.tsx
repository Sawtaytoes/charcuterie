import { useVisibility } from "@charcuterie/logic"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { placementArgType } from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import {
  RedoIcon,
  SettingsIcon,
  UndoIcon,
} from "../icons.storyHelpers.tsx"
import type { MenuItem } from "./Menu.tsx"
import { Menu } from "./Menu.tsx"

const noop = () => undefined

const BAY_ACTIONS: MenuItem[] = [
  {
    icon: <UndoIcon />,
    key: "retry",
    label: "Retry title",
    onSelect: noop,
  },
  {
    icon: <RedoIcon />,
    key: "skip",
    label: "Skip title",
    onSelect: noop,
  },
  {
    icon: <SettingsIcon />,
    isDisabled: true,
    key: "eject",
    label: "Eject disc",
    onSelect: noop,
  },
]

/**
 * A menu's visibility belongs to the app, exactly like `Popover`'s —
 * so the stories hold it in a `useVisibility`, which is what a
 * consumer writes too.
 */
const MenuHarness = ({
  isInitiallyVisible = false,
  items = BAY_ACTIONS,
  triggerLabel,
}: {
  isInitiallyVisible?: boolean
  items?: MenuItem[]
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isInitiallyVisible,
  })

  return (
    <Menu
      isVisible={isVisible}
      items={items}
      onDismiss={hide}
      trigger={
        <Button appearance="outline" onClick={toggle}>
          {triggerLabel}
        </Button>
      }
    />
  )
}

const meta = {
  title: "Components/Menu",
  component: Menu,
  parameters: { layout: "centered" },
  argTypes: { placement: placementArgType },
  args: {
    items: BAY_ACTIONS,
    placement: "bottom-start",
  },
} satisfies Meta<typeof Menu>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  render: () => <MenuHarness triggerLabel="Actions" />,
}

/**
 * A `menuitem` **does** something; an `option` **is** something. A
 * screen reader announces "menu, 3 items" for one and "listbox,
 * selected, 2 of 4" for the other, and mux-magic's `TypePicker`
 * renders `role="menu"` over items that set a value — a listbox
 * wearing the wrong role.
 */
export const AllVariants: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell label="closed">
        <MenuHarness triggerLabel="Bay 1" />
      </StoryCell>

      <StoryCell label="open">
        <MenuHarness
          isInitiallyVisible
          triggerLabel="Bay 2"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * A disabled item is simply **not registered** with the roving
 * group, so the arrow keys skip it without any command in
 * `RovingFocus` knowing what "disabled" means. It stays in the DOM
 * and stays announced — the difference between "not right now" and
 * "does not exist".
 */
export const AllStates: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  render: () => (
    <MenuHarness isInitiallyVisible triggerLabel="Bay 3" />
  ),
}

/**
 * Open it and arrow down. Focus lands on the first item **on
 * opening** — a menu that leaves the caret on the trigger is one a
 * keyboard user cannot reach — and Escape closes it without the
 * page moving.
 */
export const Interactive: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  render: () => (
    <MenuHarness triggerLabel="Open bay 4 menu" />
  ),
}
