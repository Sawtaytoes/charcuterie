import type { Meta, StoryObj } from "@storybook/react"

import { toStoryChoice } from "../argTypes.storyHelpers.ts"
import { Header } from "../Header/Header.tsx"
import { Main } from "../Main/Main.tsx"
import { Shell } from "../Shell/Shell.tsx"
import {
  HeaderSchemeToggle,
  PageContent,
  RailDetail,
  RailNavigation,
} from "../shell.storyHelpers.tsx"
import { Rail } from "./Rail.tsx"

const meta = {
  title: "Components/Layout/Rail",
  component: Rail,
  parameters: { layout: "fullscreen" },
  argTypes: {
    landmark: toStoryChoice([
      "complementary",
      "navigation",
    ] as const),
    side: toStoryChoice(["start", "end"] as const),
  },
  args: {
    landmark: "complementary",
    side: "start",
  },
} satisfies Meta<typeof Rail>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The sections column. `landmark="navigation"` because that is
 * what it is, and `label` because a rail nobody can name is a
 * rail an agent cannot scope to — `getByRole("navigation", {
 * name: "Sections" })` is what distinguishes its "Settings" link
 * from the header's "Settings" button.
 */
export const Default: Story = {
  args: {
    label: "Sections",
    landmark: "navigation",
  },
  render: (railProps) => (
    <Shell>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Comic Ingest"
      />

      <Rail {...railProps}>
        <RailNavigation />
      </Rail>

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}

/**
 * Both sides at once, and both kinds of landmark: a `<nav>` at
 * the start for the app's sections, an `<aside>` at the end for
 * the selected thing's detail.
 *
 * Two rails is where the required `label` stops being pedantry.
 * Two unnamed landmarks of the same type are the same announcement
 * twice to a screen reader and two identical matches to an agent,
 * which is worse than one of them not existing.
 */
export const AllVariants: Story = {
  args: { label: "Sections", landmark: "navigation" },
  render: (railProps) => (
    <Shell>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Rip Deck"
      />

      <Rail {...railProps}>
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
 * **The collapse, and what it is not.** Narrow the window past
 * 48rem (`screen.md`): the rail stops being a column and becomes
 * a horizontally-scrolling strip above the content.
 *
 * It is the **same element**, restyled. The fleet's habit is to
 * render the whole thing twice behind `hidden` / `lg:hidden` —
 * mux-magic's `PageHeader` across two ~55-line blocks,
 * mail-sifter's `TriageQueue` again — which puts every control in
 * the DOM twice at every viewport. Count the links here at any
 * width and there are four.
 *
 * The strip scrolls itself rather than widening the page, which
 * is why twelve sections on a phone still leave
 * `document.documentElement.scrollWidth` where it was.
 */
export const Responsive: Story = {
  args: { label: "Sections", landmark: "navigation" },
  render: (railProps) => (
    <Shell>
      <Header heading="Twelve sections" />

      <Rail {...railProps}>
        {[
          "Queue",
          "Library",
          "Transfers",
          "Settings",
          "Devices",
          "Schedules",
          "Notifications",
          "Integrations",
          "Storage",
          "Diagnostics",
          "Backups",
          "About",
        ].map((section) => (
          <a
            className="whitespace-nowrap rounded-md px-3 py-2 text-content-secondary text-sm hover:bg-intent-neutral-surface hover:text-content-primary"
            href={`#${section.toLowerCase()}`}
            key={section}
          >
            {section}
          </a>
        ))}
      </Rail>

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}

/**
 * What an agent drives. The rail is a named landmark, so its
 * links are reachable *through* it — the same trick `Card`'s
 * heading plays for a bay's "Start" button.
 */
export const Interactive: Story = {
  args: { label: "Sections", landmark: "navigation" },
  render: (railProps) => (
    <Shell>
      <Header
        actions={<HeaderSchemeToggle />}
        heading="Rip Deck"
      />

      <Rail {...railProps}>
        <RailNavigation />
      </Rail>

      <Main>
        <PageContent />
      </Main>
    </Shell>
  ),
}
