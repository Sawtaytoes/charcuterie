# HTML notes use distinct opt-in surfaces and preserve untouched source

Status: Accepted
Date: 2026-10-04
Type: Architecture
Supersedes: None
Superseded by: None

## Decision

Retained HTML notes use `HtmlView` and `HtmlEditor`, in the optional `@charcuterie/ui/html-editor`
subpath; the reader also has a lightweight `/html-view` entry needing only `parse5`. They do not reinterpret HTML as markdown or alter the markdown components' contracts.
Both surfaces share an HTML5 parse tree, closed document/attribute/style allowlists and the
existing URL scheme guards. The reader creates safe React nodes rather than inserting HTML.

The editor is uncontrolled after its initial `defaultValue`. Tiptap/ProseMirror owns edits and
undo history; Charcuterie owns the Toolbar, Field and Dialog shapes. Initial rendering, focus,
selection, blur and an untouched form submission preserve the original stored HTML bytes.
Only an actual document edit emits the sanitized edited representation. An app switches
documents by remounting with a key, rather than replacing a user's undo stack.

## Context

Hot Plate 3D retains project, file and archived-print notes stored as rich HTML. Its native
reference supports rich authoring, while its converted surfaces initially exposed plain
textareas and raw HTML strings. A markdown-only editor would silently change the stored format
and lose retained formatting. This is a shared authoring/viewing shape, so the repair belongs
in Charcuterie before app consumption.

## Why

An existing format is data, not a reason to change another editor's storage rules. Keeping
rich editing behind optional peers avoids charging every consumer for a large editor core.
A safe projection lets an app display retained notes without silently rewriting their original
source. Keyboard/history behavior belongs to the editor core, and accessible authoring controls
belong to the shared UI library. No AGPL reference implementation is copied into this MIT code.

## Evidence

- The owner asked for retained history and capabilities: “All the stuff Bambuddy has today?”
  (Hot Plate 3D project conversation, 2026-10-04).
- The project review identified retained HTML notes and explicitly authorized distinct shared
  HTML surfaces with untouched-source preservation before app consumption.
- Regression coverage verifies raw original form bytes until an edit, independent defaults,
  undo/redo, field wiring, hostile initial HTML/paste, encoded URL schemes, foreign namespaces
  and prohibited CSS. The editor and reader share the policy rather than duplicating it.
