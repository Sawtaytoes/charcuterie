import type { Meta, StoryObj } from "@storybook/react"

import { EmailAttachmentList } from "./EmailAttachmentList.tsx"
import { EmailImageNotice } from "./EmailImageNotice.tsx"
import {
  EmailViewer,
  type EmailViewerProps,
} from "./EmailViewer.tsx"
import {
  attachments,
  newsletter,
  plainReply,
  thread,
  warnedNewsletterSafety,
} from "./fixtures.storyHelpers.tsx"

/** A reading pane: a fixed height, so the frame has something to fill. */
const Pane = ({
  children,
  inlineSize,
}: {
  children: React.ReactNode
  inlineSize?: string
}) => (
  <div
    className="flex h-[30rem] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-sunken"
    style={{ inlineSize }}
  >
    {children}
  </div>
)

const Masthead = ({ subject }: { subject: string }) => (
  <div className="px-4 py-3">
    <h2 className="m-0 text-lg font-semibold text-content-primary">
      {subject}
    </h2>
    <p className="m-0 text-sm text-content-secondary">
      Example Garden Club · newsletter@example.org
    </p>
  </div>
)

const meta = {
  title: "Packages/EmailViewer",
  component: EmailViewer,
  parameters: { layout: "padded" },
  args: {
    hasLoadedImages: false,
    message: newsletter,
    title: "Message body: Spring planting day",
  },
  render: (args: EmailViewerProps) => (
    <Pane>
      <EmailViewer {...args} />
    </Pane>
  ),
} satisfies Meta<typeof EmailViewer>

export default meta

type Story = StoryObj<typeof meta>

/** A 600px newsletter on the app's page colour, with its masthead. */
export const Newsletter: Story = {
  args: {
    masthead: <Masthead subject="Spring planting day" />,
    pageBackground: "#e9ebef",
  },
}

/** The same newsletter in a pane narrower than it was designed for, scaled to fit. */
export const ScaledToFit: Story = {
  args: {
    isScaledToFit: true,
    masthead: <Masthead subject="Spring planting day" />,
  },
  render: (args) => (
    <Pane inlineSize="22rem">
      <EmailViewer {...args} />
    </Pane>
  ),
}

/** A plain-text reply: prose at a reading measure, in the app's face. */
export const PlainText: Story = {
  args: {
    masthead: <Masthead subject="Re: Saturday shifts" />,
    message: plainReply,
    title: "Message body: Re: Saturday shifts",
  },
}

/** The conversation around the open message, as one sandboxed document. */
export const Conversation: Story = {
  args: {
    masthead: <Masthead subject="Re: Saturday shifts" />,
    message: plainReply,
    thread: { hiddenCount: 0, messages: thread },
    title: "Conversation: Re: Saturday shifts",
  },
}

/** Faux dark mode: the light design inverted, pictures put back. */
export const Darkened: Story = {
  args: {
    isDarkened: true,
    masthead: <Masthead subject="Spring planting day" />,
    pageBackground: "#17181b",
  },
}

/**
 * Warned mail keeps its remote images parked, and the notice above the
 * pane offers to load them. The press does nothing here: the parked
 * image's address is invented, and a story never fetches a remote one.
 */
export const WarnedMail: Story = {
  render: (args) => (
    <Pane>
      <EmailImageNotice
        onLoadImages={() => undefined}
        remoteImageCount={
          warnedNewsletterSafety.remoteImageCount
        }
      />
      <EmailViewer {...args} />
    </Pane>
  ),
  args: {
    masthead: <Masthead subject="Spring planting day" />,
  },
}

/** Nothing to render yet: the placeholder takes the frame's place. */
export const Placeholder: Story = {
  args: {
    masthead: <Masthead subject="Spring planting day" />,
    message: null,
    placeholder: (
      <p className="m-0 p-6 text-center text-sm text-content-secondary">
        Fetching the message
      </p>
    ),
  },
}

/** The attachment list gains columns as its container widens. */
export const Attachments: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div style={{ inlineSize: "20rem" }}>
        <EmailAttachmentList attachments={attachments} />
      </div>
      <div style={{ inlineSize: "48rem" }}>
        <EmailAttachmentList
          attachments={attachments}
          onDownload={() => Promise.resolve()}
        />
      </div>
    </div>
  ),
}
