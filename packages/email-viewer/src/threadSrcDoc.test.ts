import { createHash } from "node:crypto"
import { describe, expect, test } from "vitest"

import {
  buildThreadSrcDoc,
  isBubble,
  isConversationShown,
  scopeStyles,
  THREAD_FRAME_SANDBOX,
  THREAD_OBSERVER_HASH,
  THREAD_OBSERVER_SCRIPT,
  type ThreadFrameMessage,
} from "./threadSrcDoc.ts"

/** 2026 for every date test, so "this year" is a stated fact, not today's. */
const NOW = new Date("2026-08-25T12:00:00Z")

const message = (
  patch: Partial<ThreadFrameMessage> = {},
): ThreadFrameMessage => ({
  key: "m1",
  fromName: "Sam Ferris",
  fromAddr: "sam@driveworks.example",
  date: "2026-03-02T09:00:00Z",
  html: "<p>Short one.</p>",
  text: "Short one.",
  isMine: false,
  isOpen: false,
  ...patch,
})

const LONG_TEXT = "A sentence that goes on. ".repeat(30)

describe("bubble or letter", () => {
  test("a remark is a bubble; a letter is a letter", () => {
    expect(isBubble(message())).toBe(true)
    expect(
      isBubble(
        message({
          text: LONG_TEXT,
          html: `<p>${LONG_TEXT}</p>`,
        }),
      ),
    ).toBe(false)
  })

  test("length is read from the HTML when there is no text part", () => {
    expect(
      isBubble(
        message({
          text: null,
          html: `<div><p>${LONG_TEXT}</p></div>`,
        }),
      ),
    ).toBe(false)
    // The tags themselves must not push a short message over the line.
    expect(
      isBubble(
        message({
          text: null,
          html: `<div style="font-family:Georgia;color:#333"><p><span><b>Yes</b></span></p></div>`,
        }),
      ),
    ).toBe(true)
  })

  test("a thread of one-liners renders as chat, with no mode to switch", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          key: "a",
          isMine: true,
          text: "Out yet?",
          html: "<p>Out yet?</p>",
        }),
        message({
          key: "b",
          text: "Not yet.",
          html: "<p>Not yet.</p>",
          isOpen: true,
        }),
      ],
      {},
      NOW,
    )
    expect(doc).toContain("ms-bubble")
    expect(doc).not.toContain("<details")
  })

  test("a mixed thread gives each message its own shape", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          key: "a",
          isMine: true,
          text: "Out yet?",
          html: "<p>Out yet?</p>",
        }),
        message({
          key: "b",
          text: LONG_TEXT,
          html: `<p>${LONG_TEXT}</p>`,
        }),
        message({
          key: "c",
          text: "Thanks!",
          html: "<p>Thanks!</p>",
          isOpen: true,
        }),
      ],
      {},
      NOW,
    )
    expect(doc).toContain("ms-bubble")
    expect(doc).toContain("<details")
  })
})

describe("the owner's own message", () => {
  test("collapsed, it wears the band that says why this mail exists", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          key: "a",
          isMine: true,
          text: LONG_TEXT,
          html: `<p>${LONG_TEXT}</p>`,
        }),
        message({
          key: "b",
          text: "Sorry for the delay.",
          isOpen: true,
        }),
      ],
      {},
      NOW,
    )
    expect(doc).toContain("ms-band")
    expect(doc).toContain("This answers a message you sent")
    // The preview is inside the summary, because a closed details renders
    // nothing else.
    expect(doc).toMatch(
      /<summary>[\s\S]*ms-preview[\s\S]*<\/summary>/,
    )
  })

  test("the message that is open is never collapsed", () => {
    const doc = buildThreadSrcDoc(
      [
        message({ key: "a", text: "Hi" }),
        message({
          key: "b",
          text: LONG_TEXT,
          html: `<p>${LONG_TEXT}</p>`,
          isOpen: true,
        }),
      ],
      {},
      NOW,
    )
    expect(doc).toContain("ms-letter ms-open")
  })

  test("messages left out are counted, never silently dropped", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          key: "a",
          isMine: true,
          text: LONG_TEXT,
          html: `<p>${LONG_TEXT}</p>`,
        }),
        message({ key: "b", text: "Sorry.", isOpen: true }),
      ],
      { hiddenCount: 4 },
      NOW,
    )
    expect(doc).toContain("4 more in this thread")
  })
})

describe("one document, many senders", () => {
  test("a sender's stylesheet is scoped to that sender's message", () => {
    const scoped = scopeStyles(
      "<style>* { font-family: Comic Sans MS }</style><p>x</p>",
      "ms-msg-2",
    )
    expect(scoped).toContain(
      "@scope (#ms-msg-2) {* { font-family: Comic Sans MS }}",
    )
  })

  test("every message body carries the id its own rules are scoped to", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          key: "a",
          text: LONG_TEXT,
          html: `<style>p { color: red }</style><p>${LONG_TEXT}</p>`,
        }),
        message({
          key: "b",
          text: "Fine.",
          html: "<p>Fine.</p>",
          isOpen: true,
        }),
      ],
      {},
      NOW,
    )
    expect(doc).toContain('id="ms-msg-0"')
    expect(doc).toContain("@scope (#ms-msg-0)")
  })

  test("only the fixed transcript observer may run", () => {
    const doc = buildThreadSrcDoc(
      [message({ isOpen: true })],
      { readerHeaderInset: 128 },
      NOW,
    )
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("padding: 144px 16px 16px")
    expect(doc).toContain(
      `script-src '${THREAD_OBSERVER_HASH}'`,
    )
    expect(doc).toContain(
      `<script>${THREAD_OBSERVER_SCRIPT}</script>`,
    )
    expect(doc).toContain("img-src data:")
    expect(doc).not.toContain("img-src data: https:")
    expect(THREAD_FRAME_SANDBOX).toContain("allow-scripts")
    expect(THREAD_FRAME_SANDBOX).not.toContain(
      "allow-same-origin",
    )
    expect(THREAD_OBSERVER_HASH).toBe(
      `sha256-${createHash("sha256").update(THREAD_OBSERVER_SCRIPT).digest("base64")}`,
    )
    expect(doc).toContain("mail-sifter-frame-scroll")
  })

  test("each turn is addressable by the scroll observer", () => {
    const doc = buildThreadSrcDoc(
      [
        message({ key: "a" }),
        message({ key: "b", isOpen: true }),
      ],
      {},
      NOW,
    )
    expect(doc).toContain('data-ms-thread-index="0"')
    expect(doc).toContain('data-ms-thread-index="1"')
    expect(doc).toContain("mail-sifter-thread-active")
    expect(doc).toContain("mail-sifter-thread-scroll")
  })

  test("loading images widens exactly one directive, and unparks them", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          isOpen: true,
          html: `<img data-ms-src="https://cdn.example.com/a.png" data-ms-blocked-image="">`,
        }),
      ],
      { hasLoadedImages: true },
      NOW,
    )
    expect(doc).toContain("img-src data: https: http:")
    expect(doc).toContain(
      `src="https://cdn.example.com/a.png"`,
    )
  })

  test("plain-text mail in a thread is prose, and its markup stays literal", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          isOpen: true,
          html: null,
          text: "<b>not bold</b> & 5 < 6",
        }),
      ],
      {},
      NOW,
    )
    expect(doc).toContain(
      "&lt;b&gt;not bold&lt;/b&gt; &amp; 5 &lt; 6",
    )
    expect(doc).toContain('<pre class="ms-plain-text">')
  })
})

describe("dates", () => {
  test("this year drops the year; an older one keeps it", () => {
    const thisYear = buildThreadSrcDoc(
      [
        message({
          date: "2026-03-02T09:00:00Z",
          isOpen: true,
        }),
      ],
      {},
      NOW,
    )
    expect(thisYear).toContain("2 Mar")
    expect(thisYear).not.toContain("2 Mar 2026")

    const older = buildThreadSrcDoc(
      [
        message({
          date: "2025-03-02T09:00:00Z",
          isOpen: true,
        }),
      ],
      {},
      NOW,
    )
    expect(older).toContain("2 Mar 2025")
  })

  test("a message with no usable date says nothing rather than Invalid Date", () => {
    const doc = buildThreadSrcDoc(
      [
        message({ date: "not a date", isOpen: true }),
        message({ date: undefined }),
      ],
      {},
      NOW,
    )
    expect(doc).not.toContain("Invalid")
    expect(doc).not.toContain("NaN")
  })
})

describe("darkening", () => {
  test("is off unless asked for, and inverts the whole document when it is", () => {
    expect(
      buildThreadSrcDoc(
        [message({ isOpen: true })],
        {},
        NOW,
      ),
    ).not.toContain("ms-dark")
    const dark = buildThreadSrcDoc(
      [message({ isOpen: true })],
      { isDarkened: true },
      NOW,
    )
    expect(dark).toContain(
      '<html lang="en" class="ms-dark">',
    )
    expect(dark).toContain("invert(1) hue-rotate(180deg)")
  })

  test("an emoji keeps its own colours, in a message and in the chrome", () => {
    const dark = buildThreadSrcDoc(
      [
        message({
          isOpen: true,
          html: "<p>see you \u{1F605}</p>",
        }),
        message({
          key: "m2",
          fromName: "Ada \u{1F680}",
          isOpen: false,
        }),
      ],
      { isDarkened: true },
      NOW,
    )
    expect(dark).toContain(
      `<span data-ms-emoji="">\u{1F605}</span>`,
    )
    // The chrome is part of this document too, so a sender's name is marked
    // by the same pass as the body under it.
    expect(dark).toContain(
      `<span data-ms-emoji="">\u{1F680}</span>`,
    )
    expect(dark).toContain("html.ms-dark [data-ms-emoji]")
    expect(
      buildThreadSrcDoc(
        [
          message({
            isOpen: true,
            html: "<p>see you \u{1F605}</p>",
          }),
        ],
        {},
        NOW,
      ),
    ).not.toContain("data-ms-emoji")
  })

  test("a message's own dark half never runs inside a transcript", () => {
    const doc = buildThreadSrcDoc(
      [
        message({
          isOpen: true,
          html: `<style>@media (prefers-color-scheme: dark) { p { color: #fff } }</style><p>x</p>`,
        }),
      ],
      { isDarkened: true },
      NOW,
    )
    // Pinned to the light design: the dark half is rewritten to never match.
    expect(doc).toContain("(min-width: 999999px)")
    expect(doc).not.toContain("prefers-color-scheme: dark")
  })
})

describe("conversation or this message alone", () => {
  test("a message with only a text part still shows its thread", () => {
    // The regression. A plain-text mail is the likeliest thing in the mailbox
    // to be two people talking, and it was the one kind that never showed the
    // conversation — the reader was reading "the text part is on screen" as
    // "he asked for the text part".
    expect(
      isConversationShown({
        hasThread: true,
        hasHtml: false,
        view: "text",
      }),
    ).toBe(true)
    expect(
      isConversationShown({
        hasThread: true,
        hasHtml: false,
        view: "html",
      }),
    ).toBe(true)
  })

  test("choosing Plain text on a message that has HTML opts out", () => {
    expect(
      isConversationShown({
        hasThread: true,
        hasHtml: true,
        view: "text",
      }),
    ).toBe(false)
    expect(
      isConversationShown({
        hasThread: true,
        hasHtml: true,
        view: "html",
      }),
    ).toBe(true)
  })

  test("no thread, no conversation", () => {
    expect(
      isConversationShown({
        hasThread: false,
        hasHtml: false,
        view: "text",
      }),
    ).toBe(false)
  })
})
