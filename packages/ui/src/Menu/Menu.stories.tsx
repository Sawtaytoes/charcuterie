import { useVisibility } from "@charcuterie/logic"
import type { ControlSize } from "@charcuterie/tokens"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import {
  controlSizeArgType,
  placementArgType,
} from "../argTypes.storyHelpers.ts"
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
  itemSize,
  items = BAY_ACTIONS,
  triggerLabel,
}: {
  emptyState?: ReactNode
  isInitiallyVisible?: boolean
  itemSize?: ControlSize
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
      itemSize={itemSize}
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
  title: "Components/Actions/Menu",
  component: Menu,
  parameters: { layout: "centered" },
  argTypes: {
    itemSize: controlSizeArgType,
    placement: placementArgType,
  },
  args: {
    items: BAY_ACTIONS,
    itemSize: "lg",
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

/**
 * The three row sizes, open side by side.
 *
 * `lg` is the **default** here and nowhere else in the library. The
 * argument is that a menu item is a pointer target before it is a
 * list row: it is read once and then aimed at, usually in a hurry,
 * and a menu rarely holds more than about eight items — so it can
 * spend the height a dense list cannot. At `comfortable` density `lg`
 * is 2.75rem, which is also the 44px WCAG 2.5.5 target, and on the
 * `kiosk` density it is 3.75rem with no prop change.
 *
 * `sm` is what every menu in the fleet rendered before this, so it is
 * the row to compare the other two against rather than a smaller
 * option nobody wants.
 *
 * A window shorter than 40rem steps each of these down one step on
 * its own, and one shorter than 30rem takes them to `sm` — so a `lg`
 * menu is never the reason its own last item is off the screen. Drag
 * the preview's bottom edge up to watch it happen.
 */
export const ItemSizes: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  parameters: { layout: "padded" },
  render: () => (
    <StoryGrid columns={3}>
      <StoryCell label="sm — the old row">
        <MenuHarness
          isInitiallyVisible
          itemSize="sm"
          triggerLabel="Bay 1"
        />
      </StoryCell>

      <StoryCell label="md — matches a default Button">
        <MenuHarness
          isInitiallyVisible
          itemSize="md"
          triggerLabel="Bay 2"
        />
      </StoryCell>

      <StoryCell label="lg — the default (44px)">
        <MenuHarness
          isInitiallyVisible
          itemSize="lg"
          triggerLabel="Bay 3"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * A label longer than the panel, at the width it matters.
 *
 * A portalled panel is `position: fixed`, so its shrink-to-fit width
 * stops at the **viewport** rather than at the space `shift` left it
 * — which produced a menu exactly as wide as a 390px window,
 * positioned 8px in, with 8px of itself off the right edge. It was
 * pre-existing and size-independent; a `lg` row's larger type is what
 * makes a real label reach it.
 *
 * The panel is clamped to the shifted `availableWidth` now, and the
 * label wraps inside its row — which is also why a row's height is a
 * `min-h-` rather than an `h-`.
 */
export const LongLabel: Story = {
  args: {
    isVisible: false,
    onDismiss: noop,
    trigger: <Button appearance="outline">Actions</Button>,
  },
  globals: { viewport: { value: "mobile1" } },
  parameters: { layout: "padded" },
  render: () => (
    <MenuHarness
      isInitiallyVisible
      items={[
        {
          icon: <SettingsIcon />,
          key: "forget",
          label:
            "Forget every remembered passcode on this device",
          onSelect: noop,
        },
        {
          key: "skip",
          label: "Skip title",
          onSelect: noop,
        },
      ]}
      triggerLabel="Bay 8"
    />
  ),
}
