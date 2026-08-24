---
"@charcuterie/ui": patch
---

Fix the crash that dropped a **whole markdown document** to raw source when any link's
text carried inline markup — ``[`file.md`](path)``, `[**bold**](path)`,
`[*thin*](path)`, `[~~struck~~](path)` and every combination of them.

The range walk read a link's closing `]` as the node immediately after the opening `[`.
That node is the closing bracket only while the link text is plain prose, because plain
prose gets no node of its own. Any inline construct becomes that node instead, so the
link text measured `[` to the construct's own start — a **zero-length** range.
CodeMirror refuses an empty mark decoration (`Mark decorations may not be empty`), and
its answer to a view plugin that throws is to destroy it. Destroying it takes every
decoration in the file, so one link in one bullet stopped the entire document rendering:
headings, tables, task boxes and all.

Link text that began with plain prose failed more quietly and just as wrongly.
`[a *b*](path)` marked `a ` as the link, then concealed `*b*](path)` — because the
concealment run starts where that bracket is thought to be.

The closing bracket is now found as the first `LinkMark` **child** after the opener,
which is correct for every nesting CommonMark allows, including a nested image
(`[![alt](a.png)](url)`) whose own brackets belong to the image rather than the link.
The link-text mark is skipped only for `[](url)`, which genuinely has no text.

The same mistake made an image's `alt` come out empty whenever the alt text held inline
markup, without ever throwing, because an image's replace range covers its whole
construct and is never empty. ``![`code` shot](a.png)`` now reports `code shot` — the
plain-text rendering CommonMark specifies — instead of `""`.

**Live preview also fails soft now.** A malformed range is skipped rather than pushed,
and a throw while building decorations costs the current frame instead of the plugin. A
destroyed plugin never comes back for the life of the editor, so the surface stayed
broken until it was remounted; an empty frame repaints on the next update. One bad
construct degrades itself, never the page.
