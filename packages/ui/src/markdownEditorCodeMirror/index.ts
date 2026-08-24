/**
 * `@charcuterie/ui/markdown-editor-codemirror` — the opt-in
 * CodeMirror markdown surface: the live-preview **editor**, and the
 * read-only **view** that renders the same document the same way.
 *
 * Both are here rather than in two subpaths because there is one
 * dependency, not two. A consumer who wants only `MarkdownView`
 * still installs CodeMirror; splitting the entry point would suggest
 * otherwise and would give the shared `livePreview` module two ways
 * into the bundle.
 *
 * Its own entry point, and every CodeMirror package it needs is an
 * **optional** peer, so a consumer that never imports this subpath
 * installs none of it and bundles none of it. Same packaging as
 * `@charcuterie/ui/react-router`, and the same reason: the capacity
 * is worth having and is not worth charging everybody for.
 */

export type { LivePreviewOptions } from "./livePreview.ts"
export {
  livePreview,
  livePreviewOptions,
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
export type { MarkdownViewProps } from "./MarkdownView.tsx"
export { MarkdownView } from "./MarkdownView.tsx"
export {
  toSafeImageUrl,
  toSafeLinkUrl,
} from "./safeUrls.ts"
