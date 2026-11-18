/**
 * The conversation, as one document.
 *
 * **Why one document and not one frame per message.** An iframe cannot size
 * itself to its content without help from inside the frame.
 * A transcript built from N frames would therefore be N boxes of a height
 * somebody guessed. So the whole conversation is rendered into a single
 * sandboxed document, and the app's own chrome (the bubbles, the headers, the
 * band) is part of that document rather than of the app's DOM. That also keeps
 * the standing rule intact: an email body is never rendered in the app's DOM.
 *
 * **Collapsing needs no script.** `<details>`/`<summary>` is native. The collapsed
 * preview lives *inside* the `<summary>`, because a closed `<details>` renders
 * its summary and nothing else, and is hidden again when open.
 *
 * **One sender's CSS must not restyle another's.** Two messages in one document
 * means two `<style>` blocks in one document, and a newsletter's `* { }` would
 * reach every message above it. Each message's blocks are therefore wrapped in
 * `@scope (#ms-msg-<n>)`, which confines them to that message's own subtree.
 * The owner chose this over the simpler "drop `<style>` from every message
 * except the open one", because it keeps each message looking like itself.
 */

import { markEmoji } from "./markEmoji.ts"
import {
  fontFaceCss,
  MESSAGE_FONT_STACK,
  messageCsp,
  pinColorScheme,
  withRemoteImages,
} from "./srcDoc.ts"

/**
 * The transcript gets one app-authored capability beyond a single-message
 * frame: it reports which turn crosses the reading line, and accepts a request
 * to scroll to a numbered turn. Like the single-message observer, it also
 * reports its scroll fraction and which letters are expanded, and accepts a
 * request to restore both. A rebuilt transcript renders every letter in its
 * default state, so the fraction alone would scroll to a different passage. Sanitized mail contributes no scripts. The CSP
 * permits only this exact source hash, and the sandbox keeps an opaque origin.
 */
export const THREAD_FRAME_SANDBOX =
  "allow-scripts allow-popups allow-popups-to-escape-sandbox"
export const THREAD_OBSERVER_SCRIPT = `(function(){const turns=Array.from(document.querySelectorAll('[data-ms-thread-index]'));let active=-1,queued=false;const update=function(){queued=false;const height=document.documentElement.scrollHeight;parent.postMessage({type:'mail-sifter-frame-scroll',top:scrollY,ratio:height>0?scrollY/height:0,open:turns.reduce(function(list,turn,index){if(turn.tagName==='DETAILS'&&turn.open)list.push(index);return list},[])},'*');if(!turns.length)return;const line=innerHeight*.35;let next=scrollY+innerHeight>=document.documentElement.scrollHeight-1?turns.length-1:0;if(next===0){for(let i=0;i<turns.length;i++){if(turns[i].getBoundingClientRect().top<=line)next=i;else break}}if(next!==active){active=next;parent.postMessage({type:'mail-sifter-thread-active',index:active},'*')}};addEventListener('scroll',function(){if(!queued){queued=true;requestAnimationFrame(update)}},{passive:true});addEventListener('resize',update);addEventListener('toggle',function(){if(!queued){queued=true;requestAnimationFrame(update)}},true);addEventListener('message',function(event){const data=event.data;if(event.source!==parent||!data||data.type!=='mail-sifter-frame-restore'||typeof data.ratio!=='number'||!(data.ratio>=0&&data.ratio<=1))return;if(Array.isArray(data.open)){turns.forEach(function(turn,index){if(turn.tagName==='DETAILS')turn.open=data.open.indexOf(index)!==-1})}scrollTo(0,data.ratio*document.documentElement.scrollHeight)});addEventListener('message',function(event){const data=event.data;if(event.source!==parent||!data||data.type!=='mail-sifter-thread-scroll'||!Number.isInteger(data.index)||!turns[data.index])return;turns[data.index].scrollIntoView({behavior:'smooth',block:'start'})});update()})();`
// sha256 of THREAD_OBSERVER_SCRIPT. A source change must update this value.
export const THREAD_OBSERVER_HASH =
  "sha256-qVTOHXLxON1XPtOwqMmDbeWJUDq+5/QY35+EKZsupkk="

/** One message on its way into the conversation frame. */
export type ThreadFrameMessage = {
  /** Stable within one build. Becomes the `@scope` root for this message. */
  key: string
  fromName?: string
  fromAddr?: string
  /** ISO date from the message's own header, or undefined when it had none. */
  date?: string
  /** Sanitized HTML, remote images still parked. Null for text-only mail. */
  html: string | null
  /** The plain-text alternative. The collapsed preview is built from this. */
  text: string | null
  /** The owner wrote it. Decided by the server, which knows the accounts. */
  isMine: boolean
  /** This is the message the reader opened. Never collapsed. */
  isOpen: boolean
}

export type ThreadSrcDocOptions = {
  hasLoadedImages?: boolean
  isDarkened?: boolean
  pageBackground?: string
  fontDataUrl?: string
  /** Space for the reader's identity masthead, in viewport pixels. */
  readerHeaderInset?: number
  /**
   * Messages the server's thread cap did not fetch. Stated on the band rather
   * than left out, because "there is no more" and "there is more" are
   * different facts.
   */
  hiddenCount?: number
}

/**
 * Where a message stops being a chat bubble and becomes a letter.
 *
 * The owner's framing: *"It really depends on how long the messages are. If
 * they're shorter, it makes sense to just show them all like chat. If they're
 * longer, it makes more sense to separate them out."*
 *
 * The decision is made per **message**, never per thread. A thread of one-liners
 * therefore reads as chat without anything switching modes, a thread of real
 * letters reads as mail, and a mixed thread renders each message the way that
 * message deserves — which is the case a thread-level switch has to get wrong
 * for at least one of its messages.
 *
 * 400 characters is about five lines at the reader's measure: past that a
 * bubble stops being a remark and starts being a wall with rounded corners.
 */
const BUBBLE_MAX_CHARS = 400

/** How much of a collapsed message the summary shows. Three lines, roughly. */
const PREVIEW_CHARS = 260

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/**
 * The message's text, for length tests and the collapsed preview.
 *
 * Prefers the plain-text part, and falls back to the HTML with its tags taken
 * out — a length in characters is all this is used for, so a crude strip is
 * honest here in a way it would not be for rendering.
 */
const plainTextOf = (message: ThreadFrameMessage): string =>
  (
    message.text ??
    (message.html ?? "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Does the frame show the conversation, or this message alone?
 *
 * A pure rule rather than an inline condition, because the inline one shipped
 * wrong. It read `effectiveView === "html"`, which is false for a message that
 * has **only** a text part — so plain-text mail, the likeliest thing in the
 * mailbox to be a real back-and-forth between two people, was the one kind that
 * never showed its thread. The owner opened exactly that and reported it.
 *
 * Picking **Plain text** is a request to see this message the way it arrived,
 * and that still opts out. Being *handed* the text part because there is no
 * HTML is not a request at all — and the control that would take it back does
 * not even exist for that message.
 */
export const isConversationShown = ({
  hasThread,
  hasHtml,
  view,
}: {
  hasThread: boolean
  hasHtml: boolean
  view: "html" | "text"
}): boolean => hasThread && !(hasHtml && view === "text")

/** A short exchange is chat; a letter is a letter. */
export const isBubble = (
  message: ThreadFrameMessage,
): boolean =>
  plainTextOf(message).length <= BUBBLE_MAX_CHARS

const preview = (message: ThreadFrameMessage): string => {
  const text = plainTextOf(message)
  return escapeHtml(
    text.length > PREVIEW_CHARS
      ? `${text.slice(0, PREVIEW_CHARS).trimEnd()}…`
      : text,
  )
}

/** "Sam Ferris", else the address, else something honest. */
const senderName = (message: ThreadFrameMessage): string =>
  message.isMine
    ? "You"
    : message.fromName?.trim() ||
      message.fromAddr?.trim() ||
      "Unknown sender"

/**
 * `2 Mar` for this year, `2 Mar 2025` for any other — the year only earns its
 * space when it is not the obvious one. A message with no parseable date says
 * nothing rather than "Invalid Date".
 */
const shortDate = (
  iso: string | undefined,
  now: Date,
): string => {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const isSameYear =
    date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(isSameYear ? {} : { year: "numeric" }),
  })
}

/**
 * Confine one message's own stylesheet to that message.
 *
 * `@scope (#id) { … }` wraps the block's whole contents, so every selector in
 * it is resolved against that subtree and cannot reach a sibling message. A
 * body-level rule (`body { background: #fff }`) simply stops matching, which is
 * the correct outcome inside a transcript: a message is a card here, not a page.
 */
export const scopeStyles = (
  html: string,
  scopeId: string,
): string =>
  html.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_match, open: string, css: string, close: string) =>
      `${open}@scope (#${scopeId}) {${css}}${close}`,
  )

/** The body of one message, prepared for a shared document. */
const messageBody = (
  message: ThreadFrameMessage,
  scopeId: string,
  hasLoadedImages: boolean,
): string => {
  if (message.html) {
    const withImages = hasLoadedImages
      ? withRemoteImages(message.html)
      : message.html
    /*
     * Never `native-dark` in a transcript. A message's own dark half assumes it
     * owns the page; here it would be one dark card among the app's own light
     * chrome, and then the whole document inverts on top of it. So every
     * message is pinned to its light design and darkening inverts the document
     * as a whole — the same path a message with no dark design has always taken.
     */
    return scopeStyles(
      pinColorScheme(withImages, false),
      scopeId,
    )
  }
  const text = message.text ?? ""
  return `<pre class="ms-plain-text">${escapeHtml(text)}</pre>`
}

const bubble = (
  message: ThreadFrameMessage,
  scopeId: string,
  now: Date,
  hasLoadedImages: boolean,
): string => `
<article class="ms-turn${message.isMine ? " ms-mine" : ""}${
  message.isOpen ? " ms-opened" : ""
}" data-ms-thread-index="${scopeId.slice("ms-msg-".length)}">
  <p class="ms-meta"><span class="ms-who">${escapeHtml(senderName(message))}</span>
  <span class="ms-when">${escapeHtml(shortDate(message.date, now))}</span>${
    message.isOpen
      ? `<span class="ms-chip">opened</span>`
      : ""
  }</p>
  <div class="ms-bubble" id="${scopeId}">${messageBody(message, scopeId, hasLoadedImages)}</div>
</article>`

/**
 * A letter: full width, its own header, and collapsed unless it is the message
 * the owner opened.
 *
 * The owner's own collapsed message wears the band instead of a plain header —
 * "This answers a message you sent" is the one line that explains why the mail
 * he opened exists, and it is worth a whole row rather than a footnote.
 */
const letter = (
  message: ThreadFrameMessage,
  scopeId: string,
  now: Date,
  hasLoadedImages: boolean,
  hiddenCount: number,
): string => {
  const when = escapeHtml(shortDate(message.date, now))
  const body = `<div class="ms-body" id="${scopeId}">${messageBody(
    message,
    scopeId,
    hasLoadedImages,
  )}</div>`

  if (message.isOpen) {
    return `<article class="ms-letter ms-open" data-ms-thread-index="${scopeId.slice("ms-msg-".length)}">
  <p class="ms-letter-head"><span class="ms-who">${escapeHtml(
    senderName(message),
  )}</span><span class="ms-when">${when}</span></p>
  ${body}
</article>`
  }

  /*
   * The cue is the affordance. A collapsed card with a preview in it looks like
   * a short message rather than a closed one, and nothing else on the row says
   * it can be opened — there is no disclosure triangle, because Safari's is the
   * wrong shape for a card this size.
   */

  const more =
    hiddenCount > 0
      ? ` · ${hiddenCount} more in this thread`
      : ""

  if (message.isMine) {
    return `<details class="ms-letter ms-band" data-ms-thread-index="${scopeId.slice("ms-msg-".length)}">
  <summary>
    <span class="ms-letter-head"><span class="ms-who">This answers a message you sent</span><span class="ms-when">${when}</span></span>
    <span class="ms-preview">${preview(message)}</span>
    <span class="ms-cue">Read your message${escapeHtml(more)}</span>
  </summary>
  ${body}
</details>`
  }

  return `<details class="ms-letter" data-ms-thread-index="${scopeId.slice("ms-msg-".length)}">
  <summary>
    <span class="ms-letter-head"><span class="ms-who">${escapeHtml(
      senderName(message),
    )}</span><span class="ms-when">${when}</span></span>
    <span class="ms-preview">${preview(message)}</span>
    <span class="ms-cue">Read this message${escapeHtml(more)}</span>
  </summary>
  ${body}
</details>`
}

/**
 * The transcript's own sheet.
 *
 * Authored **light**, always, and darkened by inverting the whole document —
 * the same trick the parked-image swatch uses. One mechanism for the chrome and
 * the messages together means a card can never come out light against a dark
 * message or the other way round.
 */
const threadCss = (
  pageBackground: string,
  readerHeaderInset: number,
): string => `
  html { color-scheme: light; background: ${pageBackground}; }
  body {
    margin: 0;
    padding: ${16 + readerHeaderInset}px 16px 16px;
    min-height: 100vh;
    box-sizing: border-box;
    background: #f2f3f5;
    color: #16181d;
    font: 16px/1.6 ${MESSAGE_FONT_STACK};
    overflow-wrap: break-word;
  }
  .ms-thread {
    max-width: 60ch;
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  img { max-width: 100%; height: auto; }
  pre.ms-plain-text { margin: 0; font: inherit; white-space: pre-wrap; }
  a { color: #1a4fd6; }

  /* A message that declares a fixed width scrolls inside its own card rather
     than widening the conversation. */
  .ms-bubble, .ms-body { overflow-x: auto; }

  /* ------------------------------ chat bubbles --------------------------- */
  .ms-turn { display: flex; flex-direction: column; align-items: flex-start; }
  .ms-turn.ms-mine { align-items: flex-end; }
  .ms-meta {
    margin: 0 0 3px;
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 13px;
  }
  .ms-who { font-weight: 600; color: #16181d; }
  .ms-when { color: #6b7280; font-size: 13px; font-weight: 400; }
  .ms-chip {
    font-size: 11px;
    letter-spacing: .04em;
    text-transform: uppercase;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #c9ced6;
    color: #4b5563;
  }
  .ms-bubble {
    max-width: 46ch;
    padding: 9px 13px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #d9dde3;
  }
  .ms-mine .ms-bubble { background: #e7e6ff; border-color: #c3c0f5; }
  .ms-opened .ms-bubble { outline: 2px solid #8b93a3; outline-offset: 2px; }

  /* -------------------------------- letters ------------------------------ */
  .ms-letter {
    border: 1px solid #d9dde3;
    border-radius: 12px;
    background: #ffffff;
    overflow: hidden;
  }
  .ms-letter.ms-open { border-color: #8b93a3; }
  .ms-letter > summary {
    display: block;
    padding: 10px 12px;
    cursor: pointer;
    list-style: none;
  }
  /* The disclosure triangle is Safari's, and it is not the affordance here. */
  .ms-letter > summary::-webkit-details-marker { display: none; }
  .ms-letter-head {
    display: flex;
    gap: 10px;
    align-items: baseline;
    font-size: 15px;
  }
  .ms-letter-head .ms-when { margin-inline-start: auto; }
  .ms-preview {
    display: block;
    margin-top: 4px;
    color: #4b5563;
    font-size: 15px;
  }
  /* Open, the preview would repeat the first lines of the body under it. */
  .ms-letter[open] > summary .ms-preview { display: none; }
  .ms-cue {
    display: block;
    margin-top: 8px;
    font-weight: 600;
    font-size: 14px;
    color: #3f3bb5;
  }
  .ms-letter[open] > summary .ms-cue { display: none; }
  .ms-letter .ms-body { padding: 12px; }
  /* A message's first paragraph carries a margin of its own, and stacked with
     the card's padding it read as a hole under the header. */
  .ms-letter .ms-body > :first-child { margin-block-start: 0; }
  .ms-letter .ms-body > :last-child { margin-block-end: 0; }
  .ms-letter[open] > .ms-body,
  .ms-letter.ms-open > .ms-body { border-top: 1px solid #e6e9ee; }
  .ms-letter.ms-open > .ms-letter-head { padding: 10px 12px; margin: 0; }

  /* The owner's own message, collapsed: the one line that says why this mail
     exists at all. */
  .ms-band { border-color: #c3c0f5; background: #eeedff; }
  .ms-band > summary .ms-who { color: #2b2880; }

  /* ------------------------------ separators ----------------------------- */
  .ms-dropped {
    margin: 0;
    text-align: center;
    color: #6b7280;
    font-size: 13px;
  }
`

/**
 * Darkening a transcript inverts the whole document, chrome and messages
 * together, then puts photographs back the right way round. Same mechanism as
 * the single-message frame's faux dark mode, and the same honest limitation: a
 * logo with a baked-in white rectangle stays a white rectangle.
 */
const DARK_CSS = `
  html.ms-dark { min-height: 100%; filter: invert(1) hue-rotate(180deg); }
  html.ms-dark, html.ms-dark body { background: #f2f3f5; }
  html.ms-dark img,
  html.ms-dark video,
  html.ms-dark [data-ms-bg-image] { filter: invert(1) hue-rotate(180deg); }
  html.ms-dark img[data-ms-blocked-image] { filter: none; }
  /* An emoji is a picture too, and it is a character rather than an element —
     see markEmoji.ts for why the mark is applied here and not by the sanitizer. */
  html.ms-dark [data-ms-emoji] { filter: invert(1) hue-rotate(180deg); }
`

const asColor = (
  value: string | undefined,
  fallback: string,
): string =>
  value &&
  /^(#[0-9a-f]{3,8}|(?:rgb|hsl|oklch|lab|lch)a?\([^;{}"'<>]*\))$/i.test(
    value.trim(),
  )
    ? value.trim()
    : fallback

/**
 * Build the conversation frame.
 *
 * `now` is a parameter so a test can state what "this year" means rather than
 * depending on the day it runs.
 */
export const buildThreadSrcDoc = (
  messages: ThreadFrameMessage[],
  options: ThreadSrcDocOptions = {},
  now: Date = new Date(),
): string => {
  const hasLoadedImages = options.hasLoadedImages ?? false
  const isDarkened = options.isDarkened ?? false
  const hiddenCount = Math.max(options.hiddenCount ?? 0, 0)
  const readerHeaderInset = Math.min(
    Math.max(Math.round(options.readerHeaderInset ?? 0), 0),
    1000,
  )

  const rows = messages
    .map((message, index) => {
      const scopeId = `ms-msg-${index}`
      return isBubble(message)
        ? bubble(message, scopeId, now, hasLoadedImages)
        : letter(
            message,
            scopeId,
            now,
            hasLoadedImages,
            hiddenCount,
          )
    })
    .join("")

  /*
   * Only when nothing in the frame already carries the count. The band says it
   * where there is a band; a thread with no message of the owner's own has
   * nowhere else to put it.
   */
  const isCountOnBand = messages.some(
    (message) =>
      message.isMine &&
      !message.isOpen &&
      !isBubble(message),
  )
  const dropped =
    hiddenCount > 0 && !isCountOnBand
      ? `<p class="ms-dropped">${hiddenCount} earlier message${
          hiddenCount === 1 ? "" : "s"
        } in this thread</p>`
      : ""

  /*
   * One pass over the assembled document, chrome included: a subject line, a
   * sender's display name and a collapsed preview all carry emoji as often as
   * a message body does, and the inversion does not care which is which. Only
   * in the darkened mode — the marks exist to be re-inverted.
   */
  const thread = `<div class="ms-thread">${dropped}${rows}</div>`
  const csp = messageCsp(hasLoadedImages).replace(
    "script-src 'none'",
    `script-src '${THREAD_OBSERVER_HASH}'`,
  )

  return [
    "<!doctype html>",
    `<html lang="en"${isDarkened ? ' class="ms-dark"' : ""}><head>`,
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    '<meta name="referrer" content="no-referrer">',
    `<style>${fontFaceCss(options.fontDataUrl)}${threadCss(
      asColor(options.pageBackground, "#ffffff"),
      readerHeaderInset,
    )}${isDarkened ? DARK_CSS : ""}</style>`,
    "</head><body>",
    isDarkened ? markEmoji(thread) : thread,
    `<script>${THREAD_OBSERVER_SCRIPT}</script>`,
    "</body></html>",
  ].join("")
}
