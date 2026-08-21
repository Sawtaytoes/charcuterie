import { useMediaQuery } from "@charcuterie/logic"
import { matchMediaMatcher } from "@charcuterie/logic/browser"
import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"

import { controlSizeArgType } from "../argTypes.storyHelpers.ts"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Header } from "../Header/Header.tsx"
import {
  MoreIcon,
  PlayIcon,
  RedoIcon,
  SettingsIcon,
  UndoIcon,
} from "../icons.storyHelpers.tsx"
import { Main } from "../Main/Main.tsx"
import { Shell } from "../Shell/Shell.tsx"
import { Switch } from "../Switch/Switch.tsx"
import {
  HeaderSchemeToggle,
  PageContent,
} from "../shell.storyHelpers.tsx"
import type {
  ToolbarAction,
  ToolbarItem,
} from "./Toolbar.tsx"
import { Toolbar } from "./Toolbar.tsx"

const noop = () => undefined

/**
 * Priority order, highest first — `items[0]` is the last thing to
 * collapse. rip-deck's bar, near enough: the two things you do to a
 * running job, then the two you do to the deck.
 */
const DECK_ACTIONS: ToolbarAction[] = [
  {
    icon: <PlayIcon />,
    key: "start",
    label: "Start rip",
    onSelect: noop,
  },
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
 * A dry-run switch with its own state, so the collapsed row is a
 * **real** toggle rather than mux-magic's `aria-hidden` span — the
 * defect the audit calls the worst in that file, because Dry Run
 * announces identically on and off.
 */
const DryRunSwitch = (): ReactNode => {
  const [isDryRun, setIsDryRun] = useState(true)

  return (
    <Switch
      isChecked={isDryRun}
      label="Dry run"
      onChange={setIsDryRun}
      size="sm"
    />
  )
}

/**
 * The header's real mix: actions, a switch, and the scheme control.
 * `role="menu"` would be invalid over this — hence `overflow="panel"`,
 * which the type system requires here rather than suggesting.
 */
const MIXED_ITEMS: ToolbarItem[] = [
  ...DECK_ACTIONS.slice(0, 2),
  {
    element: <DryRunSwitch />,
    key: "dry-run",
    type: "control",
  },
  {
    element: <HeaderSchemeToggle />,
    key: "scheme",
    label: "Colour scheme",
    type: "control",
  },
]

/**
 * A fixed-width box, because the whole component is a measurement.
 * A `layout: "centered"` story would size itself to its contents
 * and never overflow at all.
 */
const Frame = ({
  children,
  inlineSize,
}: {
  children: ReactNode
  inlineSize: string
}): ReactNode => (
  <div
    className="flex rounded-md border border-border-subtle bg-surface-raised p-2"
    style={{ inlineSize }}
  >
    {children}
  </div>
)

const meta = {
  title: "Components/Actions/Toolbar",
  component: Toolbar,
  parameters: { layout: "padded" },
  argTypes: { size: controlSizeArgType },
  args: {
    items: DECK_ACTIONS,
    label: "Deck actions",
    overflow: "menu",
    overflowIcon: <MoreIcon />,
    overflowLabel: "More actions",
    size: "sm",
  },
} satisfies Meta<typeof Toolbar>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Wide enough for everything, so there is **no overflow trigger at
 * all**. mux-magic shows its ⋮ at every width, which is why its
 * collapse is not progressive: almost everything lives in the
 * popover permanently.
 */
export const Default: Story = {
  render: (toolbarProps) => (
    <Frame inlineSize="34rem">
      <Toolbar {...toolbarProps} />
    </Frame>
  ),
}

/**
 * The two overflow kinds, and the distinction is a **type**.
 *
 * `overflow="menu"` narrows `items` to actions only and opens a real
 * `role="menu"`. `overflow="panel"` accepts controls too and opens a
 * `Popover` (`role="dialog"`, `aria-haspopup="dialog"`), because
 * `role="menu"` permits only `menuitem`-family children — putting a
 * scheme switcher in one, as plex-channels does today, is invalid
 * ARIA that no gate catches.
 */
export const AllVariants: Story = {
  render: ({ size }) => (
    <StoryGrid columns={1}>
      <StoryCell
        label={`overflow="menu" — every row is an action`}
      >
        <Frame inlineSize="9rem">
          <Toolbar
            items={DECK_ACTIONS}
            label="Deck actions"
            overflow="menu"
            overflowIcon={<MoreIcon />}
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell label={`overflow="panel" — mixed content`}>
        <Frame inlineSize="14rem">
          <Toolbar
            items={MIXED_ITEMS}
            label="Deck controls"
            overflow="panel"
            overflowIcon={<MoreIcon />}
            overflowLabel="More controls"
            size={size}
          />
        </Frame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Nothing collapsed, something collapsed, and the overflow open —
 * the three states the audit says nobody screenshots. The open ones
 * are the point: an overflow audited only while shut is an overflow
 * nobody audited.
 */
export const AllStates: Story = {
  render: ({ size }) => (
    <StoryGrid columns={1}>
      <StoryCell label="34rem — nothing collapsed">
        <Frame inlineSize="34rem">
          <Toolbar
            items={DECK_ACTIONS}
            label="Deck actions, wide"
            overflow="menu"
            overflowIcon={<MoreIcon />}
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell label="9rem — collapsed, menu open">
        <Frame inlineSize="9rem">
          <Toolbar
            isOverflowVisible
            items={DECK_ACTIONS}
            label="Deck actions, narrow"
            overflow="menu"
            overflowIcon={<MoreIcon />}
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell label="12rem — collapsed, mixed panel open">
        <Frame inlineSize="12rem">
          <Toolbar
            isOverflowVisible
            items={MIXED_ITEMS}
            label="Deck controls, narrow"
            overflow="panel"
            overflowIcon={<MoreIcon />}
            overflowLabel="More controls"
            size={size}
          />
        </Frame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Progressive collapse, measured rather than breakpointed. Same
 * items, three container widths, and the count in the bar falls one
 * at a time from the **end** of the priority order — no `480px`
 * anywhere, so a longer label or a denser theme moves the collapse
 * point on its own.
 */
export const Responsive: Story = {
  render: ({ size }) => (
    <ContainerBoard>
      {(width) => (
        <Frame inlineSize="100%">
          <Toolbar
            items={DECK_ACTIONS}
            label={`Deck actions at ${width}`}
            overflow="menu"
            overflowIcon={<MoreIcon />}
            size={size}
          />
        </Frame>
      )}
    </ContainerBoard>
  ),
}

/**
 * Tab **once** to enter, then the arrow keys move along the row and
 * Home/End jump to its ends — one tab stop for the whole toolbar,
 * which is what the APG asks for and what four repos' `role="toolbar"`
 * does not do. Open the overflow and focus moves into it; Escape
 * closes it and hands focus back to the trigger.
 */
export const Interactive: Story = {
  render: ({ size }) => (
    <Frame inlineSize="9rem">
      <Toolbar
        items={DECK_ACTIONS}
        label="Deck actions, keyboard"
        overflow="menu"
        overflowIcon={<MoreIcon />}
        size={size}
      />
    </Frame>
  ),
}

/**
 * Where it actually goes: `Shell` → `Header`, in the header's own
 * row, with the scheme control among its items rather than beside
 * them.
 *
 * The header is also where the **other** half of the fleet's problem
 * lives — on a phone the bar wants to leave the header entirely, and
 * that is a relocation, not a fit. So this story composes the two:
 * `useMediaQuery` (from `@charcuterie/logic`, over the `matchMedia`
 * matcher) decides *where* the toolbar is mounted, and `Toolbar`
 * decides *what fits* once it is there. Exactly one instance either
 * way — the element moves, it is never rendered twice and hidden.
 */
const AppShellHarness = (): ReactNode => {
  const { isMatching: isNarrow } = useMediaQuery({
    matcher: matchMediaMatcher("(width < 40rem)"),
  })

  const toolbar = (
    <Toolbar
      items={MIXED_ITEMS}
      label="Deck controls"
      overflow="panel"
      overflowIcon={<MoreIcon />}
      overflowLabel="More controls"
    />
  )

  return (
    <Shell>
      <Header heading="Rip Deck">
        {isNarrow ? null : toolbar}
      </Header>

      <Main>
        {isNarrow ? toolbar : null}

        <PageContent />
      </Main>
    </Shell>
  )
}

export const InAppShell: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <AppShellHarness />,
}
