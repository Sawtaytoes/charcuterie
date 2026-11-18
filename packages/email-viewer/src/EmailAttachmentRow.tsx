import { type ReactNode, useState } from "react"

import { formatBytes } from "./formatBytes.ts"
import type { EmailAttachment } from "./types.ts"

const ROW =
  "flex w-full items-center gap-2 rounded-lg border border-border-default bg-surface-sunken px-2 py-1.5 text-start text-[0.8125rem]/[1.4] text-content-secondary"

/** The icon, the name, and the size line — shared by both row shapes. */
const rowBody = (
  attachment: EmailAttachment,
  icon: ReactNode,
  isSaving: boolean,
): ReactNode => (
  <>
    {icon ? (
      <span className="shrink-0 text-content-muted">
        {icon}
      </span>
    ) : null}
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium text-content-primary">
        {attachment.filename}
      </span>
      <span className="block text-content-muted">
        {isSaving
          ? "Fetching…"
          : formatBytes(attachment.size)}
      </span>
    </span>
  </>
)

/**
 * One attachment. A BUTTON, not a link, when it can be saved: an app that
 * authenticates on request headers cannot serve a file to a plain
 * `<a href download>`, which starts a fresh navigation that carries none of
 * them. The download handler makes the signed request itself.
 */
export const EmailAttachmentRow = ({
  attachment,
  icon,
  onDownload,
}: {
  attachment: EmailAttachment
  icon: ReactNode
  onDownload?: (
    attachment: EmailAttachment,
  ) => Promise<void>
}) => {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!onDownload) {
    return (
      <div
        className={ROW}
        title={attachment.contentType ?? undefined}
      >
        {rowBody(attachment, icon, false)}
      </div>
    )
  }

  const save = () => {
    if (isSaving) return
    setIsSaving(true)
    setError(null)
    onDownload(attachment)
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "the download did not start",
        )
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  return (
    <>
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        className={`${ROW} cursor-pointer hover:border-border-strong hover:bg-surface-hover disabled:cursor-progress`}
      >
        {rowBody(attachment, icon, isSaving)}
      </button>
      {error ? (
        <p className="m-0 px-2 pt-1 text-[0.8125rem]/[1.4] text-intent-danger-content">
          Could not download it: {error}
        </p>
      ) : null}
    </>
  )
}
