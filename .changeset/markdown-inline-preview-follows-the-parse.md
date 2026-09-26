---
"@charcuterie/ui": patch
---

The markdown live preview restyles when the background parse catches up. Its inline decorations rebuilt only on edits, selection, viewport, focus and option changes, so a document whose parse finished after mount showed its last lines raw — a fenced block and a link as plain text — until the reader clicked. The table pass already compared the syntax tree; the inline pass now does too.
