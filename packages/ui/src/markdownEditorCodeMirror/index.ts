/**
 * `@charcuterie/ui/markdown-editor-codemirror` — the opt-in live
 * preview surface.
 *
 * Its own entry point, and every CodeMirror package it needs is an
 * **optional** peer, so a consumer that never imports this subpath
 * installs none of it and bundles none of it. Same packaging as
 * `@charcuterie/ui/react-router`, and the same reason: the capacity
 * is worth having and is not worth charging everybody for.
 */

export {
  livePreview,
  livePreviewRawModeField,
  setLivePreviewRawMode,
} from "./livePreview.ts"
export type {
  LivePreviewLineKind,
  LivePreviewMarkKind,
  LivePreviewRange,
  LivePreviewSelection,
  ToLivePreviewRangesOptions,
} from "./livePreviewRanges.ts"
export { toLivePreviewRanges } from "./livePreviewRanges.ts"
export type { MarkdownEditorCodeMirrorProps } from "./MarkdownEditorCodeMirror.tsx"
export { MarkdownEditorCodeMirror } from "./MarkdownEditorCodeMirror.tsx"
