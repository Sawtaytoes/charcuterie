/**
 * The shapes the viewer reads. They are Mail Sifter's reader wire
 * format (`GET /api/items/:id/body`), named here so any app that
 * shows Mail Sifter's mail — Mail Sifter itself, or Starchart through
 * its own server — hands the viewer the same fields.
 *
 * The HTML is **already sanitized** by Mail Sifter's server
 * (`sanitize-html` plus its annotator). The viewer is the second wall:
 * a sandboxed frame with no `allow-same-origin` and a
 * `default-src 'none'` policy. It never sanitizes, and it must never
 * be handed HTML that did not come through that sanitizer.
 */

/** Why the sanitizer flagged a link. */
export type EmailLinkWarning =
  /** Scheme is not http/https/mailto/tel. */
  | "blocked-scheme"
  /** Visible text names a domain that is not where the href goes. */
  | "text-host-mismatch"

/** One link the sanitizer judged. */
export type EmailLink = {
  /** The anchor's visible text, collapsed to one line and truncated. */
  text: string
  /** The href as it will be navigated. Empty when the scheme was blocked. */
  href: string
  /** Real destination host, or "" for mailto/tel/blocked. */
  host: string
  /** The domain the anchor text claims to go to, when it names one. */
  claimedHost?: string
  warning: EmailLinkWarning | null
}

/** The part of a message body the frame renders. */
export type EmailDocument = {
  /** Sanitized, with remote images parked on `data-ms-src`. */
  html: string | null
  text: string | null
  /** Widest fixed pixel width the message declares, or 0. A floor, not a target. */
  fixedLayoutWidth: number
}

/** What the remote-image policy reads. */
export type EmailImageSafety = {
  blockedLinkCount: number
  /** The sender is trusted for images in the owning app. */
  isSenderTrustedForImages: boolean
  links: readonly Pick<EmailLink, "warning">[]
  remoteImageCount: number
}

/**
 * One attachment, as the list shows it. `key` is any value stable
 * within one message — Mail Sifter's attachment `index`.
 */
export type EmailAttachment = {
  key: string | number
  filename: string
  /** Size in bytes of the decoded part. */
  size: number
  /** The declared MIME type. Shown only; never trusted for serving. */
  contentType?: string | null
}
