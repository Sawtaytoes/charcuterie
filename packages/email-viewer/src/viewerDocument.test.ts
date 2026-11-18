import { describe, expect, test } from "vitest"

import { EMAIL_READER_FRAME_SANDBOX } from "./srcDoc.ts"
import { THREAD_FRAME_SANDBOX } from "./threadSrcDoc.ts"
import {
  buildViewerSrcDoc,
  effectiveEmailView,
  isConversationFrame,
  type ViewerDocumentInput,
  viewerFrameSandbox,
} from "./viewerDocument.ts"

const base: Omit<ViewerDocumentInput, "message"> = {
  frameWidth: 800,
  hasLoadedImages: false,
  isDarkened: false,
  isScaledToFit: false,
  readerHeaderInset: 0,
  thread: null,
  view: "html",
}

const conversation = {
  hiddenCount: 0,
  messages: [
    {
      html: null,
      isMine: false,
      isOpen: false,
      key: "a",
      text: "First",
    },
    {
      html: null,
      isMine: true,
      isOpen: true,
      key: "b",
      text: "Second",
    },
  ],
}

describe("which document the frame shows", () => {
  test("no message, no document", () => {
    expect(
      buildViewerSrcDoc({ ...base, message: null }),
    ).toBeNull()
  })

  test("a message with neither part renders as nothing", () => {
    expect(
      buildViewerSrcDoc({
        ...base,
        message: {
          fixedLayoutWidth: 0,
          html: null,
          text: "  ",
        },
      }),
    ).toBeNull()
  })

  test("HTML is shown when it exists and was asked for", () => {
    const doc = buildViewerSrcDoc({
      ...base,
      message: {
        fixedLayoutWidth: 0,
        html: "<p>Rich</p>",
        text: "Plain",
      },
    })
    expect(doc).toContain("<p>Rich</p>")
  })

  test("Plain text shows the text part, escaped", () => {
    const doc = buildViewerSrcDoc({
      ...base,
      message: {
        fixedLayoutWidth: 0,
        html: "<p>Rich</p>",
        text: "<b>hi</b>",
      },
      view: "text",
    })
    expect(doc).toContain(
      '<pre class="ms-plain-text">&lt;b&gt;hi&lt;/b&gt;</pre>',
    )
  })

  test("a text-only message still shows its conversation", () => {
    const message = {
      fixedLayoutWidth: 0,
      html: null,
      text: "Second",
    }
    expect(
      isConversationFrame(message, conversation, "html"),
    ).toBe(true)
    expect(
      buildViewerSrcDoc({
        ...base,
        message,
        thread: conversation,
      }),
    ).toContain('class="ms-thread"')
  })

  test("asking for Plain text on an HTML message leaves the conversation", () => {
    const message = {
      fixedLayoutWidth: 0,
      html: "<p>x</p>",
      text: "x",
    }
    expect(
      isConversationFrame(message, conversation, "text"),
    ).toBe(false)
    expect(effectiveEmailView(message, "text")).toBe("text")
  })

  test("each document gets the sandbox its observer needs", () => {
    expect(viewerFrameSandbox(true)).toBe(
      THREAD_FRAME_SANDBOX,
    )
    expect(viewerFrameSandbox(false)).toBe(
      EMAIL_READER_FRAME_SANDBOX,
    )
    expect(viewerFrameSandbox(true)).not.toContain(
      "allow-same-origin",
    )
    expect(viewerFrameSandbox(false)).not.toContain(
      "allow-same-origin",
    )
  })
})
