# A deprecation is a badge in place, and the sidebar has groups

**Status:** Accepted
**Date:** 2026-08-21
**Type:** Docs · Storybook
**Supersedes:** the "moved to `Deprecated/Select`" clause of
[2026-08-20 — Native `Select` is deprecated, and the platform hatch is closed](2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md)
(the deprecation itself, and everything else in that record, stands)
**Superseded by:** —

## Decision

**A deprecated component keeps its place in the sidebar and gets a badge.** There is no
`Deprecated/` section. The mark is `tags: ["deprecated"]` on the story meta, drawn by
`sidebar.renderLabel` from `@charcuterie/storybook-config/manager`, and it sits **beside**
the `@deprecated` JSDoc rather than instead of it — the two are read at different moments,
by the same person.

**The sidebar is grouped.** Six groups under `Components`, and the roots that held one item
each are gone:

```
Guides/       Building an app · Routing
Components/
  Actions/    does something — Button · ButtonLink · IconButton · TextLink · Menu · Toolbar
  Controls/   takes a value — Field · Checkbox · Switch · RadioGroup · SegmentedControl
              Picker · Listbox · Combobox · Select · DatePicker · MarkdownEditor
              FileDropZone · Swatch · QueryBuilder
  Overlays/   renders over the page — Dialog · Modal · Popover · Tooltip · Lightbox · Toast
  Layout/     arranges other things — Shell · Header · Rail · Main · AdaptiveGrid · Card
              Board · Tabs · Accordion
  Data/       shows a set — DataTable · SortableTableHeader · MediaTile · Badge · LogViewer
  Feedback/   reports state — Alert · Spinner · ProgressBar · Skeleton · EmptyState
              LiveStatusIndicator
Tokens/       Overview · Specimen
Utilities/    not a composable component — Scrollbar · VisuallyHidden
              ColorSchemeSwitcher · ColorSchemeToggle
```

`Foundation`, which held `VisuallyHidden` alone, is folded into `Utilities`. The group name
is **`Controls`**, not `Forms` — a `Picker` in a toolbar is not in a form, and the codebase
already speaks this way (`CONTROL_SIZE_CLASS`, `controlClassName`, "controls share one
height").

## Context

The owner, on the day the deprecation shipped:

> "Storybook has labels, and the TS types should also have an `@deprecated`. We should use
> both rather than moving it."
>
> "Also, the categories in Charcuterie make no sense. There's Foundation with 1 item and
> Utilities with 1 item and Tokens with 1 item. We should revise those; maybe make some
> subfolders for things related like forms or controls and other utilities separately."

The 08-20 record moved `Select` to a `Deprecated/` root and called the sidebar "the first
place an agent looks for a picker". The first half of that is right and the conclusion drawn
from it was wrong.

## Why a badge rather than a section

- **A section hides the warning from the only person who needs it.** Somebody scanning
  `Controls` for a picker finds `Picker`, `Listbox` and `Combobox`, and no reason to suspect
  a fourth one ever existed. They were never going to open `Deprecated/`. The badge is on the
  path they are already walking.
- **It separates the component from its replacement.** `Select` sitting two rows from
  `Picker` is the migration, visible. In its own folder it is a curiosity with no context.
- **Storybook already models this.** Tags are free-form and the manager composes a component
  entry's tags as the **intersection of its children's**, so a tag on the meta lands on the
  `Select` node itself and never leaks up to `Components/Controls`, which would need every
  child deprecated to qualify. Nothing had to be invented.
- **The two signals fire at different moments and neither replaces the other.**
  `@deprecated` strikes the identifier through while the wrong import is being typed; the
  badge answers "which of these four pickers is the one I should not use" while the choice is
  still being made. The 08-20 record treated them as alternatives.

## Why the groups

Three roots held exactly one entry — `Foundation/VisuallyHidden`, `Utilities/Scrollbar`,
`Tokens/Specimen` — while `Components` held forty-eight in one alphabetical column. A
top-level heading that exists to introduce one item is pure overhead, and a
forty-eight-item scroll makes the reader do the categorising the sidebar was supposed to
have done. Both are the same failure at opposite ends.

Groups nest **under `Components`** rather than being promoted to roots, so "where does a
component live" keeps one answer, and the root count stays at four.

Order is not alphabetical, in either dimension: roots run in reading order so the guide is
above the components it describes, and the groups run from what an app reaches for first to
what it reaches for last. Everything the order list does not name keeps **index order**
(`method` defaults to `configure`), which is what preserves components staying alphabetical
inside their group and each component's `Docs` page staying above its stories — the latter
comes from `main.ts` listing `*.mdx` before `*.stories.tsx`, and an alphabetical fallback
would undo it by sorting `All Variants` first.

## Two things that bite, recorded so they are not rediscovered

- **`storySort` must be an inline literal.** Storybook reads it out of `preview.tsx` with a
  Babel pass at index time rather than by importing the module: a reference to a `const`
  declared above throws *"storySort must be defined inline"*, and the function form is
  `eval`'d in isolation, so it cannot see module scope either.
- **Manager code must not use the automatic JSX runtime.** The manager bundle maps `react`,
  `react-dom` and `react-dom/client` to its own globals — and **not `react/jsx-runtime`**.
  A `.tsx` file compiled with `jsx: "react-jsx"` therefore drags a *second* React into the
  manager, whose elements the manager's React does not recognise: the entire sidebar dies
  with minified React error #31 and the only thing on screen is Storybook's error panel.
  `renderSidebarLabel` uses `createElement` for that reason, in a `.ts` file.

## Cost

Every story id changes with its title, so this cycle's VRT run reports the whole suite as
new-plus-deleted rather than as diffs, and any bookmarked `?path=/docs/components-<name>--docs`
URL now 404s into the "story not found" screen. Both were accepted rather than pinned around:
freezing `id` on every meta to preserve the old ids would permanently encode the taxonomy this
record replaces, and would have to be repeated on every component added afterwards.

## Evidence

Owner, 2026-08-21, both quotes above. Taxonomy and the `Controls` name chosen by the owner
from three candidate trees.
