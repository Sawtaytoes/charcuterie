import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import {
  StoryCell,
  StoryGrid,
  StorySection,
} from "../board.storyHelpers.tsx"
import { RouterLinkProvider } from "../RouterLink/RouterLinkProvider.tsx"
import type { RouterLinkProps } from "../RouterLink/routerLink.ts"
import { MarkdownLine } from "./MarkdownLine.tsx"

/**
 * A stand-in for react-router's `<Link>`, the same one
 * `TextLink.stories.tsx` uses. The marker attribute is how the
 * boards show which destinations the injected router was handed and
 * which went straight to the platform.
 */
const SoftRouterLink = ({
  href,
  ...linkProps
}: RouterLinkProps): ReactNode => (
  <a {...linkProps} data-router="soft" href={href} />
)

/**
 * Task names, invented. Every string in this file is fixture data —
 * this package is published, and a screenshot of a story is not
 * greppable by anybody checking for household detail later.
 */
const CARD_TITLES = [
  String.raw`Ingest 53 movies from \`Downloads/MOVIES\` into \`G:\Movies\``.replaceAll(
    String.raw`\``,
    "`",
  ),
  "**Urgent:** the rack fans are running at 100%",
  "Re-tag the *Halloween* playlist before October",
  "~~Buy a second spool~~ — arrived Tuesday",
  "Run ingest_the_files.sh nightly, not hourly",
]

const meta = {
  title: "Components/Content/MarkdownLine",
  component: MarkdownLine,
  parameters: { layout: "padded" },
  args: {
    value: CARD_TITLES[0] ?? "",
  },
} satisfies Meta<typeof MarkdownLine>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/**
 * The four marks, each in the shape a title actually uses it for.
 * Code is the one that earns its place most often — an agent-written
 * task name is a third file paths by volume.
 */
export const AllMarks: Story = {
  render: () => (
    <StorySection title="Inline marks only. A heading, a list marker and a table pipe are literal characters here.">
      <StoryGrid columns={2}>
        <StoryCell label="code">
          <MarkdownLine value={CARD_TITLES[0] ?? ""} />
        </StoryCell>

        <StoryCell label="strong">
          <MarkdownLine value={CARD_TITLES[1] ?? ""} />
        </StoryCell>

        <StoryCell label="emphasis">
          <MarkdownLine value={CARD_TITLES[2] ?? ""} />
        </StoryCell>

        <StoryCell label="strikethrough">
          <MarkdownLine value={CARD_TITLES[3] ?? ""} />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * WHY THE MARKS ARE WORTH HAVING AT ALL.
 *
 * Five names in one flat weight against the same five with their
 * marks drawn. The argument is not decoration: in the flat column
 * the eye has to read every title to the end to tell two of them
 * apart, and in the marked one the part that *differs* is the part
 * that is drawn differently.
 */
export const WhyItHelps: Story = {
  render: () => (
    <StorySection title="The same five task names, as source and as a line.">
      <StoryGrid columns={2}>
        <StoryCell align="stretch" label="raw markdown">
          <ul className="flex flex-col gap-2 text-content-primary text-md">
            {CARD_TITLES.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </StoryCell>

        <StoryCell align="stretch" label="MarkdownLine">
          <ul className="flex flex-col gap-2 text-content-primary text-md">
            {CARD_TITLES.map((title) => (
              <li key={title}>
                <MarkdownLine value={title} />
              </li>
            ))}
          </ul>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * A file name is the case this component is most often asked to get
 * *wrong*. `ingest_the_files.sh` has two underscores and is not
 * italic, because CommonMark's flanking rules say an underscore
 * inside a word opens nothing — and a Windows path keeps its
 * backslashes.
 */
export const FileNames: Story = {
  render: () => (
    <StorySection title="Markup that is not markup. None of these lines has a mark in it.">
      <StoryGrid columns={1}>
        <StoryCell align="stretch" label="left alone">
          <ul className="flex flex-col gap-2 font-mono text-content-primary text-sm">
            <li>
              <MarkdownLine value="Run ingest_the_files.sh nightly" />
            </li>

            <li>
              <MarkdownLine
                value={String.raw`Copy to G:\Movies\Kids`}
              />
            </li>

            <li>
              <MarkdownLine value="2 * 3 * 4 is twenty-four" />
            </li>

            <li>
              <MarkdownLine value="# 4 in the queue" />
            </li>
          </ul>
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * THE `href` CASE, and the one that is easy to get wrong.
 *
 * A card title is usually a link to the card. When the title also
 * *contains* a link, `href` makes the component emit siblings —
 * plain runs anchored to the card, the markdown link anchored to its
 * own destination. Nesting them would be invalid HTML, and the
 * browser would silently drop the second half of the card's link.
 */
export const AsALink: Story = {
  render: () => (
    <StorySection title="`href` anchors the plain text. A link inside the line keeps its own destination.">
      <StoryGrid columns={1}>
        <StoryCell
          align="stretch"
          label="the whole line opens the task"
        >
          <MarkdownLine
            href="/tasks/7"
            value="Ingest **53** movies overnight"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="two destinations, three sibling anchors"
        >
          <MarkdownLine
            href="/tasks/7"
            value="Ship [#53](https://example.invalid/pulls/53) tonight"
          />
        </StoryCell>

        <StoryCell
          align="stretch"
          label="no href — only the markdown link is clickable"
        >
          <MarkdownLine value="Ship [#53](https://example.invalid/pulls/53) tonight" />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * With a router injected, an in-app destination goes through it and
 * an off-origin one does not — `data-router="soft"` marks the ones
 * the router was handed. Off-origin links open in a new tab, because
 * a title that names a pull request is a reference and following it
 * should not lose the board the reader was on.
 */
export const Routed: Story = {
  decorators: [
    (Story) => (
      <RouterLinkProvider link={SoftRouterLink}>
        <Story />
      </RouterLinkProvider>
    ),
  ],
  render: () => (
    <StorySection title="The injected router gets `/tasks/7`. It never gets the pull request.">
      <StoryGrid columns={1}>
        <StoryCell
          align="stretch"
          label="routed and unrouted, in one line"
        >
          <MarkdownLine
            href="/tasks/7"
            value="Ship [#53](https://example.invalid/pulls/53) tonight"
          />
        </StoryCell>
      </StoryGrid>
    </StorySection>
  ),
}

/**
 * A URL whose scheme is not on `safeUrls.ts`'s allowlist keeps
 * **every character of its source** and becomes no link at all. A
 * reader who can see the trap is better served than one shown a
 * confident blue word that silently refuses to work.
 */
/**
 * A whole card title as one link, with a code span inside it — the
 * shape Docket's backlog rows and board cards are.
 *
 * It exists so a test can assert the link's **accessible name**,
 * which is where a mark's surrounding spaces go missing without
 * anything on screen changing.
 */
export const TitleAsALink: Story = {
  render: () => (
    <MarkdownLine
      href="/tasks/7"
      value="Ingest 53 movies from `Downloads/MOVIES` tonight"
    />
  ),
}

/**
 * INSIDE A WHOLE-CARD LINK.
 *
 * The card is the link — middle-click opens it, like anything else
 * on the web — so the line inside it emits no anchor of its own. The
 * marks still draw; a markdown link's text still reads; nothing
 * inside navigates separately.
 *
 * The bare URL is the case that makes this a prop rather than a
 * convention. It autolinks, so a captured note ending in a URL would
 * nest an anchor without anybody having typed `[]()`.
 */
export const InsideACardLink: Story = {
  render: () => (
    <a
      className="block max-w-sm rounded-lg border border-border-subtle bg-surface-raised p-3 hover:bg-surface-sunken"
      href="/triage/7"
    >
      <MarkdownLine
        className="block font-medium text-content-primary"
        isInsideLink
        value="Ingest 53 movies from `Downloads/MOVIES` — https://example.invalid/list"
      />

      <span className="mt-1 block text-content-secondary text-sm">
        Filed from the capture inbox
      </span>
    </a>
  ),
}

export const RefusedUrl: Story = {
  args: { value: "[click me](javascript:alert(1))" },
}
