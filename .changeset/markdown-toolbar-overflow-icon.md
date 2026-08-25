---
"@charcuterie/ui": minor
---

`MarkdownEditorIcons` takes an `overflow` glyph, and both markdown editors pass it to the
toolbar's overflow trigger.

The bar already took nine icons and defaulted to nine word buttons, because the library
ships none. What it had no prop for was the tenth control — the bar's **own** "More
actions" trigger — so an app that passed the nine got nine glyphs and then two words at the
end of the row, at exactly the width where the row is tight enough to have collapsed.

`overflow` is in the same bag rather than a separate `overflowIcon` prop so that the icon
set is one object an app defines once and spreads into both editors.
