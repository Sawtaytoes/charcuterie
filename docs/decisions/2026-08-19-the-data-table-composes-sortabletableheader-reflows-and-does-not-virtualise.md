# `DataTable` composes `SortableTableHeader`, reflows instead of scrolling, and does not virtualise

- **Status:** Accepted
- **Date:** 2026-08-19
- **Type:** Component design
- **Supersedes:** —
- **Superseded by:** —

## Decision

`DataTable` ships in `@charcuterie/ui` as a **real `<table>`** that **composes**
`SortableTableHeader`, **reflows** to a labelled-block layout below `--cq-md` (32rem) of
its own **container**, and ships **no virtualiser**.

Six sub-decisions, each with its consequence stated:

1. **`SortableTableHeader` is composed, not subsumed, and not deprecated.** Every sortable
   column renders it. **Migration consequence: none.** Its API, its export, its docs page
   and its one existing consumer (mux-magic's `FileExplorerModal`) are untouched, and this
   release is a **minor** — a `major` was the alternative, and it would have bought nothing.
2. **A real `<table>`**, not a grid of `<div role="row">`s.
3. **Explicit ARIA roles on every part**, even though they are redundant while the table
   has `display: table`.
4. **Narrow means reflow**, not horizontal scroll and not dropped columns.
5. **The consumer sorts the data and owns the selected set**; the component owns the
   announcement, the controls and the paint. **Column widths are the consumer's**, written
   as `column.className`; there is no drag-to-resize.
6. **No virtualisation.** The usable ceiling is ~1,000 rows, measured; past that a consumer
   filters, pages, or reaches for something else.

One additive fix rode along, found by building this: **`Checkbox` now paints
`:indeterminate`.** It painted nothing before — the property was set, screen readers
announced "mixed", and the box on screen was indistinguishable from empty.

## Context

The consumer is **Docket**, the household task tracker: task lists, the backlog surface,
and search results. Its requirements name a data table as one of four gaps Charcuterie has
and say to push it upstream rather than keep it local, so this is the upstream half.

Docket's §3.2 also settles the layout question before it is asked, and not in the abstract:

> A lane in a three-up board is *narrow* even on a 4K display, so this must be **CSS
> container queries** (`container-type: inline-size` on the lane/list), never media
> queries.

> **The owner browses zoomed in.** Window-width breakpoints therefore lie: a "wide" 1500px
> window at 175% zoom is ~860 effective CSS pixels.

> **No horizontal scroll, ever.**

### `SortableTableHeader` was already shipped, and that is the whole of the third option

Three ways to relate to it: wrap it, compose it, subsume it. Subsuming means deleting a
component that is in a published `1.0.0` — a **breaking change**, a `major`, and a
migration for a consumer that is presently *correct*. It buys one thing: not having two
exports. Composing costs one thing: two exports.

The header is also the reason the table is a `<table>` at all. It renders a `<th>`, and a
`<div role="row">` grid cannot host one — so the div-grid design would have forced either
duplicating the header or breaking it. The decision to compose and the decision to use real
table markup are the same decision.

### Table semantics under a `display` change — measured, not recited

The reflow takes `display` away from the table elements, and the received wisdom is that
table semantics travel with `display`. Measured in this sandbox's chromium through CDP
`Accessibility.getFullAXTree`:

| Markup | `<table>` role | `<tr>` | `<th scope=col>` | `<td>` | `<tbody>` |
| --- | --- | --- | --- | --- | --- |
| `display: table` (default) | `table` | `row` | `columnheader` | `cell` | ignored |
| `display: block` on every part | `table` | `row` | `columnheader` | `cell` | ignored |
| `display: block` + explicit roles | `table` | `row` | `columnheader` | `cell` | **`rowgroup`** |

So in **this** engine the roles are a no-op, and the only measured difference is that
`<tbody>` stops being ignored — a second rowgroup beside `<thead>`'s, which is what a table
with two rowgroups is supposed to look like.

They are kept anyway, and the reason is the engine that could not be measured here: the
consumer is driven from a tablet, so **WebKit is the narrow layout's primary browser**, and
the narrow layout is precisely where the column headers are no longer on screen to be read.
`biome`'s `noRedundantRoles` disagrees; it is suppressed once at the top of the file with
that argument written out.

### Virtualisation, measured

`@tanstack/react-virtual` is **already a dependency** of `@charcuterie/ui` (`Combobox` uses
it), so this is not a dependency question — MIT, US-maintained, already vetted and already
paid for. It is a design question, and the numbers decide it.

Measured through the Storybook dev server (React development build, chromium, 1280x900,
five columns, no selection column), median of three runs. Load is `goto` → last row in the
DOM → two frames; sort is an in-page `button.click()` → two frames.

| Rows | Load, minus the 220ms empty-table baseline | Sort → painted |
| --- | --- | --- |
| 100 | ~0 ms | 67–76 ms |
| 1,000 | ~835 ms | 293–422 ms |
| 5,000 | ~2.6 s | 1.6–2.0 s |
| 10,000 | ~5.8 s | 3.5–4.0 s |

A production build is faster than a dev build; the *shape* is what matters and it is linear
with a knee between 1,000 and 5,000. Docket's real corpus, from the Vikunja seed it is
replacing, is **564 items** — with the largest single view, the anime backlog, at **322**.

## Why

**Composing costs an export; subsuming costs a consumer.** `SortableTableHeader` is correct,
tested, documented, and in use. The only argument for absorbing it is tidiness of the export
list, and 1.0.0 is a promise that outranks tidiness. Keeping it also keeps exactly one place
in the fleet that knows `aria-sort` goes on the `<th>` while the button goes inside it —
which was the component's entire reason to exist, and which the fleet still gets wrong in
three hand-rolled tables.

**Reflow is the only one of the three narrow strategies that neither hides data nor
scrolls.** Horizontal scroll is what WCAG 2.2 SC 1.4.10 exists about and what the consumer
bans outright; it also hides the *existence* of the off-screen columns. Dropping columns by
priority is the cheapest to build and the only option that **loses data** — the assignee
does not come back, and no gesture asks for it. Reflow keeps every value on screen and
keeps sorting reachable, because the header row becomes a wrapping strip of sort controls
rather than disappearing.

**A container query is the only query that can be right here.** The window is not the
element. A table in a board lane is 240px wide on a 1280px window — which is exactly what
the `Responsive` story renders and what the test asserts: three tables, one window, and the
cell's computed `display` is `flex` in two of them and `table-cell` in the third with no
viewport change at all. At 175% zoom the window number is not even the right *kind* of
number.

**Sorting is the consumer's because comparison is per-column.** `priority` sorts
high → medium → low; alphabetically that is high → low → medium. A table that sorted its own
rows would need a comparator per column handed to it — the same code, one layer further from
the data it is about. The component owns what every table gets wrong the same way (`aria-sort`,
one sorted column, a real button) and nothing else.

**Selection is the consumer's for the opposite reason `Checkbox`'s checkedness is not.**
The platform owns a checkbox's state — that is why `Checkbox` is uncontrolled and why
[`Select` owns no value](2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md).
Nothing owns "these five rows": the count in a toolbar, the bulk action and the undo are all
outside the table, so the set lives with the consumer and the table renders it.

Keeping a controlled set authoritative over an uncontrolled `Checkbox` is done by **writing
to the input** — an effect that sets `input.checked` — rather than re-mounting it with a
state-bearing `key`. A re-mount throws focus away one row into a keyboard pass down the
column, and there is a test that fails if anyone swaps it back. It is also the only way to
express the header box's third state at all: `indeterminate` is a DOM property with **no
HTML attribute**, so no markup could ever have set it.

**No virtualiser, because the row that is not in the DOM is not in the accessibility tree
and not in the column-width calculation.** Virtualising a table means fixing row heights and
abandoning the browser's auto column layout — the algorithm that makes a table worth using —
and it means `aria-rowcount`/`aria-rowindex` bookkeeping that is wrong the moment it drifts.
At the consumer's real corpus the feature would buy nothing: 564 rows is 20% of the way to a
knee that ~1,000 rows still clears in under half a second. The cliff is real and it is
documented rather than hidden: past ~1,000 rows, filter or page. A virtualised table is a
**different component**, not a flag on this one, because it has to give up two of this one's
properties to work.

## Evidence

Docket `REQUIREMENTS.md` §10, on where this belongs:

> **Gaps Docket must fill, and should push upstream rather than keep local:** a markdown
> editor, a date picker, a **data table**, and a board/kanban primitive.

Docket `REQUIREMENTS.md` §3.2, on the owner's own answer to the row-shape question:

> "2-line looks good for phases because if you look at the narrow view… looks good with 1
> line when wide… For a really wide view, I think we should make them cards or something."

The container-query claim is a test, not a screenshot caption
(`DataTable.test.tsx`, "the layout follows the container, not the window"):

```ts
await expect(globalThis.getComputedStyle(narrowCell).display).toBe("flex")
await expect(globalThis.getComputedStyle(wideCell).display).toBe("table-cell")
```

— both at `window.innerWidth === 1440`, with the narrow table's container at 240px.

The AX-tree measurement is `Accessibility.getFullAXTree` over four markup variants in a
launched chromium, run before the roles were written rather than after.

The `indeterminate` defect was found by looking at the screenshot rather than at the test:
`selectAllInput.indeterminate` was `true`, the assertion passed, and the box was empty on
screen — `Checkbox` renders `appearance-none`, so an unstyled `:indeterminate` paints
nothing at all.
