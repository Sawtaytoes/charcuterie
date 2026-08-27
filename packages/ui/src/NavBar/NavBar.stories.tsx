import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import {
  controlSizeArgType,
  placementArgType,
} from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
} from "../board.storyHelpers.tsx"
import { Header } from "../Header/Header.tsx"
import { MenuIcon } from "../icons.storyHelpers.tsx"
import { Main } from "../Main/Main.tsx"
import { RouterLinkProvider } from "../RouterLink/RouterLinkProvider.tsx"
import type { RouterLinkProps } from "../RouterLink/routerLink.ts"
import { Shell } from "../Shell/Shell.tsx"
import { PageContent } from "../shell.storyHelpers.tsx"
import type { NavBarItem } from "./NavBar.tsx"
import { NavBar } from "./NavBar.tsx"

/**
 * A stand-in for react-router's `<Link>`, and it does the one thing
 * the plain `SoftRouterLink` in the other link boards does not:
 * `preventDefault()`.
 *
 * That is not a test convenience, it is what a router does — it
 * intercepts the plain left click and pushes history instead of
 * letting the browser leave the page. Without it these boards
 * genuinely navigate: the first run of `NavBar.test.tsx` clicked
 * "Phases" and took the whole vitest iframe to `/phases`, which is
 * the most direct proof available that these rows are real anchors
 * and not `<button>`s.
 *
 * The `href` is untouched, so middle-click and ctrl-click still go
 * to the platform — exactly as they do in an app.
 */
const SoftRouterLink = ({
  href,
  onClick,
  ...linkProps
}: RouterLinkProps): ReactNode => (
  <a
    {...linkProps}
    data-router="soft"
    href={href}
    onClick={(event) => {
      // The caller's handler first, then the interception — which
      // is react-router's own order in `Link`, and it is what lets
      // `NavBar` see a click that has not been cancelled yet.
      onClick?.(event)

      event.preventDefault()
    }}
  />
)

/**
 * Docket's nine, in the product's own order — the nav that outgrew
 * a single line and is the reason this component exists. The order
 * is the pipeline work moves along, which is exactly why it may not
 * be split across a bar and a menu.
 */
const DESTINATIONS: NavBarItem[] = [
  { href: "/triage", label: "Triage" },
  { href: "/backlog", label: "Backlog" },
  { href: "/phases", label: "Phases" },
  { href: "/lanes", label: "Lanes" },
  { href: "/board", label: "Board" },
  { href: "/archives", label: "Archives" },
  { href: "/tonight", label: "Tonight" },
  { href: "/chats", label: "Chats" },
  { href: "/settings", label: "Settings" },
]

const FEW_DESTINATIONS = DESTINATIONS.slice(0, 3)

/**
 * A fixed-width box, because the whole component is a measurement.
 * A `layout: "centered"` story would size itself to its contents
 * and never fold at all.
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
  title: "Components/Layout/NavBar",
  component: NavBar,
  decorators: [
    (Story) => (
      <RouterLinkProvider link={SoftRouterLink}>
        <Story />
      </RouterLinkProvider>
    ),
  ],
  parameters: { layout: "padded" },
  argTypes: {
    menuPlacement: placementArgType,
    size: controlSizeArgType,
  },
  args: {
    currentHref: "/board",
    items: DESTINATIONS,
    label: "Main",
    menuIcon: <MenuIcon />,
    menuLabel: "Main menu",
    size: "sm",
  },
} satisfies Meta<typeof NavBar>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Wide enough for all nine, so there is **no menu button at all** —
 * a trigger that shows at every width is not a fold, it is a nav
 * you have permanently hidden.
 */
export const Default: Story = {
  render: (navBarProps) => (
    <Frame inlineSize="52rem">
      <NavBar {...navBarProps} />
    </Frame>
  ),
}

/**
 * The two states, and there is deliberately no third.
 *
 * `Toolbar` drops items one at a time from the end because its items
 * are **ranked**. A nav's order is the product's shape, not a
 * priority list, so half of it in the bar and half behind a button
 * is a rule no reader can learn.
 */
export const AllVariants: Story = {
  render: ({ currentHref, size }) => (
    <StoryGrid columns={1}>
      <StoryCell label="It fits — every destination is a link">
        <Frame inlineSize="52rem">
          <NavBar
            currentHref={currentHref}
            items={DESTINATIONS}
            label="Main, wide"
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell label="It does not fit — all nine fold together">
        <Frame inlineSize="18rem">
          <NavBar
            currentHref={currentHref}
            items={DESTINATIONS}
            label="Main, narrow"
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell
        label={
          'Folded, menuAlign="end" — the trigger joins the header\'s own actions'
        }
      >
        <Frame inlineSize="18rem">
          <NavBar
            currentHref={currentHref}
            items={DESTINATIONS}
            label="Main, trigger at the end"
            menuAlign="end"
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell label="No icon — the trigger is its own label">
        <Frame inlineSize="18rem">
          <NavBar
            currentHref={currentHref}
            items={DESTINATIONS}
            label="Main, worded trigger"
            menuLabel="Menu"
            size={size}
          />
        </Frame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Folded and open is the state nobody screenshots, and it is the
 * one that matters: the panel is the **complete** list, in the
 * product's order, with the current destination marked in it.
 */
export const AllStates: Story = {
  render: ({ size }) => (
    <StoryGrid columns={1}>
      <StoryCell label="Current destination, in the bar">
        <Frame inlineSize="52rem">
          <NavBar
            currentHref="/board"
            items={DESTINATIONS}
            label="Main, current in bar"
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell label="On a route no destination owns — nothing is current">
        <Frame inlineSize="52rem">
          <NavBar
            currentHref="/tasks/41"
            items={FEW_DESTINATIONS}
            label="Main, nothing current"
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
            size={size}
          />
        </Frame>
      </StoryCell>

      <StoryCell label="Folded, menu open — the complete list">
        <Frame inlineSize="18rem">
          <NavBar
            currentHref="/board"
            isMenuVisible
            items={DESTINATIONS}
            label="Main, folded and open"
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
            size={size}
          />
        </Frame>
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Measured rather than breakpointed. The same nine destinations at
 * three container widths, with no pixel number anywhere in the
 * component — so a longer label, a tenth destination or a denser
 * theme moves the fold on its own.
 */
export const Responsive: Story = {
  render: ({ currentHref, size }) => (
    <ContainerBoard>
      {(width) => (
        <Frame inlineSize="100%">
          <NavBar
            currentHref={currentHref}
            items={DESTINATIONS}
            label={`Main at ${width}`}
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
            size={size}
          />
        </Frame>
      )}
    </ContainerBoard>
  ),
}

/**
 * Tab to the trigger, Enter to open, and focus moves into the
 * panel; Escape closes it and hands focus back. Every row is a real
 * `<a href>`, so ctrl-click and middle-click still open a tab —
 * which is the entire reason this is not a `Menu`.
 */
export const Interactive: Story = {
  render: ({ currentHref, size }) => (
    <Frame inlineSize="18rem">
      <NavBar
        currentHref={currentHref}
        items={DESTINATIONS}
        label="Main, keyboard"
        menuIcon={<MenuIcon />}
        menuLabel="Main menu"
        size={size}
      />
    </Frame>
  ),
}

/**
 * Where it actually goes: `Shell` → `Header`, with the wordmark
 * before it and the page's own action after it.
 *
 * The header row is a flex line, so the bar's `flex-1 min-w-0` is
 * what gives it a box sized by the row rather than by its own
 * links — the one arrangement rule the component cannot enforce
 * from the inside.
 */
const AppShellHarness = (): ReactNode => (
  <Shell>
    <Header
      actions={
        <Button intent="accent" size="sm">
          Add Task
        </Button>
      }
      heading="Docket"
    >
      <NavBar
        currentHref="/board"
        items={DESTINATIONS}
        label="Main"
        // The header's own action is at the far edge, so the fold
        // control joins it rather than hugging the wordmark with
        // the whole track empty after it.
        menuAlign="end"
        menuIcon={<MenuIcon />}
        menuLabel="Main menu"
      />
    </Header>

    <Main>
      <PageContent />
    </Main>
  </Shell>
)

export const InAppShell: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <AppShellHarness />,
}
