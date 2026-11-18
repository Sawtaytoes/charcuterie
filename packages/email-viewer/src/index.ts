/**
 * `@charcuterie/email-viewer` — Mail Sifter's email viewer, shared so every
 * app that shows Mail Sifter's mail renders it the same way.
 */
export type { EmailAttachmentListProps } from "./EmailAttachmentList.tsx"
export { EmailAttachmentList } from "./EmailAttachmentList.tsx"
export { EmailAttachmentRow } from "./EmailAttachmentRow.tsx"
export type { EmailImageNoticeProps } from "./EmailImageNotice.tsx"
export { EmailImageNotice } from "./EmailImageNotice.tsx"
export type {
  EmailViewerHandle,
  EmailViewerProps,
} from "./EmailViewer.tsx"
export {
  EmailViewer,
  isEmailOverflowing,
} from "./EmailViewer.tsx"
export { formatBytes } from "./formatBytes.ts"
export {
  hasImageSafetyWarning,
  shouldLoadRemoteImages,
} from "./imagePolicy.ts"
export { markEmoji } from "./markEmoji.ts"
export type {
  EmailColorMode,
  EmailSrcDocOptions,
} from "./srcDoc.ts"
export {
  buildEmailSrcDoc,
  buildPlainTextSrcDoc,
  chooseEmailColorMode,
  EMAIL_FRAME_SANDBOX,
  EMAIL_READER_FRAME_SANDBOX,
  EMAIL_SCROLL_OBSERVER_HASH,
  EMAIL_SCROLL_OBSERVER_SCRIPT,
  fontFaceCss,
  hasNativeDarkDesign,
  MESSAGE_FONT_STACK,
  messageCsp,
  pinColorScheme,
  scaleToFit,
  withRemoteImages,
} from "./srcDoc.ts"
export type {
  ThreadFrameMessage,
  ThreadSrcDocOptions,
} from "./threadSrcDoc.ts"
export {
  buildThreadSrcDoc,
  isBubble,
  isConversationShown,
  scopeStyles,
  THREAD_FRAME_SANDBOX,
  THREAD_OBSERVER_HASH,
  THREAD_OBSERVER_SCRIPT,
} from "./threadSrcDoc.ts"
export type {
  EmailAttachment,
  EmailDocument,
  EmailImageSafety,
  EmailLink,
  EmailLinkWarning,
} from "./types.ts"
export { useElementWidth } from "./useElementWidth.ts"
export type {
  EmailBodyView,
  EmailViewerThread,
  ViewerDocumentInput,
} from "./viewerDocument.ts"
export {
  buildViewerSrcDoc,
  effectiveEmailView,
  isConversationFrame,
  viewerFrameSandbox,
} from "./viewerDocument.ts"
