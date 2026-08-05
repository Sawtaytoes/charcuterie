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
import { Tooltip } from "../Tooltip/Tooltip.tsx"
import type { MenuEntry, MenuItem } from "./Menu.tsx"
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

const GROUPED_ACTIONS: MenuEntry[] = [
  {
    items: [
      {
        key: "retry",
        label: "Retry title",
        onSelect: noop,
      },
      { key: "skip", label: "Skip title", onSelect: noop },
    ],
    key: "disc",
    label: "Disc",
    type: "group",
  },
  { key: "sep", type: "separator" },
  {
    items: [
      {
        icon: <SettingsIcon />,
        key: "eject",
        label: "Eject disc",
        onSelect: noop,
      },
    ],
    key: "danger",
    label: "Danger",
    type: "group",
  },
]

/**
 * A menu's visibility belongs to the app, exactly like `Popover`'s —
 * so the stories hold it in a `useVisibility`, which is what a
 * consumer writes too.
 */
const MenuHarness = ({
  emptyState,
  isInitiallyVisible = false,
  items = BAY_ACTIONS,
  triggerLabel,
}: {
  emptyState?: ReactNode
  isInitiallyVisible?: boolean
  items?: MenuEntry[]
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isInitiallyVisible,
  })

  return (
    <Menu
      emptyState={emptyState}
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

/**
 * The same harness, with a `Tooltip` between the `Menu` and the
 * button — two components cloning onto **one** trigger, which is what
 * image-viewer wanted and could not have.
 */
const TooltipTriggerHarness = ({
  isInitiallyVisible = false,
  tip,
  triggerLabel,
}: {
  isInitiallyVisible?: boolean
  tip: string
  triggerLabel: string
}): ReactNode => {
  const { hide, isVisible, toggle } = useVisibility({
    isVisible: isInitiallyVisible,
  })

  return (
    <Menu
      isVisible={isVisible}
      items={BAY_ACTIONS}
      onDismiss={hide}
      trigger={
        <Tooltip label={tip}>
          <Button appearance="outline" onClick={toggle}>
            {triggerLabel}
          </Button>
        </Tooltip>
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
 * **One trigger, two slots.** `Menu` and `Tooltip` both clone onto
 * the button and both hand it a `ref` — floating-ui's
 * `refs.setReference`, which is the anchor each of them positions
 * against. Until 1.0.1 the second clone's ref simply replaced the
 * first's, so the panel it belonged to had no anchor and rendered in
 * the top-left corner of the viewport.
 *
 * Hover the button and open the menu: the tip and the panel are both
 * attached to it.
 */
export const SharedTrigger: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  render: () => (
    // Padded, and the padding is load-bearing rather than pretty: an
    // anchor that has been dropped leaves floating-ui at
    // `left: 0; top: 0`, so a trigger sitting in the corner of the
    // viewport is a trigger where "anchored" and "not anchored" look
    // identical. `Menu.test.tsx` asserts the padding is still here.
    <div className="p-16">
      <TooltipTriggerHarness
        tip="Everything that can be done to this bay."
        triggerLabel="Bay 5"
      />
    </div>
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

/**
 * `items` is a union — a `group` (`role="group"`, named by its
 * label) and a `separator` (`role="separator"`) opt in by their
 * `type`, and a bare item still works unchanged. Neither the
 * separator nor the group headings register with the roving group,
 * so arrow-down goes Retry → Skip → Eject, straight past both
 * headings and the rule between them.
 */
export const Grouped: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  render: () => (
    <MenuHarness
      isInitiallyVisible
      items={GROUPED_ACTIONS}
      triggerLabel="Bay 6"
    />
  ),
}

/**
 * No actions to show. The `emptyState` renders as a **disabled**
 * `menuitem` — a `role="menu"` must own one — so it is announced but
 * takes no tab stop and no roving-focus membership, and a keyboard
 * user can still Escape out of it.
 */
export const Empty: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  render: () => (
    <MenuHarness
      emptyState="No actions available"
      isInitiallyVisible
      items={[]}
      triggerLabel="Bay 7"
    />
  ),
}
