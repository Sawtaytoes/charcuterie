---
"@charcuterie/ui": minor
---

`@charcuterie/ui/markdown-editor-codemirror` — Obsidian-style live preview, opt-in.

`MarkdownEditorCodeMirror` conceals `**`, `#` and `[](…)` once the caret leaves them, scales
headings for real, renders images in place, turns `- [ ]` into a clickable checkbox, and makes
bare URLs links. A `Markdown source` switch turns all of it off and shows the markup.

**The stored value is still markdown, byte for byte.** There is no document model and no
serialiser — live preview is decorations *over* the text, so concealing `**` hides two
characters that are still in the document and still in `onChange`. That is the whole reason
this is CodeMirror and not TipTap or Lexical, which invert the relationship and make markdown
a lossy export.

**Nothing changes for existing consumers.** `MarkdownEditor` — the `<textarea>` with a painted
layer — is untouched, still adds zero runtime dependencies, and is still the barrel's export
and the right default. Every `@codemirror/*` and `@lezer/*` package is an **optional peer**
reachable only from the new subpath, so an app that does not import it resolves, installs and
bundles none of it. Opting in costs ~176 KB gz; take it when the description field is a
primary surface, not when it is one field on a form.

Two improvements land in the shared command layer, so the `<textarea>` editor gets them too:

- **Bare URLs autolink.** `markdownSpans.ts` emitted a `url` span only from `[text](url)`, so a
  pasted link tokenized as prose and painted as prose. It now paints as a URL — which also
  fixes a bug that predates it, where the stretch between two underscores in a URL rendered as
  emphasis.
- **Pasting a URL over selected text wraps it** as `[selection](url)`, the way every other
  editor does. Deliberately strict — one absolute `http(s)` URL and nothing else — because
  mangling a literal paste is worse than not linkifying one.
