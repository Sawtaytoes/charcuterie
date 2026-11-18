import type { ReactNode } from "react"

import { EmailAttachmentRow } from "./EmailAttachmentRow.tsx"
import type { EmailAttachment } from "./types.ts"

export type EmailAttachmentListProps = {
  /**
   * The message's attachments. Absent, `null`, or empty renders NOTHING —
   * not an empty heading, not a placeholder — so an app whose source does
   * not send attachment data yet can pass what it has.
   */
  attachments?: readonly EmailAttachment[] | null
  /** The glyph before each name. Charcuterie ships no icons; bring one. */
  icon?: ReactNode
  /**
   * Save one attachment. When it is absent the rows are a plain list with
   * no action, for an app that can name the files but has no safe download
   * route. A rejection is shown under its row.
   */
  onDownload?: (
    attachment: EmailAttachment,
  ) => Promise<void>
}

/**
 * A message's attachments, by name and size. One column in a narrow
 * container such as a side drawer, two from `cq-md`, three from `cq-xl` —
 * the column count comes from the CONTAINER's width, never the window's.
 */
export const EmailAttachmentList = ({
  attachments,
  icon = null,
  onDownload,
}: EmailAttachmentListProps) => {
  if (!attachments?.length) return null
  return (
    <div className="@container">
      <ul
        aria-label="Attachments"
        className="m-0 grid list-none grid-cols-1 gap-1 p-0 cq-md:grid-cols-2 cq-xl:grid-cols-3"
      >
        {attachments.map((attachment) => (
          <li className="min-w-0" key={attachment.key}>
            <EmailAttachmentRow
              attachment={attachment}
              icon={icon}
              onDownload={onDownload}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
