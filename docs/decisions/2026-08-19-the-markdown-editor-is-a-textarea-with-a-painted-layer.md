# The markdown editor is a `<textarea>` with a painted layer, not an editor core

- **Status:** Accepted
- **Date:** 2026-08-19
- **Type:** Dependency / Component architecture
- **Supersedes:** —
- **Superseded by:** —
- **Extended by:** [2026-08-21 — the CodeMirror live-preview subpath is built](2026-08-21-the-codemirror-live-preview-subpath-is-built.md), which builds the staged follow-up in point 3 below. Nothing in this record is reversed: the `<textarea>` stays the default and stays dependency-free.

## Decision

`MarkdownEditor` ships with **no new runtime dependency**. The editing surface is a real
`<textarea>`; a painted layer behind it in the same grid cell supplies the colour; and a
~300-line line-based tokenizer in this package turns markdown into `{ kind, text }` spans.

Three consequences are part of the decision rather than side effects of it:

1. **Markers are dimmed, not hidden.** Obsidian's live preview conceals `**` when the caret
   leaves the line. Concealing changes the line's width, and the caret lives in the textarea
   — so in this medium "reveal the raw syntax on the cursor's line" becomes a **contrast**
   change: `content-muted` markers everywhere, `intent-accent-content` markers on the line
   the caret is on.
2. **Every span style must be metric-neutral**, and a test measures it. Bold is faux bold
   (`text-shadow` at ±0.02em); italic is real because the surface is monospaced; headings
   get weight and colour rather than size.
3. **True concealment is a staged follow-up**, not a promise deferred vaguely. It needs a
   decoration-capable surface, which means CodeMirror 6, and if it is ever built it arrives
   as an **optional subpath export** (`@charcuterie/ui/markdown-editor-codemirror`) with
   CodeMirror as an optional peer — the same packaging as `@charcuterie/ui/react-router` —
   so a consumer that does not use it keeps paying nothing.

## Context

Docket's requirements ask for a *live hybrid* editor: renders as you type, raw syntax
visible on the cursor's line, markdown as the stored format, paste-image-at-cursor. Its own
handoff calls this "the single largest UI component and the one most likely to be
underestimated". Charcuterie is a **published** package suite, so whatever this component
depends on, every consumer of `@charcuterie/ui` depends on — for the life of the package.

### Measured, on this machine, not estimated

`esbuild --bundle --minify --format=esm --target=es2022`, React marked external, `gzip -9`.
The entry for each candidate imports what a markdown editor with headings, lists, links,
code, history and markdown round-tripping actually needs, not the package's smallest
possible import:

| Candidate | Version | minified | **gzipped** | Licence | Origin |
| --- | --- | --- | --- | --- | --- |
| TipTap + `starter-kit` + `tiptap-markdown` | 3.30.2 / 0.9.0 | 720 797 B | **237 933 B** | MIT | überdosis GmbH (DE) on ProseMirror (NL) |
| CodeMirror 6, `basicSetup` + `lang-markdown` | 6.0.2 / 6.5.2 | 609 029 B | **205 825 B** | MIT | Marijn Haverbeke (NL) |
| CodeMirror 6, hand-assembled minimum | 6.43.9 | 512 282 B | **175 827 B** | MIT | Marijn Haverbeke (NL) |
| Lexical + markdown/list/link/code/rich-text | 0.49.0 | 449 104 B | **147 545 B** | MIT | Meta (US) |
| `react-markdown` + `remark-gfm` *(read view only)* | 10.1.0 / 4.0.1 | 156 029 B | **47 011 B** | MIT | Titus Wormer (NL) |
| `markdown-it` *(parser only)* | 15.0.0 | 112 666 B | **47 801 B** | MIT | Vitaly Puzrin (RU) |
| `micromark` *(parser only)* | 4.0.2 | 53 291 B | **15 319 B** | MIT | Titus Wormer (NL) |
| `marked` *(parser only)* | 18.0.10 | 42 406 B | **12 646 B** | MIT | markedjs (US) |
| **`MarkdownEditor` as shipped** | — | 12 114 B | **4 399 B** | — | this package |

The last row is this component's three modules with React, `@charcuterie/*` and its sibling
components externalised — i.e. the code that is genuinely new. **Zero bytes of new
dependency.**

Two dependencies would have been *individually* defensible — `marked` at 12.6 KB gz to
tokenize, `micromark` at 15.3 KB — and neither is needed, because the painted layer wants
**character ranges**, not an AST and not HTML. A parser that returns HTML is the wrong shape
for this job twice over: it discards the offsets the layer needs, and it produces the one
artefact the whole component exists to keep out of the data.

### Provenance and licence, checked rather than assumed

The fleet rule is to avoid Chinese-origin software, and unclear origin is off-limits until
confirmed. Every candidate above resolves to a named maintainer or company in the
Netherlands, Germany, the United States or Russia; none is Chinese-origin, so **the
constraint did not decide this** and is recorded only so the next person does not redo the
check. Licences are MIT across the board — no AGPL, no GPL — which matters because Docket
will be open-sourced and Charcuterie is published.

## Why

**A dependency here is permanent and shared.** `@charcuterie/ui` is one package; a consumer
that never renders a markdown editor still resolves, installs and audits whatever this
component imports. `castkit/packages/slatecast` has **60 KB gz** of total budget and is the
reason `"./src/*"` is in this package's `exports` at all. Any of the four editor cores is
2.5x–4x that budget on its own.

**A `<textarea>` is the accessible starting point, and that is the part that cannot be
bought back later.** It arrives with caret movement, word-wise selection, `Home`/`End`, IME
composition, spellcheck, autocorrect, the platform's own undo stack, `role="textbox"` and
`aria-multiline="true"` — in every browser, tested by the vendors. A `contenteditable`
starts with none of those and re-earns each one; the two it never fully re-earns are IME and
undo. This library's central claim is that a keyboard and an agent can drive every
component, and a rich-text surface is the easiest thing in a design system to make unusable
with a keyboard.

**The no-HTML guarantee becomes structural instead of policed.** Docket exists partly
because HTML in a description field destroyed a previous tracker's data. A `<textarea>`
takes `text/plain` off the clipboard and nothing else; every command returns markdown; the
painted layer emits text nodes. There is no code path that could produce a tag, so there is
no sanitiser to get wrong and no serialiser to round-trip through. An editor core inverts
this: its document model is the source of truth and markdown is a *serialisation* of it, so
every construct the serialiser does not know about is silently lost or silently becomes
HTML. That is the exact failure mode being escaped.

**A hand-rolled `contenteditable` was never the alternative.** The choice was "editor core"
or "the platform's own text control". Building a decoration-capable editable surface from
scratch is a well-known tar pit and none of this reasoning is an argument for it.

**What this gives up, stated plainly.** No marker concealment. No inline image *rendering*
inside the editing surface (images render in the read view, and the editor shows
`![alt](url)`). No block-level type scaling — a heading is not visually larger while you
edit it. No cross-block structural editing (drag a list item). Anyone reversing this
decision should be reversing it for **those**, and should expect to pay 148–238 KB gz for
the privilege.

**What would justify reversing it.** A measured requirement for concealment or in-editor
image rendering that survives the owner actually using the dimmed version; or a consumer
whose bundle has room and whose editing is the app's primary surface. The reversal is
additive — an optional subpath beside this one — not a replacement, because the zero-cost
version is the right default for a component library even after a richer one exists.

## Evidence

Bundle numbers were produced in `/tmp/md-bundle-probe` on 2026-08-19 with the versions in
the table, `esbuild --bundle --minify --format=esm --target=es2022 --external:react
--external:react-dom`, then `gzip -9`. They are the only numbers in this record; nothing
here is an estimate.

The requirement, from Docket's `REQUIREMENTS.md` §3.3:

> Renders as you type, with the raw syntax visible on the cursor's line (Obsidian-style) —
> not a preview toggle, not a WYSIWYG that serialises down.
>
> - **Markdown is the stored format.** No HTML in the database.

and §3.4:

> **Paste or drag into the editor** → uploads and inserts `![](…)` **at the cursor**. […]
> Docket owns its own blob storage, so the URL is stable and ours.

The staging is the owner's own instruction to this build, recorded because it is what makes
a partial implementation the *right* answer rather than an excuse: *"If your honest
conclusion is that this should be built in stages, say so and build the first stage properly
rather than a shallow version of all of it."*

The metric-neutrality constraint is not a preference and is asserted rather than described:
`MarkdownEditor.test.tsx` measures a probe span in each span-kind class against plain text
in the real browser and fails if any of them is wider by half a pixel. It is the test that
catches somebody "fixing" the faux bold into a `font-bold`.
