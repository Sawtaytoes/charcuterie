import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import {
  controlSizeArgType,
  intentArgType,
} from "../argTypes.storyHelpers.ts"
import { Button } from "../Button/Button.tsx"
import {
  ContainerBoard,
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  ArrowRightIcon,
  ExternalIcon,
} from "../icons.storyHelpers.tsx"
import type { IntentAppearance } from "../intentStyles.ts"
import { RouterLinkProvider } from "../RouterLink/RouterLinkProvider.tsx"
import type { RouterLinkProps } from "../RouterLink/routerLink.ts"
import { ButtonLink } from "./ButtonLink.tsx"

/**
 * A stand-in for react-router's `<Link>` — the marker attribute is
 * how the board (and `ButtonLink.test.tsx`) shows which destinations
 * the injected router was handed.
 */
const SoftRouterLink = ({
  href,
  ...linkProps
}: RouterLinkProps): ReactNode => (
  <a {...linkProps} data-router="soft" href={href} />
)

const INTENTS = [
  "neutral",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const

const APPEARANCES: IntentAppearance[] = [
  "solid",
  "soft",
  "outline",
  "ghost",
]

const meta = {
  title: "Components/ButtonLink",
  component: ButtonLink,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
    size: controlSizeArgType,
  },
  // The component's own defaults, restated. Storybook has not
  // seeded `args` from a docgen `defaultValue` since v7, so without
  // this the props table prints `"solid"` in the Default column
  // while the radio beside it has nothing selected.
  args: {
    appearance: "solid",
    href: "/channels/settings",
    intent: "accent",
    isDisabled: false,
    isExternal: false,
    isFullWidth: false,
    size: "md",
  },
} satisfies Meta<typeof ButtonLink>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "Configure" },
}

/**
 * The claim this component exists to make, side by side: a
 * `ButtonLink` and a `Button` with identical visual props are the
 * same pixels, and one of them is an `<a href>`.
 *
 * `ButtonLink.test.tsx` compares their computed styles rather than
 * trusting this board — but the board is where a human sees it.
 */
export const BesideAButton: Story = {
  args: { children: "Configure" },
  render: (buttonLinkProps) => (
    <StorySection title="Same paint, different element. Middle-click the left one and it opens a tab; middle-click the right one and nothing happens.">
      <StoryRow>
        <StoryCell label="ButtonLink — an <a href>">
          <ButtonLink {...buttonLinkProps} />
        </StoryCell>

        <StoryCell label="Button — a <button>">
          <Button
            appearance={buttonLinkProps.appearance}
            intent={buttonLinkProps.intent}
            size={buttonLinkProps.size}
          >
            Configure
          </Button>
        </StoryCell>
      </StoryRow>
    </StorySection>
  ),
}

export const AllVariants: Story = {
  args: { children: "Configure" },
  render: (buttonLinkProps) => (
    <StorySection title="Six intents x four appearances — the same maps Button indexes, because they are the same maps.">
      <StoryGrid columns={4}>
        {APPEARANCES.flatMap((appearance) =>
          INTENTS.map((intent) => (
            <StoryCell
              key={`${appearance}-${intent}`}
              label={`${appearance} · ${intent}`}
            >
              <ButtonLink
                {...buttonLinkProps}
                appearance={appearance}
                intent={intent}
              >
                {intent}
              </ButtonLink>
            </StoryCell>
          )),
        )}
      </StoryGrid>
    </StorySection>
  ),
}

export const AllSizes: Story = {
  args: { children: "Configure" },
  render: (buttonLinkProps) => (
    <StorySection title="Sizes come from the density axis — flip Density in the toolbar and every one of these changes with no prop change and no re-render.">
      <StoryRow>
        <ButtonLink {...buttonLinkProps} size="sm">
          Small
        </ButtonLink>

        <ButtonLink {...buttonLinkProps} size="md">
          Medium
        </ButtonLink>

        <ButtonLink {...buttonLinkProps} size="lg">
          Large
        </ButtonLink>
      </StoryRow>
    </StorySection>
  ),
}

/**
 * Hover, active, and focus are real here, not simulated: the
 * pseudo-states addon forces them, which is the only way to review a
 * hover colour in a static board.
 *
 * There is no `loading` cell, and that is the design: a navigation has
 * no pending state this component owns.
 */
export const AllStates: Story = {
  args: { children: "Configure" },
  parameters: {
    pseudo: {
      active: ["#active"],
      focusVisible: ["#focus-target"],
      hover: ["#hover"],
    },
  },
  render: (buttonLinkProps) => (
    <StoryGrid columns={3}>
      <StoryCell label="default">
        <ButtonLink {...buttonLinkProps} />
      </StoryCell>

      <StoryCell label="hover (forced)">
        <ButtonLink {...buttonLinkProps} id="hover" />
      </StoryCell>

      <StoryCell label="active (forced)">
        <ButtonLink {...buttonLinkProps} id="active" />
      </StoryCell>

      <StoryCell label="focus-visible (forced)">
        <ButtonLink
          {...buttonLinkProps}
          id="focus-target"
        />
      </StoryCell>

      <StoryCell label="disabled">
        <ButtonLink {...buttonLinkProps} isDisabled />
      </StoryCell>

      <StoryCell label="with an iconEnd">
        <ButtonLink
          {...buttonLinkProps}
          iconEnd={<ArrowRightIcon />}
        />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * Plex Channels' actual control. It reads as the primary action on the
 * card and it goes to another page, so it is an `<a>` — today it is a
 * `<button onClick={() => navigate("#/settings")}>`, which cannot be
 * middle-clicked, ctrl-clicked, opened in a new tab, or copied.
 */
export const ConfigureCard: Story = {
  args: {
    children: "Configure",
    href: "/channels/settings",
    iconEnd: <ArrowRightIcon />,
  },
}

export const External: Story = {
  args: {
    children: "Open MakeMKV docs",
    href: "https://makemkv.com/developers",
    iconEnd: <ExternalIcon />,
    isExternal: true,
  },
}

/**
 * The seam. An in-app path renders through the injected router
 * component; an external URL falls back to a plain `<a>`, because a
 * router pushing `https://…` onto its history stack lands the SPA on
 * a route that does not exist.
 */
export const Routed: Story = {
  args: { children: "Configure" },
  decorators: [
    (Story) => (
      <RouterLinkProvider link={SoftRouterLink}>
        <Story />
      </RouterLinkProvider>
    ),
  ],
  render: (buttonLinkProps) => (
    <StoryRow>
      <ButtonLink
        {...buttonLinkProps}
        href="/channels/settings"
      >
        Routed to /channels/settings
      </ButtonLink>

      <ButtonLink
        {...buttonLinkProps}
        appearance="outline"
        href="https://makemkv.com/developers"
        iconEnd={<ExternalIcon />}
        isExternal
      >
        External to makemkv.com
      </ButtonLink>
    </StoryRow>
  ),
}

export const Responsive: Story = {
  args: { children: "Configure", isFullWidth: true },
  render: (buttonLinkProps) => (
    <ContainerBoard>
      <ButtonLink {...buttonLinkProps} />
    </ContainerBoard>
  ),
}
