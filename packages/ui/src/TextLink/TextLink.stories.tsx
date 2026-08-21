import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import { intentArgType } from "../argTypes.storyHelpers.ts"
import {
  StoryCell,
  StoryGrid,
  StoryRow,
  StorySection,
} from "../board.storyHelpers.tsx"
import {
  ArrowLeftIcon,
  ExternalIcon,
} from "../icons.storyHelpers.tsx"
import { RouterLinkProvider } from "../RouterLink/RouterLinkProvider.tsx"
import type { RouterLinkProps } from "../RouterLink/routerLink.ts"
import { TextLink } from "./TextLink.tsx"

/**
 * A stand-in for react-router's `<Link>` — the marker attribute is
 * how the boards (and `TextLink.test.tsx`) show which destinations
 * the injected router was handed and which ones went straight to the
 * platform.
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

const meta = {
  title: "Components/Actions/TextLink",
  component: TextLink,
  parameters: { layout: "padded" },
  argTypes: {
    intent: intentArgType,
  },
  // The component's own defaults, restated. Storybook has not
  // seeded `args` from a docgen `defaultValue` since v7, so without
  // this the props table prints `"inline"` in the Default column
  // while the radio beside it has nothing selected.
  args: {
    appearance: "inline",
    href: "/library",
    intent: "accent",
    isDisabled: false,
    isExternal: false,
  },
} satisfies Meta<typeof TextLink>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: "the rip queue" },
}

/**
 * The two modes, in the layouts that tell them apart — an inline link
 * has to be seen *inside* a sentence, and a standalone one has to be
 * seen on its own line with an icon beside it.
 */
export const AllAppearances: Story = {
  args: { children: "the rip queue" },
  render: (linkProps) => (
    <StorySection title="Inline lives in a sentence and stays underlined. Standalone is its own element and underlines on hover.">
      <StoryGrid columns={2}>
        <StoryCell label="inline">
          <p className="max-w-prose text-content-secondary text-md">
            Discs land in{" "}
            <TextLink {...linkProps} appearance="inline" />{" "}
            as soon as the drive reports them, and stay
            there until a profile finishes.
          </p>
        </StoryCell>

        <StoryCell label="standalone">
          <TextLink
            {...linkProps}
            appearance="standalone"
            iconStart={<ArrowLeftIcon />}
          >
            Back to all discs
          </TextLink>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * The back-link seven repos hand-roll, each with its own `←`, its own
 * hover rule, and its own idea of whether focus is visible.
 *
 * The glyph is still the app's — the library ships no icons — but the
 * anchor, the focus ring, and the hover are the same three everywhere
 * now.
 */
export const BackLink: Story = {
  args: {
    appearance: "standalone",
    children: "Back to all discs",
    href: "/discs",
    iconStart: <ArrowLeftIcon />,
  },
}

export const AllIntents: Story = {
  args: { children: "the rip queue" },
  render: (linkProps) => (
    <StorySection title="Six intents. Navigation is almost always accent or neutral — danger belongs on a Button, because deleting is an action.">
      <StoryGrid columns={3}>
        {INTENTS.map((intent) => (
          <StoryCell key={intent} label={intent}>
            <TextLink {...linkProps} intent={intent}>
              {intent}
            </TextLink>
          </StoryCell>
        ))}
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * Hover, focus, and the disabled treatment, forced by the
 * pseudo-states addon rather than driven — a board that has to be
 * *driven* to show its states is a test wearing a demo's clothes.
 */
export const AllStates: Story = {
  args: { children: "the rip queue" },
  parameters: {
    pseudo: {
      focusVisible: ["#focus-target"],
      hover: ["#hover-inline", "#hover-standalone"],
    },
  },
  render: (linkProps) => (
    <StoryGrid columns={3}>
      <StoryCell label="inline">
        <TextLink {...linkProps} />
      </StoryCell>

      <StoryCell label="inline · hover (forced)">
        <TextLink {...linkProps} id="hover-inline" />
      </StoryCell>

      <StoryCell label="inline · focus-visible (forced)">
        <TextLink {...linkProps} id="focus-target" />
      </StoryCell>

      <StoryCell label="standalone">
        <TextLink {...linkProps} appearance="standalone" />
      </StoryCell>

      <StoryCell label="standalone · hover (forced)">
        <TextLink
          {...linkProps}
          appearance="standalone"
          id="hover-standalone"
        />
      </StoryCell>

      <StoryCell label="disabled">
        <TextLink {...linkProps} isDisabled />
      </StoryCell>
    </StoryGrid>
  ),
}

/**
 * `isExternal` is three things at once: `target="_blank"`,
 * `rel="noopener noreferrer"`, and a visually-hidden *"(opens in a
 * new tab)"* so the surprise is announced rather than only
 * discovered.
 *
 * The `↗` is the app's, passed as `iconEnd` — the fleet's existing
 * convention, and the library ships no glyphs.
 */
export const External: Story = {
  args: {
    children: "the MakeMKV forum thread",
    href: "https://forum.makemkv.com",
    iconEnd: <ExternalIcon />,
    isExternal: true,
  },
}

/**
 * The seam, and the three destinations it deliberately does **not**
 * take.
 *
 * With a `RouterLinkProvider` at the root, an in-app path renders
 * through the injected component and navigates softly. An external
 * URL and a same-page fragment fall back to a plain `<a>` — a router
 * pushing `https://…` onto its history stack lands the SPA on a route
 * that does not exist, and `#credits` is the browser's own
 * scroll-to-id, not a route change.
 */
export const Routed: Story = {
  args: { appearance: "standalone" },
  decorators: [
    (Story) => (
      <RouterLinkProvider link={SoftRouterLink}>
        <Story />
      </RouterLinkProvider>
    ),
  ],
  render: (linkProps) => (
    <StorySection title="Injected router on the left; the two the seam hands back to the platform on the right.">
      <StoryRow>
        <TextLink {...linkProps} href="/library">
          Routed to /library
        </TextLink>

        <TextLink
          {...linkProps}
          href="https://forum.makemkv.com"
          iconEnd={<ExternalIcon />}
          isExternal
        >
          External to makemkv.com
        </TextLink>

        <TextLink {...linkProps} href="#credits">
          Fragment to #credits
        </TextLink>
      </StoryRow>
    </StorySection>
  ),
}

export const InProse: Story = {
  args: { children: "the rip queue" },
  render: (linkProps) => (
    <StorySection title="An inline link inherits the type it sits in and wraps with it — the reason it is not an inline-flex box.">
      <StoryRow>
        <p className="max-w-[18rem] text-content-secondary text-sm">
          A long paragraph, set small, in which{" "}
          <TextLink {...linkProps}>
            a link long enough to wrap across two lines
          </TextLink>{" "}
          keeps its underline on both of them and never
          takes the line height with it.
        </p>
      </StoryRow>
    </StorySection>
  ),
}
