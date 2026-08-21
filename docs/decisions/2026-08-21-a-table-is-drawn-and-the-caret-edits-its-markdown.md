# A table is drawn, and the caret edits its markdown

- **Status:** Accepted
- **Date:** 2026-08-21
- **Type:** Component behaviour
- **Supersedes:** —
- **Superseded by:** —
- **Extends:** [2026-08-21 — the CodeMirror live-preview subpath is built](2026-08-21-the-codemirror-live-preview-subpath-is-built.md)

## Decision

`@charcuterie/ui/markdown-editor-codemirror` renders a GFM table as a real `<table>`, with
the column alignment the delimiter row asks for and inline markup rendering inside the
cells. It was the one construct the live-preview surface still showed as raw pipes.

The way back into the markdown is **the caret**, which is the rule the rest of the surface
already runs on:

- **Click a cell** and the table stands down, with the caret in that cell.
- **Arrow into it** — Down from the line above enters at the top, Up from below enters at
  the bottom.
- **Raw mode** shows every pipe, as it always did.

Four sub-decisions, each of which could have gone the other way:

1. **The block pass is a `StateField`, the inline pass stays a `ViewPlugin`.** Not a
   preference — CodeMirror throws `Block decorations may not be specified via plugins`. So
   `livePreviewRanges.ts` exports two functions over one walker: `toLivePreviewRanges`
   (viewport-limited, everything else) and `toLivePreviewTableRanges` (whole document,
   tables only), agreeing via a single `isTableRendered` predicate.
2. **The widest row wins, not the header.** GFM drops cells past the header's width; an
   editor that did the same would put text the author typed on screen nowhere. Short rows
   gain empty cells; nothing is ever hidden.
3. **Columns are read from the `|` positions, not from the cell nodes.** The parser emits
   no `TableCell` for `| |`, so a cell-node walk renders a row with a blank cell one column
   short and every cell after it shifted left — wrong in a way that looks like data loss.
4. **Arrow keys are intercepted at `Prec.high`.** CodeMirror moves the caret *over* a block
   widget, so without this a table is unreachable by keyboard and so is everything the
   caret would have passed on the way.

**Markdown is still the stored value, byte for byte.** The widget draws from descriptors
carrying document offsets; there is no serialiser, and a rendered table is a view over an
unmodified string exactly as a concealed `**` is.

## Context

The live-preview record shipped with a named gap: *"Tables still show raw pipes
(monospaced, aligned). Rendering real tables inside an editable surface is a much larger
job."* The owner's answer, the same day, was **"I think these look fantastic. Just need the
markdown tables."**

The larger-job estimate was right about the shape and wrong about the size. What made it
tractable is that the cell contents did not need new code: the walker that decorates a
paragraph decorates a table cell too, into a throwaway array, bounded by the cell's
subtree. `**` in a cell conceals for the same reason it conceals in prose, and a link in a
cell is the same `linkText` mark with the same click target. The only genuinely new code is
the geometry — which columns exist, how wide the table is, and where a click lands.

## Why

**Because a column is not a decoration.** Everything else this surface does hangs on text
CodeMirror is already drawing: hide these two characters, make this line bigger, colour this
range. A column cannot work that way, because column two's text is on four different lines
and no per-line decoration can align them. Either the markdown stops being drawn and
something else draws, or tables stay pipes forever. That is why this one construct needs a
widget and a block decoration when nothing else did.

**Because the caret is already the answer everywhere else.** A link, an image and a task
checkbox all conceal until the selection touches them. Making a table the exception — a
modal "edit table" affordance, an editable grid, a toolbar — would have been a second
interaction model for one construct. Clicking a cell to get the markdown back with the caret
in that cell is the same sentence the component already says about links.

**Because an editor may not hide what you typed.** GFM's cell-dropping rule is correct for a
*renderer*, where the markdown is elsewhere and inspectable. Here the rendering is the only
view most of the time, so a fifth cell in a four-column row has to appear somewhere. A table
one column wider than GitHub would draw is a visible, self-explaining wrong; a cell silently
missing is not.

## Evidence

- Owner, this session: **"I think these look fantastic. Just need the markdown tables."**
- Owner, on the surface generally: *"I'd like it to be a Notion/Outline style editor"* —
  and a Notion-style editor that renders every construct except tables is not one.
- `Block decorations may not be specified via plugins` — thrown by CodeMirror at mount, in
  the browser, on the first version of this change. The story rendered an error boundary,
  not a table; the split into two passes is that error's fix.
- Keyboard reachability was **measured, not assumed**: driving the story with ArrowDown
  logged the caret jumping `18 → 249`, straight over a table occupying `19–247`, and
  stopping at the document end. After the keymap, the same script walks into the table, down
  each of its rows, and out the other side.
- Cell offsets are relative to the table, resolved through `posAtDOM` at click time. A
  widget outlives the offsets it was built at: `eq` compares the table's markdown, so
  editing a paragraph *above* a table reuses the widget with every absolute offset in it
  stale. The `TaskWidget` beside it already learned this.
- The round trip holds: rendering a table, clicking into it and flipping to Markdown source
  returns the fixture byte-for-byte, with no HTML anywhere in the document.

## What would justify reversing it

A measured need to *edit* a table as a grid — tab between cells, add a row, drag a column —
which this deliberately does not do. That is a different component (an editable
`DataTable`), and it would want the document model this whole editor exists to avoid. If
that arrives, the honest move is a separate surface for it, not making this widget editable.
