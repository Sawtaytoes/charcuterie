# The CodeMirror live-preview subpath is built, and the textarea stays the default

- **Status:** Accepted
- **Date:** 2026-08-21
- **Type:** Dependency / Component architecture
- **Supersedes:** —
- **Superseded by:** —
- **Extends:** [2026-08-19 — the markdown editor is a `<textarea>` with a painted layer](2026-08-19-the-markdown-editor-is-a-textarea-with-a-painted-layer.md)

## Decision

The staged follow-up named in the 2026-08-19 record is now built:
`@charcuterie/ui/markdown-editor-codemirror` ships `MarkdownEditorCodeMirror`, an
Obsidian-style live-preview editor on CodeMirror 6, with every `@codemirror/*` and
`@lezer/*` package as an **optional peer**.

**This extends that decision rather than reversing it**, and the distinction is not a
formality:

- `MarkdownEditor` — the `<textarea>` with a painted layer — is **unchanged and remains the
  default**. It still adds zero runtime dependencies, and it is still what the barrel
  exports.
- A consumer that never imports the new subpath resolves, installs, audits and bundles none
  of CodeMirror. The `sourceRules` entry-point table enforces this: `@codemirror/*` appears
  in exactly one row.
- **Markdown is still the stored value, byte for byte.** There is no document model and no
  serialiser on either side.

Two behaviours also land in the **shared** command layer, so the textarea sibling gets them
too: GFM-style autolinking of bare URLs, and pasting a URL over a selection to produce
`[selection](url)`.

## Context

The 2026-08-19 record named its own reversal test:

> **What would justify reversing it.** A measured requirement for concealment or in-editor
> image rendering that survives the owner actually using the dimmed version; or a consumer
> whose bundle has room and whose editing is the app's primary surface.

Both halves came due at once, from the owner using the shipped version:

> "I took this link and added it to the Markdown zone, but did we have a way to preview it?
> It should only turn to Markdown when editing, right?"

and, when offered a read view instead:

> "I'd like it to be a Notion/Outline style editor, so you edit WYSIWIG, but you can click
> 'edit Markdown' or something or some weird icon to shift between Markdown and Edit modes.
> If that's too hard, then just Preview vs Edit mode is fine. But I'm assuming the WYSIWIG
> editor can't be _that_ hard."

### The assumption in that last sentence was right, and it was the trap

A WYSIWYG editor is genuinely easy — `@tiptap/react` and a starter kit is an afternoon. What
it costs is not difficulty, it is the **direction of authority**: an editor core makes its
document model the source of truth and markdown a serialisation of it, so any construct the
serialiser does not know about is silently dropped or silently becomes HTML. That is the
precise failure Docket exists to escape, and REQUIREMENTS §3.3 rules it out in as many words
("not a preview toggle, not a WYSIWYG that serialises down").

Presented with that distinction and a third option, the owner chose it:

> **"CodeMirror live preview (Recommended)"** — chat 2026-08-21

This is the important part of the record: **live preview is not a compromise between the
textarea and WYSIWYG.** It delivers what the owner actually described — headings that scale,
`**` that hides itself, links and images rendered, a toggle back to source — while keeping
the markdown text authoritative. The thing given up versus TipTap is structural editing
(dragging a list item), not appearance.

### A read view was the other candidate, and it is not being built

The handoff that opened this work scoped `react-markdown` + `remark-gfm` at 47 KB gz as a
read view, with the editor appearing on click. It is not being built, because live preview
subsumes it: there is no separate read state to switch into when the editing surface already
renders. Docket's `markdown-read-view-handoff.md` is superseded by this record.

## Why

**The packaging is what makes this additive.** The 2026-08-19 record specified the shape in
advance — "an optional subpath export (`@charcuterie/ui/markdown-editor-codemirror`) with
CodeMirror as an optional peer — the same packaging as `@charcuterie/ui/react-router`" — and
that is exactly what shipped, down to the export key. The reversal test in that record was
never about whether concealment was *desirable*; it was about whether anybody would pay for
it. Docket does. `slatecast` does not, and now does not have to.

**The costs, restated honestly rather than buried.** Measured in the prior record:
CodeMirror 6 hand-assembled is **176 KB gz**, versus 4 KB for the shipped textarea component.
The accessibility cost is the one that matters more: a `<textarea>` arrives with caret
movement, IME composition, spellcheck, the platform undo stack and `role="textbox"` from the
browser; a `contenteditable` re-earns each. CodeMirror is the most heavily exercised
implementation of that re-earning in the ecosystem, which makes the cost acceptable — not
absent.

**Concealment turned out to need a rule, not a list.** The first cut concealed every
"marker" node and produced two visible defects: a blank line where each ` ``` ` fence had
been, and a `>` hidden behind a blockquote bar that already said the same thing. The rule
that resolves both is *a mark persists unless something else already says what it said* —
the bar speaks for `>`, nothing speaks for a list's `-`, and a fence's language tag speaks
for itself.

**Focus is a decoration input.** The caret's resting offset of `0` counted as "inside" the
first construct in the document, so a description opening with a heading rendered its `#` on
load and no other heading's. It looked like a concealment bug and was a focus bug: an
unfocused editor has no caret and reveals nothing. Recorded because it is invisible in every
test that does not involve a real focused view — and it was caught by looking at a
screenshot, not by a passing suite.

**Prose is proportional here, and cannot be in the sibling.** The textarea's painted layer
only stays registered with the caret while every glyph keeps its advance width, which forces
one monospaced family across the whole document. CodeMirror has no such constraint, and
setting prose in a code font is the single biggest thing that made the surface still feel
like a code editor. Raw mode goes back to monospace, because a source view is code.

## Evidence

- Bundle numbers: the [prior record's](2026-08-19-the-markdown-editor-is-a-textarea-with-a-painted-layer.md)
  measured table. No new measurements were taken; the packaging is what changed.
- Provenance, re-checked rather than assumed: CodeMirror 6 and `@lezer/*` are Marijn
  Haverbeke (Netherlands), MIT. Not Chinese-origin, so the fleet constraint did not decide
  this — recorded so the next person does not redo the check.
- The concealment invariant is asserted at runtime, not just in unit tests: driving the
  component in Chromium and reading `.cm-content`'s `textContent` back returns
  `"Click into the **bold run** and its markers come back."` — the asterisks are on screen as
  nothing and in the document as themselves.
- `livePreviewRanges.test.ts` covers the rules above against the real GFM parser, in Node.
- Screenshots of every state, driven and looked at: `__screenshots__/` in this branch, and
  attached to the pull request.
