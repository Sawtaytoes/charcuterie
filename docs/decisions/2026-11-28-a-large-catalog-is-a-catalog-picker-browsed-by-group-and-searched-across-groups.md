# A large catalog is a `CatalogPicker`, browsed by group and searched across groups

Status: Accepted
Date: 2026-11-28
Type: Component · API · Accessibility
Supersedes: None
Superseded by: None

## Decision

`@charcuterie/ui` ships **`CatalogPicker`**: the picker for one value out of a large catalog
whose rows fall into groups people think in — AI models by provider and account is the case
that brought it.

- **The trigger** is a `Picker`-style button showing the chosen item's mark and label, named
  `"<label>: <chosen label>"`.
- **The panel** has a vertical **rail** on the inline start — a **Favorites** tab first, when
  `favorites` resolves to any item, then one tab per group in `groups` order, leaving off a
  group with no rows — and beside it a **search field** over the **list** for the current tab.
  A row shows the group's mark (the app's icon, or an initials badge), the label, an optional
  description, a star on a favorite, and a check on the chosen row.
- **Typing searches every item**, whatever tab is current: a case-insensitive substring match
  on the label, the description and the group label, with every whitespace-separated word
  required. Results sit under one heading per group, in rail order; favorites are found under
  their group, not as a section. While a query is live, no rail tab is current.
- **Pinned rows** (`pinned: "start" | "end"`) sit at the top or bottom of every tab, and of the
  search results when they match.
- **Opening** lands on Favorites when the chosen value is a favorite or a pinned row; else on
  the chosen row's group; else on Favorites; else on the first group. The chosen row is
  highlighted and centred, the rule a `Combobox` follows
  ([2026-08-25](2026-08-25-a-combobox-opens-on-its-chosen-option-not-the-top-of-the-list.md)).
- **The ARIA shape**: the trigger opens a `role="dialog"` named by the trigger. The search
  field is a `role="combobox"` that keeps focus and moves `aria-activedescendant` through one
  `role="listbox"`, the `Combobox` contract; search results are labelled `role="group"`s in
  it. The rail is a vertical **`role="toolbar"` of `aria-pressed` buttons**, one tab stop.
  Tab and Shift+Tab move between the search field and the rail. Escape clears a query, then
  closes, and focus returns to the trigger.

`CatalogPicker` sits beside `Picker` and `Combobox` and replaces neither. A short list is still
a `Picker`; one flat list that wants a filter is still a `Combobox`.

## Context

The owner uses two internal apps, a task tracker and a dashboard, that each have an "Agent"
dropdown listing more than forty AI models as long text rows of the form
"Provider · Model name · model-slug". Neither had a filter. The owner pointed at the model
picker in T3 Code — a provider rail with favorites, a search over everything, and short rows
with a provider icon — as the pattern to follow. Both apps will use the same control, so it
belongs here.

## Why

**Neither sibling fits the catalog.** `Picker` has no filter. `Combobox` filters one flat list
by one string and has no way to show a part of the list, so forty rows that all start with a
provider's name stay forty rows until the person types something distinctive. The rail is the
browse half ("this provider's models"); the cross-group search is the find half ("I know the
name"), and it crosses the rail so that nobody has to know the provider first.

**A toolbar of toggle buttons, not a `tablist`.** The rail looks like tabs, but two things it
must say are things a tablist cannot: while a search runs, *no* tab is current, and an APG
tablist always has a selected tab; and the tab would have to control a tab panel, while what
the rail changes is a listbox that the search field also drives. A `role="toolbar"` of
`aria-pressed` buttons says exactly what is true and brings the APG toolbar keyboard contract —
one tab stop, arrows to move, Enter and Space to press.

**Substring, not word prefix.** `CommandPalette` matches word prefixes
([2026-10-16](2026-10-16-a-command-palette-matches-word-prefixes.md)) because its titles are
words. A model's slug (`ct-lumen-4`) and version (`4.5`) are things people type the middle of.

**A tab click clears the search.** A click on a group while a query is live shows that group.
Leaving the query in place would make the click do nothing visible, since search results
replace the tab's rows.

**The star and the check are drawn in CSS.** The library ships no icons and no symbol glyphs in
a default ([2026-07-29](2026-07-29-ship-no-icons-and-no-symbol-glyphs.md)); the first build typed
`✓`, which measured blank in this repo's headless Chromium. The provider icons are the app's;
a group without one gets an initials badge. `accentColor` is a ring around the mark, never the
fill or the text, so a consumer's color cannot fail the contrast gate.

**Not windowed.** `Combobox` windows above 100 rows, and the catalogs this was built for are 40
to 60. A catalog that needs windowing is a change to this component and a new record.

## Consequences

- `CatalogPicker`, `CatalogPickerProps`, `CatalogPickerGroup` and `CatalogPickerItem` are
  exported from the barrel; the component count in `sourceRules.test.ts` goes 80 → 81.
- `size` sets the trigger and every row, as a `Combobox`'s `itemSize` sets its search field and
  its options, and a short window steps the rows down (`usePanelItemSize`).
- The panel is 26rem by 28rem, capped to the space the window leaves, so a 384px window keeps
  the rail and narrows the list.
- `clearIcon` is optional, as on `CommandPalette`: without one there is no clear button, and
  Escape clears.

## Evidence

> "Look how slick this is in T3 Code. Much easier to navigate."

> "The issue is there's a whole bunch of text, no Combobox filter, and I can't easily find what
> I want."

— owner, 2026-11-28, on the "Agent" dropdowns of two internal apps, relayed in the
implementation brief.
