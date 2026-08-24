---
"@charcuterie/ui": patch
---

Live preview: a link whose text carries markup no longer throws away the whole document's
rendering.

`MarkdownView` and `MarkdownEditorCodeMirror` read a link's closing `]` as **the sibling
after the opening `[`**. That is only the closing bracket when the link text is plain
words. Give the text an inline construct of its own and the parser puts that construct
between the two `LinkMark`s:

```md
[`2026-08-03-listbox-and-combobox`](./a.md)   <- InlineCode is the sibling
[**2026-08-11 status**](./b.md)               <- StrongEmphasis is the sibling
[see `code` here](./c.md)                     <- InlineCode is the sibling
```

For the first two the code span starts one character after the `[`, so the link-text mark
came out `from === to`. CodeMirror refuses an empty mark decoration — *"Mark decorations
may not be empty"* — and the `RangeError` leaves the **whole `ViewPlugin`**, so every
decoration in the document is lost and the reader is shown raw markdown. One link in a
12,000-character file did it, and nothing about the result points at a link.

The third case did not throw. It ended the link-text mark at the code span and began the
closing concealment there, so `` `code` here](./c.md) `` was hidden and the link stopped
mid-sentence.

An image's alt text hit the same read, and lost quietly: `![**a** screenshot](…)`
announced itself with an empty `alt`.

The closing bracket is now found by walking the direct siblings for the `LinkMark` whose
text is `]`.
