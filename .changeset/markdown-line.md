---
"@charcuterie/ui": minor
---

`MarkdownLine` — one line of markdown, drawn with its inline marks and nothing else

For the strings that are a **name** rather than a document: a card title, a lane heading, a
table cell, a breadcrumb. Bold, italic, code, strikethrough and links render; a `#`, a `- `,
a `>` and a table pipe are literal characters, and a newline collapses to a space. Docket's
task titles are the first consumer — a grid of names set in one flat weight is a wall, and
the parts that tell two cards apart are exactly the parts markdown would have marked.

`toInlineMarkdownRuns` and `toPlainMarkdownText` ship beside it. The second is what every
`aria-label`, `title` attribute and `document.title` naming one of these lines should call:
it is the same parse the component renders from, so it cannot drift the way a second
"strip the markdown" regex does.

`href` is the load-bearing prop. A card title is usually a link to the card and may also
*contain* one — and an anchor inside an anchor is invalid HTML, so the browser closes the
outer one and the text after the inner link silently stops opening the card. Given `href`,
the component emits **siblings**: plain runs anchored to `href`, markdown links anchored to
their own destination, routed through `RouterLinkProvider` when the destination is the
router's and opened in a new tab when it is not.

It is a second markdown parser in this package, which is worth being nervous about — two
parsers are two answers to "what does this markdown mean". `MarkdownView` was not reusable
here: a CodeMirror state, a syntax tree and a decoration set per card is an absurd price for
forty characters, and the whole CodeMirror stack is an optional peer the main entry may not
reach. Three things keep the two honest instead: this one is inline-only, so there is no
block level to disagree about; the flanking rules are CommonMark's rather than a convenient
approximation, which is what keeps `ingest_the_files.sh` a file name; and both surfaces call
the **same** URL guard.

`safeUrls.ts` therefore moved up out of `markdownEditorCodeMirror/` into the shared source
root. Two surfaces taking a URL out of a document and putting it in an `href` is one
allowlist, not two. It is still exported from
`@charcuterie/ui/markdown-editor-codemirror`, unchanged.

**One rename, and it has no consumers.** `MarkdownLine` was already the name of a *type* —
`MarkdownEditor`'s painted-layer view of one line of a document — and a barrel cannot export
one name as both a type and a value. That type is now `MarkdownEditorLine`, and
`MarkdownLineKind` is `MarkdownEditorLineKind`. Both were checked across every repo in the
fleet before the rename: nothing outside this package has ever imported either, which is why
this is a minor rather than a major.
