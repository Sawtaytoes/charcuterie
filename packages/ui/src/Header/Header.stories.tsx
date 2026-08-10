import type { Meta, StoryObj } from "@storybook/react"

import { Badge } from "../Badge/Badge.tsx"
import { Button } from "../Button/Button.tsx"
import {
  StoryCell,
  StorySection,
} from "../board.storyHelpers.tsx"
import { Main } from "../Main/Main.tsx"
import { Shell } from "../Shell/Shell.tsx"
import {
  HeaderSchemeToggle,
  PageContent,
  ScrollFiller,
} from "../shell.storyHelpers.tsx"
import { Header } from "./Header.tsx"

const meta = {
  title: "Components/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
  argTypes: {
    headingLevel: {
      control: { type: "radio" },
      options: [1, 2],
    },
  },
  args: {
    headingLevel: 1,
    isSticky: true,
  },
} satisfies Meta<typeof Header>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The fleet's header, as one component: the app's name, the
 * controls that belong to the frame, a real `<header>` landmark,
 * and a fill that is `surface-raised` rather than the page's own
 * colour.
 */
export const Default: Story = {
  args: { heading: "Rip Deck" },
  render: (headerProps) => (
    <Shell>
      <Header
        {...headerProps}
        actions={<HeaderSchemeToggle />}
      />

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}

/**
 * The three slots, in the order they render: the heading, the
 * middle (`children` — a search field, a breadcrumb, a status
 * pill), and `actions`, which is pushed to the far end.
 *
 * Every one is optional. A header with only actions is the
 * image-viewer's `TitleBar`; a header with only a heading is
 * board-games'.
 */
export const AllStates: Story = {
  render: (headerProps) => (
    <StorySection title="Ten repos hand-roll this row. These are the four shapes they hand-roll it into.">
      <StoryCell align="stretch" label="heading only">
        <Header {...headerProps} heading="Board Games" />
      </StoryCell>

      <StoryCell align="stretch" label="heading + actions">
        <Header
          {...headerProps}
          actions={<HeaderSchemeToggle />}
          heading="Points Market"
        />
      </StoryCell>

      <StoryCell
        align="stretch"
        label="heading + middle + actions"
      >
        <Header
          {...headerProps}
          actions={<HeaderSchemeToggle />}
          heading="Mail Sifter"
        >
          <Badge intent="info">412 unread</Badge>
        </Header>
      </StoryCell>

      <StoryCell align="stretch" label="actions only">
        <Header {...headerProps}>
          <Button appearance="ghost" size="sm">
            Open
          </Button>
        </Header>
      </StoryCell>
    </StorySection>
  ),
}

/**
 * **`isSticky` sets `position` and `z-index` together, and that
 * is the point.** mux-magic's `PageHeader` is documented as a
 * sticky header and sets only the z-index, so it scrolls away
 * like any other block — valid CSS, stated intent, no effect.
 *
 * Scroll the panel below. The z-index is `--layer-sticky` (100)
 * from the token scale, so a `Menu` opened from the header — at
 * `--layer-modal` (400) — still paints over it.
 */
export const AllVariants: Story = {
  render: (headerProps) => (
    <div className="h-96 overflow-y-auto border border-border-subtle">
      <Shell>
        <Header
          {...headerProps}
          actions={<HeaderSchemeToggle />}
          heading="Scroll me"
        />

        <Main>
          <PageContent />

          <ScrollFiller />
        </Main>
      </Shell>
    </div>
  ),
}

/**
 * `isSticky={false}` — the header scrolls away with the page, and
 * takes its z-index with it rather than leaving a stacking
 * context nobody asked for. board-games' `AppShell.tsx` is this
 * one: the same structure as mail-sifter's and points-market's,
 * minus `sticky`.
 */
export const NotSticky: Story = {
  args: { heading: "Board Games", isSticky: false },
  render: (headerProps) => (
    <div className="h-96 overflow-y-auto border border-border-subtle">
      <Shell>
        <Header
          {...headerProps}
          actions={<HeaderSchemeToggle />}
        />

        <Main>
          <PageContent />

          <ScrollFiller />
        </Main>
      </Shell>
    </div>
  ),
}

/**
 * The width contract. **The `<header>` is full-bleed and only its
 * inner row is capped**, which is what stops a constrained header
 * from looking like a floating island on an ultrawide — and the
 * cap it uses is `Shell`'s, so the title always sits directly
 * above the content it names.
 *
 * points-market is the app where those two disagree: its header
 * row is capped at 80rem and its `<main>` is not capped at all.
 */
export const Responsive: Story = {
  render: (headerProps) => (
    <Shell contentWidth="sm">
      <Header
        {...headerProps}
        actions={<HeaderSchemeToggle />}
        heading="Narrow by contract"
      />

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}

/**
 * What an agent reaches for. The header is a landmark, so
 * `getByRole("banner")` scopes every query inside it — which is
 * how one of the three "Settings" buttons on a page becomes
 * addressable.
 */
export const Interactive: Story = {
  args: { heading: "Rip Deck" },
  render: (headerProps) => (
    <Shell>
      <Header
        {...headerProps}
        actions={
          <>
            <Button appearance="outline" size="sm">
              Settings
            </Button>

            <HeaderSchemeToggle />
          </>
        }
      />

      <Main>
        <Button appearance="outline" size="sm">
          Settings
        </Button>
      </Main>
    </Shell>
  ),
}
