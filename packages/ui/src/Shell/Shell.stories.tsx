import type { Meta, StoryObj } from "@storybook/react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Header } from "../Header/Header.tsx"
import { Main } from "../Main/Main.tsx"
import { Rail } from "../Rail/Rail.tsx"
import {
  HeaderSchemeToggle,
  OverflowingContent,
  PageContent,
  RailDetail,
  RailNavigation,
} from "../shell.storyHelpers.tsx"
import { Shell } from "./Shell.tsx"

/**
 * `full` last, because it is the escape hatch rather than a step:
 * everything before it is a `screen.*` token, and an app reaching
 * for it is saying "this page is a wall of tiles", not picking a
 * slightly larger number.
 */
const CONTENT_WIDTH_OPTIONS = [
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "full",
] as const

const meta = {
  title: "Components/Layout/Shell",
  component: Shell,
  parameters: { layout: "fullscreen" },
  argTypes: {
    contentWidth: toStoryChoice(CONTENT_WIDTH_OPTIONS),
  },
  args: {
    contentWidth: "lg",
    skipLinkLabel: "Skip to main content",
  },
} satisfies Meta<typeof Shell>

export default meta

type Story = StoryObj<typeof meta>

/**
 * **Template 1 — header + main.** The shape eight of the fleet's
 * ten hand-rolled shells are, and the whole of what most apps
 * need. Copy it verbatim; only the contents of `actions` and
 * `Main` differ per app.
 */
export const Default: Story = {
  render: (shellProps) => (
    <Shell {...shellProps}>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Rip Deck"
      />

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}

/**
 * **Template 2 — header + a start rail.** The rail is the app's
 * sections, so it is `landmark="navigation"` and gets a name an
 * agent can scope to. Below `md` it becomes the strip above the
 * content — the same element, not a second copy.
 */
export const WithStartRail: Story = {
  render: (shellProps) => (
    <Shell {...shellProps}>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Comic Ingest"
      />

      <Rail label="Sections" landmark="navigation">
        <RailNavigation />
      </Rail>

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}

/**
 * **Template 3 — header + both rails.** Sections on one side,
 * the selected thing's detail on the other. Two rails is where
 * naming stops being optional: two unnamed landmarks of the same
 * type are indistinguishable to a screen reader and to an agent.
 */
export const WithBothRails: Story = {
  render: (shellProps) => (
    <Shell {...shellProps}>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Rip Deck"
      />

      <Rail label="Sections" landmark="navigation">
        <RailNavigation />
      </Rail>

      <Main>
        <PageContent />
      </Main>

      <Rail label="Job detail" side="end">
        <RailDetail />
      </Rail>
    </Shell>
  ),
}

/**
 * The one the tests point a 390px viewport at.
 *
 * Both rails, plus the two shapes of content that make a page
 * scroll sideways: an unbroken 130-character path, and a table
 * wider than the phone it is on. Plex Channels' narrow view
 * scrolls left and right today for the first reason; the second
 * is what an `overflow-wrap` alone cannot save.
 *
 * `document.documentElement.scrollWidth <= clientWidth` at 390px
 * is the assertion, and it is in `Shell.test.tsx` rather than
 * here — a story is a demo.
 */
export const Responsive: Story = {
  render: (shellProps) => (
    <Shell {...shellProps}>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Transfers"
      />

      <Rail label="Sections" landmark="navigation">
        <RailNavigation />
      </Rail>

      <Main>
        <OverflowingContent />
      </Main>

      <Rail label="Job detail" side="end">
        <RailDetail />
      </Rail>
    </Shell>
  ),
}

/**
 * What a keyboard user meets first. Tab once: the skip link
 * appears at the top of the page and lands focus **inside**
 * `<main>`, past the header and the rail.
 *
 * None of the fleet's ten hand-rolled shells has one, so on every
 * one of those apps the first Tab starts a walk through the
 * header — every page, every navigation.
 */
export const Interactive: Story = {
  render: (shellProps) => (
    <Shell {...shellProps}>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Rip Deck"
      />

      <Rail label="Sections" landmark="navigation">
        <RailNavigation />
      </Rail>

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}
