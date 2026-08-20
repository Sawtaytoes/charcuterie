---
"@charcuterie/ui": minor
---

`DataTable` — a table that reflows instead of scrolling, sized by its container

The fleet's tables are hand-rolled, and the three in `bambuddy`/`spoolbuddy` convey sort
direction with a bare glyph, put `onClick` on the `<th>`, and have no keyboard path at all.
`SortableTableHeader` fixed the header cell in 1.0.0; this is the rest of the table.

```tsx
<DataTable
  columns={columns}
  getRowKey={(task) => task.id}
  label="Tasks"
  onSortChange={setSort}
  rows={sortedTasks}
  selection={{ getRowLabel, onSelectionChange, selectedRowKeys }}
  sort={sort}
/>
```

**`SortableTableHeader` is composed, not replaced.** It keeps its export, its API and its
docs page, and every sortable column renders it — so this release is a minor and there is
**no migration**. It is also why the component is a real `<table>`: a `<div role="row">`
grid cannot host a `<th>`.

**Narrow means reflow.** Below `--cq-md` (32rem) of its own **container** — not the window,
which is a different number entirely at 175% zoom or inside a board lane — each row becomes
a labelled block and the header row wraps into a strip of sort controls, so sorting survives
the layout that has no header row. No horizontal scroll, and no columns dropped.

**What it does not own:** sorting the data (comparison is per-column — `priority` is not
alphabetical), the selected set (nothing owns "these five rows"; `selectedRowKeys` is the
consumer's), column widths (`column.className`, over the browser's own auto layout), and
virtualisation (measured usable to ~1,000 rows; past that, filter or page). Reasons and
numbers: `docs/decisions/2026-08-19-the-data-table-composes-sortabletableheader-reflows-and-does-not-virtualise.md`.

`Checkbox` also paints `:indeterminate` now — the mixed state a select-all box is in when
some rows are ticked. It painted **nothing** before: the DOM property was set, screen
readers announced "mixed", and the `appearance-none` box was indistinguishable from empty.
