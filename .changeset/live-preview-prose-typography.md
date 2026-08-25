---
"@charcuterie/ui": patch
---

Live preview: prose leading, and a code span that does not shout.

Two numbers, both wrong for a document of wrapped paragraphs:

- **`line-height` was CodeMirror's base `1.4`.** That is right for the thing the base
  theme was written for — a file of short lines you scan down — and too tight for prose
  read across a full measure. It is `1.6` now, on `.cm-content`, which is the same
  number Docket's own body copy has used since it shipped.
- **A code span was drawn at the same `font-size` as the prose around it.** A monospace
  face at an equal `px` size reads *larger*: fixed advance width, taller x-height. In an
  agent-written description, where a third of the nouns are file names in backticks,
  that turns the document into a wall of emphasis nobody asked for. `0.9em` now, so a
  code span inside a heading stays proportional to the heading.

Both apply to `MarkdownView` and to `MarkdownEditorCodeMirror` — one theme, one
document, and the read and write views of the same text must not reflow differently.

Reported against the consuming app: *"the text is still unreadable"*, on a task whose
instructions had been rendering at 17px Outfit with 1.4 leading and full-size
`Victor Mono` code spans throughout.
