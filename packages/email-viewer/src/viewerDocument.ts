import {
  buildEmailSrcDoc,
  buildPlainTextSrcDoc,
  EMAIL_READER_FRAME_SANDBOX,
} from "./srcDoc.ts"
import {
  buildThreadSrcDoc,
  isConversationShown,
  THREAD_FRAME_SANDBOX,
  type ThreadFrameMessage,
} from "./threadSrcDoc.ts"
import type { EmailDocument } from "./types.ts"

/** Which part of the message the reader asked for. */
export type EmailBodyView = "html" | "text"

/** A conversation to show around the message, already in frame shape. */
export type EmailViewerThread = {
  messages: ThreadFrameMessage[]
  /** Messages the owning app's thread cap did not fetch. */
  hiddenCount: number
}

export type ViewerDocumentInput = {
  message: EmailDocument | null
  thread: EmailViewerThread | null
  view: EmailBodyView
  hasLoadedImages: boolean
  isDarkened: boolean
  isScaledToFit: boolean
  frameWidth: number
  fontDataUrl?: string
  pageBackground?: string
  /** The measured masthead height. Always a number, so the observer always runs. */
  readerHeaderInset: number
}

/** The part actually shown: HTML only when there is HTML and it was asked for. */
export const effectiveEmailView = (
  message: EmailDocument | null,
  view: EmailBodyView,
): EmailBodyView =>
  message?.html && view === "html" ? "html" : "text"

/**
 * Whether the frame shows the conversation rather than the message alone.
 * Reads the REQUESTED view, not the effective one: a message with only a
 * text part made no request to leave its thread.
 */
export const isConversationFrame = (
  message: EmailDocument | null,
  thread: EmailViewerThread | null,
  view: EmailBodyView,
): boolean =>
  Boolean(
    thread &&
      isConversationShown({
        hasThread: true,
        hasHtml: Boolean(message?.html),
        view,
      }),
  )

/** The sandbox the frame needs for the document it shows. */
export const viewerFrameSandbox = (
  isConversation: boolean,
): string =>
  isConversation
    ? THREAD_FRAME_SANDBOX
    : EMAIL_READER_FRAME_SANDBOX

/**
 * The frame's whole document, or `null` when the message has nothing to
 * render.
 *
 * The conversation wins when there is one. It carries the open message
 * itself, so it is a different document rather than an addition to it.
 * Picking "Plain text" is the one way out; a message that has only a text
 * part has made no such request.
 *
 * `null` is a real answer: an attachment-only mail can arrive with an HTML
 * part that is a wrapper `<div>` and a `<style>` block, and the owning app's
 * server decides that it renders as nothing.
 */
export const buildViewerSrcDoc = (
  input: ViewerDocumentInput,
): string | null => {
  const { message, thread, view } = input
  if (!message) return null
  if (
    thread &&
    isConversationFrame(message, thread, view)
  ) {
    return buildThreadSrcDoc(thread.messages, {
      hasLoadedImages: input.hasLoadedImages,
      isDarkened: input.isDarkened,
      pageBackground: input.pageBackground,
      fontDataUrl: input.fontDataUrl,
      hiddenCount: thread.hiddenCount,
      readerHeaderInset: input.readerHeaderInset,
    })
  }
  const options = {
    hasLoadedImages: input.hasLoadedImages,
    frameWidth: input.frameWidth,
    isDarkened: input.isDarkened,
    isScaledToFit: input.isScaledToFit,
    fixedLayoutWidth: message.fixedLayoutWidth,
    fontDataUrl: input.fontDataUrl,
    pageBackground: input.pageBackground,
    readerHeaderInset: input.readerHeaderInset,
  }
  if (
    effectiveEmailView(message, view) === "html" &&
    message.html
  ) {
    return buildEmailSrcDoc(message.html, options)
  }
  if (message.text?.trim()) {
    return buildPlainTextSrcDoc(message.text, {
      fontDataUrl: input.fontDataUrl,
      isDarkened: input.isDarkened,
      pageBackground: input.pageBackground,
      readerHeaderInset: input.readerHeaderInset,
    })
  }
  if (message.html)
    return buildEmailSrcDoc(message.html, options)
  return null
}
