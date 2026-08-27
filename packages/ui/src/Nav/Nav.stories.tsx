import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"
import { useState } from "react"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  BulletedListIcon,
  ExternalIcon,
  InboxIcon,
  MenuIcon,
  MoonIcon,
  PlayIcon,
  SettingsIcon,
} from "../icons.storyHelpers.tsx"
import { RouterLinkProvider } from "../RouterLink/RouterLinkProvider.tsx"
import type { RouterLinkProps } from "../RouterLink/routerLink.ts"
import { Nav } from "./Nav.tsx"
import type { NavRailItem } from "./navItems.ts"

/**
 * A stand-in for react-router's `<Link>`, and it does the one thing
 * a plain anchor must not do here: `preventDefault()`.
 *
 * That is not a test convenience, it is what a router does — it
 * intercepts the plain left click and pushes history instead of
 * letting the browser leave the page. Without it these boards
 * genuinely navigate away.
 *
 * The `href` is untouched, so middle-click and ctrl-click still go
 * to the platform, exactly as they do in an app.
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
      // The caller's handler first, then the interception — which is
      // react-router's own order in `Link`, and it is what lets a
      // folded panel see a click that has not been cancelled yet.
      onClick?.(event)

      event.preventDefault()
    }}
  />
)

/**
 * A fixed-width box, because `bar` is a measurement. A story that
 * sizes itself to its contents never folds at all.
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

/**
 * **Invented, all of it.** The app this was built alongside is a
 * household's media tool and a published library must not carry its
 * shelves, so these are a fictional radio station's screens. The
 * shape is what matters and the shape is the same: five or six
 * destinations, two of them configuration, one of them leaving the
 * app for a source it does not own.
 */
const STATION_ITEMS: NavRailItem[] = [
  {
    href: "/",
    icon: <PlayIcon />,
    key: "now",
    label: "On air",
  },
  {
    href: "/tonight",
    icon: <MoonIcon />,
    key: "tonight",
    label: "Tonight",
  },
  {
    href: "/library",
    icon: <BulletedListIcon />,
    key: "library",
    label: "Library",
  },
  {
    href: "/incoming",
    icon: <InboxIcon />,
    key: "incoming",
    label: "Incoming",
  },
  {
    href: "/settings",
    icon: <SettingsIcon />,
    key: "settings",
    label: "Settings",
  },
]

/**
 * The same list with a destination that leaves the app, and one long
 * enough to prove the truncation rule. A rail that only looks right
 * with short labels has not been tested.
 */
const STATION_ITEMS_WITH_EXTERNAL: NavRailItem[] = [
  ...STATION_ITEMS,
  {
    href: "https://example.com/catalogue",
    icon: <ExternalIcon />,
    isExternal: true,
    key: "catalogue",
    label: "Publisher catalogue — every pressing",
  },
]

const meta = {
  component: Nav,
  decorators: [
    (Story) => (
      <RouterLinkProvider link={SoftRouterLink}>
        <Story />
      </RouterLinkProvider>
    ),
  ],
  parameters: { layout: "padded" },
  title: "Components/Layout/Nav",
} satisfies Meta<typeof Nav>

export default meta

// `typeof Nav`, not `typeof meta`: `NavProps` is a union, and
// Storybook resolves a `satisfies Meta<>` object with decorators
// down to `never` args when the component's props do not intersect.
type Story = StoryObj<typeof Nav>

/**
 * A header row, which is what an app with a handful of destinations
 * wants: ai-usage, folio, mux-magic, portly-controllers.
 */
export const Default: Story = {
  args: {
    activeHref: "/library",
    items: STATION_ITEMS,
    layout: "bar",
    menuIcon: <MenuIcon />,
    menuLabel: "Main menu",
  },
  render: (navProps) => (
    // Wide enough for all five, so there is **no menu button at
    // all** — a trigger that shows at every width is not a fold, it
    // is a nav somebody has permanently hidden.
    <Frame inlineSize="52rem">
      <Nav {...navProps} />
    </Frame>
  ),
}

/**
 * The four placed layouts side by side. `menu` is not here — it is a
 * panel that needs a trigger, and it has `Interactive` to itself.
 */
export const AllVariants: Story = {
  args: { items: STATION_ITEMS },
  render: (args) => (
    <div className="flex flex-col gap-8">
      <StorySection title="bar — a header row, with room">
        <Frame inlineSize="52rem">
          <Nav
            {...args}
            activeHref="/library"
            layout="bar"
          />
        </Frame>
      </StorySection>

      {/*
        The same bar and the same five destinations, in a box that
        cannot hold them. It folds WHOLE: `Toolbar` would leave two
        in the row and put three behind the button, which splits the
        product's own order across two places with no rule the
        reader can learn.
      */}
      <StorySection title="bar — the same five, folded">
        <Frame inlineSize="14rem">
          <Nav
            {...args}
            activeHref="/library"
            label="Main, folded"
            layout="bar"
            menuIcon={<MenuIcon />}
            menuLabel="Main menu"
          />
        </Frame>
      </StorySection>

      {/*
        The rail layouts take `NavRailItem[]`, so they are given the
        fixture directly rather than through `args` — spreading the
        story's args would widen `icon` back to optional and the
        three cells below would stop type-checking, which is the
        rule working rather than failing.
      */}
      <StoryGrid columns={3}>
        <StoryCell align="stretch" label="rail">
          <Nav
            activeHref="/library"
            items={STATION_ITEMS}
            label="Rail with labels"
            layout="rail"
          />
        </StoryCell>

        <StoryCell align="stretch" label="railIcons">
          <Nav
            activeHref="/library"
            items={STATION_ITEMS}
            label="Rail without labels"
            layout="railIcons"
          />
        </StoryCell>

        <StoryCell align="stretch" label="bottom">
          <Nav
            activeHref="/library"
            items={STATION_ITEMS}
            label="Bottom bar"
            layout="bottom"
          />
        </StoryCell>
      </StoryGrid>
    </div>
  ),
}

/**
 * Every state one item can be in, and the two that are easy to get
 * wrong are the last two.
 *
 * A **long label** must truncate rather than widen the column: a
 * flex item's automatic minimum is its content's min-content width,
 * so an untruncated destination name is the rail's floor.
 *
 * An **external** destination is never current, even while the app
 * sits at a path that looks like it. It is somebody else's origin.
 */
export const AllStates: Story = {
  args: { items: STATION_ITEMS },
  render: () => (
    <StoryGrid columns={2}>
      <StoryCell align="stretch" label="nothing current">
        <Nav
          items={STATION_ITEMS}
          label="Nothing current"
          layout="rail"
        />
      </StoryCell>

      <StoryCell align="stretch" label="current, exact">
        <Nav
          activeHref="/library"
          items={STATION_ITEMS}
          label="Current exact"
          layout="rail"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="current, one segment deeper"
      >
        <Nav
          activeHref="/library/a-flock-of-seagulls?sort=year"
          items={STATION_ITEMS}
          label="Current deeper"
          layout="rail"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="a long label, and one that leaves"
      >
        <Nav
          activeHref="/library"
          items={STATION_ITEMS_WITH_EXTERNAL}
          label="Long and external"
          layout="rail"
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * The three widths a rail-shaped nav takes, drawn at the sizes that
 * produce them rather than by resizing the window.
 *
 * `useNavLayout` is what picks between them in an app. Here they are
 * placed by hand, because the point of the board is to show all
 * three at once — which a hook keyed to the viewport cannot do.
 */
export const Responsive: Story = {
  args: { items: STATION_ITEMS },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      {[
        {
          inlineSize: "13rem",
          label: "≥ 64rem — rail",
          layout: "rail" as const,
        },
        {
          inlineSize: "4rem",
          label: "≥ 48rem — railIcons",
          layout: "railIcons" as const,
        },
        {
          inlineSize: "22rem",
          label: "< 48rem — bottom (or menu)",
          layout: "bottom" as const,
        },
      ].map((panel) => (
        <div
          className="flex flex-col gap-2"
          key={panel.label}
          style={{ inlineSize: panel.inlineSize }}
        >
          <span className="font-mono text-content-muted text-xs">
            {panel.label}
          </span>

          <div className="rounded-md border border-border-subtle bg-surface-raised p-2">
            <Nav
              activeHref="/library"
              items={STATION_ITEMS}
              label={panel.label}
              layout={panel.layout}
            />
          </div>
        </div>
      ))}
    </div>
  ),
}

/**
 * The Narrow View, and the whole keyboard path: Tab to the trigger,
 * Enter to open, Tab through real links, Escape to close.
 *
 * The trigger says **"Menu"** rather than carrying a bare hamburger,
 * for the reason `IconButton` exists — a glyph is not a name.
 */
export const Interactive: Story = {
  args: { items: STATION_ITEMS },
  render: () => {
    const NavMenuStory = () => {
      const [isVisible, setIsVisible] = useState(false)

      return (
        <Nav
          activeHref="/library"
          isVisible={isVisible}
          items={STATION_ITEMS_WITH_EXTERNAL}
          label="Main"
          layout="menu"
          onDismiss={() => {
            setIsVisible(false)
          }}
          trigger={
            <Button
              appearance="outline"
              intent="neutral"
              onClick={() => {
                setIsVisible((isOpen) => !isOpen)
              }}
            >
              Menu
            </Button>
          }
        />
      )
    }

    return <NavMenuStory />
  },
}
