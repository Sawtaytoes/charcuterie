---
"@charcuterie/ui": patch
---

`MarkdownEditorCodeMirror`: a visible caret, and the whole frame takes a click

Two ways the live-preview editor did not behave like the `<textarea>` it replaced, both
reported from Docket's comment box in dark mode.

**The caret was black.** CodeMirror sets `caret-color` per light/dark class, and those
classes track whether a *CodeMirror theme* declared `dark: true` — not what scheme the
page is painted in. Charcuterie has one theme for both schemes because every colour in it
is a token, so the editor is always `cm-light` and the caret was always `black`: invisible
on `surface-base`. It is now `var(--color-content-primary)`, the same token as the text,
so it follows the scheme by construction.

**The bottom of the box focused nothing.** `.cm-content` is the `contenteditable`, and the
frame's `min-height` never reached it: a two-line document inside an 8rem frame left most
of the box as the host `<div>`. The height is now handed down the stack — the editor
stretches in a flex column, the scroller stretches inside it, and the content stretches
inside that — so every pixel of the frame is the text field. A document taller than the
frame still grows it rather than scrolling inside it.
