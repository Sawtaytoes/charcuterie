---
"@charcuterie/ui": minor
---

`MarkdownEditorCodeMirror` renders GFM tables.

The live-preview surface drew every construct but one: a table stayed raw pipes. It is now a
real `<table>` — column alignment from the delimiter row, and `**bold**`, `` `code` ``,
links and images rendering inside the cells the same way they render in a paragraph.

The caret is the way back into the markdown, as it is for a link or an image. Click a cell
and the table stands down with the caret in that cell; Down from the line above enters at
the top row, Up from below at the bottom. Raw mode is unchanged.

Also: an escape (`\|`, `\*`) now conceals its backslash like any other marker, which is what
made escaped pipes readable in a cell.

Additive and behind the same optional subpath — no new dependency, and nothing changes for
`MarkdownEditor` or for consumers that never import
`@charcuterie/ui/markdown-editor-codemirror`.
