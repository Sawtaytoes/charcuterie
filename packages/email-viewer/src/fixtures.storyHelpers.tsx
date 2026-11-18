import type { ThreadFrameMessage } from "./threadSrcDoc.ts"
import type {
  EmailAttachment,
  EmailDocument,
} from "./types.ts"

/*
 * Invented mail, shaped like the output of Mail Sifter's sanitizer: remote
 * images are PARKED on `data-ms-src` with `data-ms-blocked-image`, so no
 * story and no test ever fetches a remote address. The one picture that
 * renders is an inline `data:` image, which the frame's policy always
 * allows.
 */

/** A 2x1 blue-and-green PNG, inline, so it renders with no request. */
const INLINE_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGOI7v8578ICAAzyA/Iz2ScDAAAAAElFTkSuQmCC"

export const newsletter: EmailDocument = {
  fixedLayoutWidth: 600,
  html: `<style>.panel{background:#eef4ff;padding:16px;border-radius:8px}</style>
<table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#ffffff;font-family:Arial,sans-serif;color:#1f2937">
  <tr><td style="padding:24px 24px 8px"><img alt="Example Garden Club" width="160" height="40" data-ms-src="https://images.example.invalid/logo.png" data-ms-blocked-image=""></td></tr>
  <tr><td style="padding:8px 24px"><h1 style="margin:0;font-size:24px">Spring planting day</h1></td></tr>
  <tr><td style="padding:8px 24px"><img alt="" width="552" height="120" style="width:552px;height:120px" src="${INLINE_PIXEL}"></td></tr>
  <tr><td style="padding:8px 24px"><div class="panel">Bring gloves and a trowel. We meet at the north gate at nine.</div></td></tr>
  <tr><td style="padding:8px 24px 24px"><a href="https://example.org/rsvp">Reply to say you are coming</a></td></tr>
</table>`,
  text: null,
}

export const plainReply: EmailDocument = {
  fixedLayoutWidth: 0,
  html: null,
  text: "Hi Sam,\n\nThanks for the notes from Tuesday. I can take the second shift on Saturday, and I will bring the spare folding table.\n\nSee you then,\nAlex",
}

export const thread: ThreadFrameMessage[] = [
  {
    date: "2026-03-02T15:00:00Z",
    fromAddr: "alex@example.com",
    fromName: "Alex Rivera",
    html: null,
    isMine: false,
    isOpen: false,
    key: "t1",
    text: "Could you cover Saturday's second shift?",
  },
  {
    date: "2026-03-02T16:30:00Z",
    fromAddr: "me@example.com",
    html: null,
    isMine: true,
    isOpen: false,
    key: "t2",
    text: "Yes, I can. Do you need the folding table too?",
  },
  {
    date: "2026-03-03T09:10:00Z",
    fromAddr: "alex@example.com",
    fromName: "Alex Rivera",
    html: null,
    isMine: false,
    isOpen: true,
    key: "t3",
    text: "Please, if you still have it. Thank you!",
  },
]

export const attachments: EmailAttachment[] = [
  {
    contentType: "application/pdf",
    filename: "planting-map.pdf",
    key: 0,
    size: 482_133,
  },
  {
    contentType: "image/jpeg",
    filename: "north-gate.jpg",
    key: 1,
    size: 2_340_112,
  },
  {
    contentType: "text/calendar",
    filename: "invite.ics",
    key: 2,
    size: 912,
  },
]

/** The parked state needs no network; this is what "Load images" would flip. */
export const warnedNewsletterSafety = {
  blockedLinkCount: 1,
  isSenderTrustedForImages: false,
  links: [{ warning: "blocked-scheme" as const }],
  remoteImageCount: 1,
}
