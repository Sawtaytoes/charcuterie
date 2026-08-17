# @charcuterie/ui

## 2.18.0

### Minor Changes

- ba95045: `Checkbox` accepts `value` — the `<input>`'s `value` attribute, i.e. which member of a
  group the box is, as opposed to whether it is ticked.

  A lone boolean does not need it. A group does: a group is read back with one query over
  its container (`[...group.querySelectorAll("input")].filter(i => i.checked).map(i =>
i.value)`), and without a `value` every box answers the UA default `"on"`, so that read
  returns N copies of one meaningless string. That gap is why queuepilot's library and
  ratings pickers were still hand-rolling a raw `<input type="checkbox">` rather than
  adopting this component.

  Passed straight through and otherwise inert — it is not the checked state and does not
  become one. `isChecked` still seeds the box and `onChange` still reports a boolean, so
  nothing about the uncontrolled contract changes.

## 2.17.0

### Minor Changes

- 640b333: `MediaTile` can be a button. `onClick` gets the same hover, focus-visible
  ring and `cursor-pointer` the `href` link already had. Wrapping the tile
  in a bare `<button>` is how a Collection thumbnail ended up with a text
  cursor and no hover at all.

  An empty `title` skips the caption (the parent already printed the name)
  and the control is named from `alt`.

## 2.16.0

### Minor Changes

- 4e958fc: `className` can now override a component's base utilities. It could not before,
  and failed silently when it did not.

  `toClassName` was a filter-and-join with no conflict resolution, so
  `getControlClassName(CONTROL_BASE_CLASS, …, className)` emitted both classes and
  let the generated stylesheet's source order pick a winner. A caller writing
  `<Button className="hidden lg:inline-flex" />` got
  `class="inline-flex … hidden lg:inline-flex"`, where `.hidden` and `.inline-flex`
  sit at equal specificity — so the caller could not win, whatever they wrote. The
  same applied to every base-class category a consumer might reasonably override:
  display, `rounded-md`, `border`, `whitespace-nowrap`, `font-medium`, and the
  `h-`/`px-`/`text-` triplet from `CONTROL_SIZE_CLASS`.

  It failed invisibly. mail-sifter used exactly that class to hide a duplicate
  header button below `lg`; it never hid, and went unnoticed for weeks because the
  header happened to fit anyway — surfacing only when an unrelated type-ramp change
  pushed it 37px wider and scrolled the page sideways. Two other repos hit the same
  shape independently.

  `toClassName` now resolves conflicts with `tailwind-merge` — the third runtime
  dependency this package has taken (MIT, ~7 KB gz, no transitive deps). The
  docblock's standing argument against a dependency was about `clsx`'s object and
  nested-array forms hurting static scanning; that does not transfer, since the
  _input_ shape here is unchanged and every call site stays statically scannable.

  **Nothing this package emits changes.** That was measured, not assumed: the merge
  is a no-op across all 358 class-string literals in `src` and all 288 strings
  `getControlClassName` composes, and both checks are now tests. So this only ever
  acts on a genuine caller conflict.

  `ease-standard` is registered explicitly in the merge config — it is ours, from
  the motion tokens, and would otherwise land in no class group and fail to merge.

  Fixes #81.

### Patch Changes

- 95f973f: `useAnchoredOverlay` now prefers the trigger's own `id` instead of cloning a
  generated one over it.

  It minted an id so the portalled panel could point `aria-labelledby` across at
  the trigger. That is still needed — a bare `role="listbox"` is an ARIA input
  field and must be named — but any id serves, including the caller's, and
  overwriting had a consequence nobody traced: `Field` clones a `controlId` onto
  its child and renders `<label htmlFor={controlId}>`, so for every
  `Picker`/`Listbox`/`Combobox`/`Menu` inside a `Field` the label pointed at an
  element that did not exist.

  It failed silently. A dangling `htmlFor` throws nothing and renders nothing —
  the only way to see it was to look up the id in the DOM and find zero nodes.
  That is the same defect `Field`'s own docstring calls "precisely the defect this
  component was built to make impossible", arriving by a different route.

  Found while migrating points-market onto `Picker`, where it reproduced
  identically before and after the migration — so it is long-standing, not new.
  Two rediscoveries of the overwrite were already in the fleet: queuepilot and
  mux-magic both moved their e2e handles to `data-testid` because `id` "did not
  survive". `data-testid` remains the sturdier handle; `id` is no longer a trap.

  Fixes #99.

## 2.15.1

### Patch Changes

- Updated dependencies [3ac1684]
  - @charcuterie/logic@2.0.0

## 2.15.0

### Minor Changes

- 2ffc7c9: `Picker` — a `Listbox` with its trigger already attached

  The fleet wrote this same wrapper four separate times after `Listbox` became the default
  picker: queuepilot's `SelectListbox`, board-games' `SelectMenu` (on `useState` rather than
  the state layer), mux-magic's `ListboxPicker`, and twice inside this package
  (`QueryBuilderCombinator` and `QueryBuilder`'s own story), each with its own hand-rolled
  chevron.

  ```tsx
  <Picker
    label="Language"
    onChange={setLanguage}
    options={[{ label: "English", value: "eng" }]}
    value={language}
  />
  ```

  `Listbox` is **unchanged** — staying trigger-agnostic is what lets it hang off a tile or a
  table header. `Picker` is the assembled default beside it.

  Two things worth knowing when migrating a hand-rolled version:

  - **The accessible name is `"<label>: <value>"`**, not the bare label. The trigger's visible
    text is the value, and WCAG 2.5.3 wants the visible text inside the accessible name — a
    bare `aria-label={label}` fails it. Query with `getByRole("button", { name: /^Label: / })`.
  - **`id` does not survive.** `useAnchoredOverlay` overwrites the trigger's `id` so the
    portalled listbox can name itself from it; use `data-testid`, which nothing injects.

## 2.14.0

### Minor Changes

- 782845f: `QueryBuilder`'s combinator picker is a `Listbox`, not a native `Select`

  The component shipped with a native `Select` for each group's "Match" control, one day after
  [the 2026-08-10 record](../docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md)
  demoted `Select` to a stated-reason exception. `charcuterie/prefer-listbox-over-select` did not
  catch it: the component-choice block is scoped to app packages and exempts `@charcuterie/ui` —
  correct for a primitive, wrong for a composite an app consumes whole.

  **Breaking for tests, not for props.** The control is now a button that opens a listbox, so
  `getByRole("combobox", { name: "Match" })` no longer finds it. Query
  `getByRole("button", { name: /^Match: / })` instead. The name carries the current combinator
  because the trigger's visible text is that value and WCAG 2.5.3 wants the visible text
  contained in the accessible name.

  Adds `labels.match` (default `"Match"`) to rename the caption.

  Adds `renderCombinator`, so an app can own the group's combinator control the way it already
  owns `renderLeaf`. The default single picker stays right for a combinator that is a plain
  enum; it is the wrong shape for one that is a _product_ — mux-magic's is a quantifier
  (ANY/ALL/NO) crossed with a target (nested groups, style rows, script-info blocks), whose
  legal pairs are asymmetric (`notAllScriptInfo` exists, `notAllStyle` does not). Flattened into
  one list that asymmetry is invisible; split into two filtered pickers it cannot be built.

## 2.13.0

### Minor Changes

- e248b99: Add `QueryBuilder` (`@charcuterie/ui`) and `createTree` (`@charcuterie/logic`): a generic, arbitrarily-nestable group editor with an opaque leaf value **and** an opaque group combinator. `createTree` is a headless normalized-tree state core (add/remove/move/patch, stable ids, `serialize`) with React and Preact bindings; `QueryBuilder` renders nestable combinator groups with a `renderLeaf` render-prop. Built to be shared by Mail Sifter's nested mail rules (AND/OR) and mux-magic's job DSL (any/all/none).

### Patch Changes

- Updated dependencies [e248b99]
  - @charcuterie/logic@1.5.0

## 2.12.1

### Patch Changes

- Updated dependencies [d32f5d3]
  - @charcuterie/logic@1.4.0

## 2.12.0

### Minor Changes

- 94f97dd: **`Toolbar`, and the `useMediaQuery` it is built beside** — the fleet's
  toolbar-with-overflow, unified.

  `@charcuterie/ui` gains `Toolbar`: real APG toolbar semantics (one tab stop, arrow-key
  roving focus through `RovingFocus`), priority-ordered actions, and progressive overflow
  that is **measured** rather than breakpointed. Exactly one instance of every control is
  mounted at any width — it moves between the bar and the overflow rather than being
  rendered twice and hidden by a media query. The overflow trigger exists only when
  something actually overflowed.

  The overflow's role is a **type, not a flag**: `overflow="menu"` narrows `items` to
  actions and opens a real `role="menu"`; `overflow="panel"` accepts `control` items too and
  opens a `Popover` (`role="dialog"`, `aria-haspopup="dialog"`), because `role="menu"`
  permits only the `menuitem` family and a toggle inside one is invalid ARIA.

  `@charcuterie/logic` gains `useMediaQuery` (React and Preact) over a new
  `createMediaQuery` core and an injected `MediaQueryMatcher` seam, with
  `matchMediaMatcher(query)` in `@charcuterie/logic/browser`. Read-only by design: the
  environment owns the value.

  Also: `expectAgentDrivable` can now see a roving `role="toolbar"`. `toolbar` had been in
  its composite-role set since M4 and was unreachable, because a toolbar's members are
  ordinary buttons rather than a `menuitem`-style role — so a correct roving toolbar was
  rejected outright with "has a negative tabindex". floating-ui's `aria-hidden` focus guards
  are excluded from the tab-stop count for the same assertion.

### Patch Changes

- Updated dependencies [94f97dd]
  - @charcuterie/logic@1.3.0

## 2.11.0

### Minor Changes

- 5bd3390: Keep a `Combobox` option's layout stable across selection, and cap the popover's width.

  Two `Combobox` fixes:

  - **Selected checkmark no longer shifts the label (#8).** `ComboboxOption` used to
    render the ✓ only when a row was selected, so the label's available width changed the
    instant it became selected — a consumer whose label pins a trailing element (a category
    tag) to the row's right edge saw that element jump left. The ✓ is now always laid out in
    a fixed-width gutter and merely made `invisible` when unselected, so selection is a
    paint-only change. Aria semantics are unchanged: selection is still conveyed by the
    button's `aria-selected`, and the glyph stays `aria-hidden`.

  - **Overlong footers/options no longer stretch the panel (#12).** `useAnchoredOverlay`
    gains a `maxWidthPx` option, symmetric with `maxHeightPx`, wired into its `size`
    middleware (`min(maxWidthPx, availableWidth)`). `Combobox` passes a 384px default cap and
    now lets its footer wrap (`whitespace-normal` / `break-words` / `overflow-wrap`), so a
    full-sentence `footer` — or a very long option label — wraps instead of dragging the
    whole popover absurdly wide. The `min-w-64` floor is unchanged. Other overlay consumers
    (`Popover`, `Menu`, `Listbox`) opt in by passing the new option; their behaviour is
    untouched.

## 2.10.2

### Patch Changes

- 5435f30: Strengthen `content.muted` so the highlighted option row clears AA — and derive the audit's
  role lists from their unions instead of typing them out.

  [#72](https://github.com/Sawtaytoes/charcuterie/pull/72) closed the interactive-state hole
  and recorded one it could not fix from a hover token: `content.muted` on
  `intent.neutral.surfaceHover` — the highlighted row in `Listbox`, `Combobox` and `Menu` —
  failing AA in four of eight variant/scheme combinations.

  Extending the gate structurally rather than adding that one pair found **12 failures, not
  4**. The **selected** row (`intent.accent.surface`) fails too, and `content.muted` on
  **`surface.sunken`** fails at rest in `hairline`/light at **4.34:1** — a plain,
  non-interactive surface that had been failing since M0 and that nobody had seen, because the
  audit's surfaces block hand-listed `["base", "raised", "overlay"]`.

  Across all six intents, both tint states and all eight combinations, **every failing pair is
  `content.muted`**; `content.primary` and `content.secondary` clear everywhere with no
  change. That is a weak foreground — not a wrong background, and not a misclassified label
  (`ListboxOption` and `ComboboxOption` already paint their labels `text-content-primary`). So
  `content.muted` moves in six of eight combinations:

  | Variant / scheme | Before    | After         | Worst pair, before → after |
  | ---------------- | --------- | ------------- | -------------------------- |
  | daylight / light | `#616A7C` | `#565E6D`     | 4.00 → 4.80                |
  | daylight / dark  | `#8B94A5` | `#99A1B0`     | 4.11 → 4.83                |
  | hairline / light | `#686D74` | `#5D6168`     | 4.04 → 4.82                |
  | hairline / dark  | `#838991` | `#8E949B`     | 4.20 → 4.84                |
  | layered / light  | `#676274` | `#605B6C`     | 4.31 → 4.80                |
  | layered / dark   | `#9A95AB` | `#9B96AB`     | 4.76 → 4.81                |
  | legible / both   | —         | **unchanged** | already 4.93 / 5.50        |

  The bar is **4.8:1, and it is derived rather than invented**: `legible` — the variant that
  exists to be legible — already clears 4.8 on every one of these pairs untouched. Nothing
  lands on 4.50, which is where `hairline`'s dark `danger.solid` sits and is exactly how a
  pair silently re-breaks on a later rounding change.

  **No tint moves.** Option rows still highlight with `intent-neutral-surface-hover` exactly
  as settled on 2026-08-05.

  New exports `CONTENT_ROLE_AUDIT`, `SURFACE_ROLE_CARRIES_CONTENT`,
  `INTENT_TINT_CARRIES_PLAIN_CONTENT` and `INTENT_ROLE_IS_TINT_BACKGROUND`, each keyed by its
  whole role union: a new content role, surface role or intent is a typecheck error until
  classified, and a test failure until `auditScheme` measures it. **48 gated pairs per scheme
  becomes 63.**

  `@charcuterie/ui` gains an axe assertion on a _highlighted_ rich option row.
  `Listbox.test.tsx` never mounted `AllVariants` — the only story with `text-content-muted`
  inside a row — so the failing pair had no axe coverage in any state. The new test asserts
  the row is actually filled before trusting axe, and fails with `color-contrast (serious)` in
  real chromium on the old token values.

  **Consumers will see fine print get more legible** wherever `content.muted` is used, in
  `daylight`, `hairline` and `layered`. The primary > secondary > muted ramp still separates in
  every variant and scheme. `legible` and ePaper are untouched. See
  `docs/decisions/2026-08-10-content-muted-is-strengthened-so-the-highlighted-option-row-clears-aa.md`.

- Updated dependencies [5435f30]
  - @charcuterie/tokens@1.5.0

## 2.10.1

### Patch Changes

- Updated dependencies [d99efca]
  - @charcuterie/tokens@1.4.0

## 2.10.0

### Minor Changes

- d9b3e7b: Add the unified app shell — `Shell`, `Header`, `Rail`, `Main` — the fleet's largest
  duplicated surface. Ten of twelve UI repos hand-roll the page chrome, three of them in a
  file named `AppShell.tsx`, and mail-sifter's and points-market's header elements are a
  byte-identical class string arrived at independently.

  `Shell` owns the grid frame, the skip-to-content link (missing from all ten hand-rolled
  shells), and the single `contentWidth` that `Header` and `Main` both read through context —
  points-market ships those two disagreeing, with an 80rem header row above an uncapped
  `<main>`. `contentWidth` takes a `screen.*` step (`"lg"` by default), `"full"`, or a
  `` `${number}rem` `` literal, which is the seam rip-deck's `contentMaxWidthRem(columns)`
  drops into with no import in either direction. `max-w-*` is deliberately not used: Tailwind
  v4 owns `--container-*` at different sizes than our `screen.*`.

  `Header`'s `isSticky` (default `true`) writes `position: sticky` **and**
  `z-index: var(--layer-sticky)` together — mux-magic's `PageHeader` is documented as sticky
  and sets only the z-index, so it scrolls away with no error and no failing gate.

  `Rail` takes `side="start" | "end"`, a `landmark` of `"complementary"` or `"navigation"`,
  and a required `label`. It collapses below `md` into a horizontally-scrolling strip by
  restyling the same element — never by rendering a second copy behind `hidden`/`lg:hidden`,
  which is what mux-magic and mail-sifter do and which puts every control in the DOM twice at
  every viewport.

  `Main` is the `<main>` landmark and the capped content column, with `tabIndex={-1}` so the
  skip link moves focus rather than only the scroll position, and an `@container` on the
  capped column (not on `<main>`, which is wider than its own content) so app grids answer to
  the column rather than the window.

  The shell refuses to scroll sideways, and it takes three mechanisms because there are three
  shapes of the bug: `minmax(0, 1fr)` on the middle grid track, `wrap-anywhere` on the content
  column (**not** `wrap-break-word` — only `anywhere` shrinks the min-content size a flex or
  grid item's automatic minimum resolves against, so `break-word` still lets a long token
  force a column open with no overflowing element box), and `position: relative` +
  `overflow-x: clip` on the frame for a panel parked off-screen by a transform, which a
  transform does not remove from the document's scrollable overflow region.

  Gated at a real 390px viewport: `document.documentElement.scrollWidth <= clientWidth`
  against a story carrying all three shapes at once, each separately asserted to overflow.
  Removing the clip fails it at 742px. `Shell.mdx` ships three copy-wholesale templates.

## 2.9.0

### Minor Changes

- a41e5ae: Rebuild the type ramp around a 17px body, and reclassify three `text-xs` groups as content

  **Visual change in every consumer.** No API changes — no token was renamed, added or
  removed, and no component prop moved — but text gets larger everywhere, so expect to
  re-tune any layout that was measured against the old ramp.

  The ramp is now `15 · 16 · 17 · 19 · 24 · 30px` (`xs`…`2xl`) for every variant, against
  the old default of `12 · 13 · 15 · 17 · 21 · 26px`. `layered` keeps larger display steps
  (`xl` 25px, `2xl` 32px); `daylight` and `legible` drop their `fontSize` overrides, which
  only restated a smaller ramp. Line height moves to `1.28 / 1.55 / 1.7`. Density is a
  multiplier over this, so `compact` and `kiosk` follow automatically.

  `sm` is pinned to exactly `1rem`, because `text-sm` — not `text-md` — is the library's
  de-facto body step: 34 uses in `packages/ui/src` against 11 for `text-md`.

  In `@charcuterie/ui`, three groups move from `text-xs` to `text-sm` because they are
  content rather than fine print: the whole **Tooltip** body, **Field** and **FieldGroup**
  descriptions _and error messages_, and the **SortableTableHeader** label.

  **Control heights are deliberately unchanged.**

  Two things to check when you take this: any layout with a hardcoded height that assumed
  14–15px text, and `AdaptiveGrid` callers — it spends height first, so a taller card means
  _fewer_ columns, and a card measured at 147px on the old ramp is 163px on this one.

  See `docs/decisions/2026-08-10-the-type-ramp-is-built-around-a-17px-body.md`.

### Patch Changes

- Updated dependencies [a41e5ae]
  - @charcuterie/tokens@1.3.0

## 2.8.0

### Minor Changes

- a4c9286: Add `AdaptiveGrid` and `useAdaptiveColumns` — a wrapping grid that spends height before it
  spends width.

  Every wrapping grid in the fleet today is `auto-fill, minmax()`, which takes every column
  the window allows and lands on seven items strung across an ultrawide with nothing below
  the fold. Meanwhile the pages around them are one column at a very large max-width, so a
  1440px monitor renders a 56rem ribbon of content down the middle. This is both halves of
  that, lifted out of rip-deck's `useLayoutColumns` and made generic.

  A column is added only when the items will **not** stack inside the viewport; the
  container's inline size can only ever cap that answer, never produce it. The visible
  consequence is deliberately non-monotonic — 1440x900 takes three columns while a larger
  1920x1080 takes two, because the taller window stacks the same items in fewer stacks. The
  content cap then widens with the count (1 column → 56rem, 2 → 72rem, 3 → 106rem), so a page
  earns its width by having something to fill it with.

  - `chooseColumns` is the rule as a pure fold, checked in Node against the eleven-size spec
    table it was ported with. Every number rip-deck kept module-private is now a parameter:
    the column floor, the item block size, the chrome block size, and the caps.
  - `useAdaptiveColumns` measures its container with a `ResizeObserver` rather than reading
    `window.innerWidth`, so a grid beside a rail is told the truth about the room it has. The
    block size stays a viewport question behind an injectable resolver, because a grid in
    normal flow is exactly as tall as its contents and would always answer "it fits".
  - `contentInlineSize` joins `@charcuterie/tokens` beside `screen` and `containerQuery`, and
    emits `--content-inline-size-*`. How far the eye should track across a line is a
    structural fact about the fleet, not something a visual variant gets to change.
  - The column floor defaults to `containerQuery.sm` instead of rip-deck's hand-measured
    380px. A test asserts the two agree on every row of the spec table, so it is a rename
    rather than a behaviour change.

- 41471aa: `TextLink` and `ButtonLink`, plus a router-agnostic seam.

  Buttons are for on-page actions; links are for navigation. Both new components render a
  real `<a href>` — so middle-click, ctrl-click, "open in new tab", "copy link address" and
  the status bar all work — and they differ in paint, not semantics:

  - **`TextLink`** — navigation that looks like a link. `appearance="inline"` (in prose,
    underlined, inherits the surrounding type) and `appearance="standalone"` (a back-link, a
    nav item).
  - **`ButtonLink`** — navigation that looks like a button. Takes `Button`'s `intent` /
    `appearance` / `size` / `iconStart` / `iconEnd` / `isFullWidth` and paints through the
    same `getControlClassName`, so the two are the same pixels. No `isLoading`: a navigation
    has no pending state the component owns.

  Both take `isExternal` (`target="_blank"`, `rel="noopener noreferrer"`, and a
  visually-hidden "opens in a new tab") and `isDisabled`, which drops `href` and sets
  `aria-disabled` rather than shipping a focusable anchor that silently does nothing.

  **The router is injected, not depended on.** `RouterLinkProvider` takes the app's link
  component once at the root; with nothing injected both components render a plain `<a href>`
  and everything still works. `@charcuterie/ui/react-router` is a new optional subpath export
  shipping `ReactRouterLink`, with `react-router` as an optional peer dependency — so apps
  without a router never pay for it. Setup recipe: **Guides/Routing** in Storybook.

  Also newly exported for apps building their own controls: `getControlClassName`,
  `CONTROL_BASE_CLASS`, `ARIA_DISABLED_CLASS`, `AnchorLink`, `useRouterLink`,
  `getIsRoutedHref`, and the `RouterLinkComponent` / `RouterLinkProps` types.

### Patch Changes

- 22caa75: `LogViewer` opts a following pane out of the browser's scroll anchoring, so the
  bottom stays the bottom across a relayout.

  Chromium picks an anchor node inside a scroll container and moves `scrollTop` to
  hold it still whenever the content is laid out again. For a log pane that is the
  browser undoing the follow. `@charcuterie/tokens` ships Victor Mono with
  `font-display: swap`, so a pane that mounts before the face arrives is laid out
  in the fallback, scrolled to the end, and then laid out a second time in the real
  face — and the anchor drags it back off the end. Measured on the 60-line
  `Interactive` story with the font request held back: `scrollTop` 722 (at the end)
  without anchoring, 721 (a pixel short) with it.

  Whether the font swap beats the mount is a race, so the pane followed correctly on
  some renders and not others. It surfaced as visual-regression flake on exactly one
  story rather than as a bug report, and the existing DOM assertions could not catch
  it — their four pixels of slack are there for fractional device pixel ratios, and
  the drift fits inside them.

  The opt-out applies **only while following**. A user who has scrolled up keeps
  anchoring, which is what stops `maxLines` dropping lines off the top from shoving
  the line they are reading up the pane.

- Updated dependencies [a4c9286]
  - @charcuterie/tokens@1.2.0

## 2.7.0

### Minor Changes

- 465037e: Add `.charcuterie-scrollbar` to `@charcuterie/ui/styles.css` — a token-tinted
  scrollbar any scrolling element opts into. The designed look is the
  `::-webkit-scrollbar` path (12px bar, rounded thumb, track-coloured inset, no
  step buttons) on Chromium, Edge, and Safari. Firefox gets the closest
  `scrollbar-width: thin` / `scrollbar-color` match, scoped behind a
  `-moz-appearance` `@supports` probe so Chromium 121+ does not prefer the thin
  OS chrome over the designed bar.

  Both paths read the same three roles — `border-strong` (thumb), `surface-sunken`
  (track), `content-muted` (thumb hover) — so the bar flips with `[data-scheme]` on the
  same repaint as the rest of the page, with nothing in React observing it. This is the
  fleet's `scrollbar-thin-token` (gallery-downloader) and global `::-webkit-scrollbar`
  block (image-viewer) promoted to one owned copy; `Utilities/Scrollbar` in Storybook
  demonstrates it on the vertical, horizontal, and both-axes cases.

## 2.6.0

### Minor Changes

- 1efe6f3: Polish the boolean-input family (`Checkbox`, `RadioGroup`, `Switch`) and add read-only.

  - **`isReadOnly`** on all three — shows the value at full contrast but refuses to change
    it (`aria-readonly`, toggle blocked on pointer and keyboard; a read-only `RadioGroup`
    severs selection-follows-focus so focus can still travel to read). It wears the
    **neutral** intent instead of the accent, so it reads as an informational value rather
    than an actionable control — distinct from both enabled (accent) and disabled.
  - **Disabled is visible again.** The token scale has no step between `border-default`
    and `border-strong`, so a muted outline was either invisible or looked enabled;
    disabled now dims the whole control with `opacity-60`, keeping full shape and colour.
  - **Unified border weight.** The `Checkbox` box, `RadioGroup` ring, and `Switch` track
    all carry a 2px edge, and the radio ring is now the same diameter as the switch knob,
    so the three read as one set.

- 012a1ed: Menu: `items` accepts non-item entries. It is now a union — a `MenuItem` (a bare
  `{ key, label, onSelect }` still type-checks), a `MenuSeparator` (`{ type:
"separator" }` → `role="separator"`), or a `MenuGroup` (`{ type: "group", label,
items }` → `role="group"` named by its label). Plus a new `emptyState?: ReactNode`
  prop, rendered as a disabled `menuitem` when there is nothing to show (a `role="menu"`
  must own a `menuitem`, so the note is one — `aria-disabled`, out of the roving group).
  Backward compatible: existing `MenuItem[]` arrays need no change. The keyboard model
  is unchanged — separators and group headings register nothing, so the arrow keys skip
  them the same way a disabled item is skipped.

## 2.5.0

### Minor Changes

- 6fbb12e: Add the boolean-input family — `Checkbox`, `RadioGroup`, and `Switch` — the primitives
  mux-magic's `BooleanField` hand-rolled in `bg-slate-700 border-slate-500 accent-blue-500`
  because the library had no boolean control to reach for. All three are tokenised
  (`bg-surface-sunken`, `bg-intent-accent-solid`, `text-intent-accent-on-solid`), so one
  control reads correctly in every scheme and variant with no per-app override, and each
  ships stories, an `.mdx` docs page, and a driven-state test suite.

  - `Checkbox` — a native `<input type="checkbox">` the `<label>` wraps (no `for` to get
    wrong), uncontrolled with `defaultChecked` from `isChecked`; a submitted value.
  - `Switch` — a `button role="switch"` with a sliding, colour-changing thumb; the same
    state kind as `Checkbox` and the "takes effect on flip" affordance. `aria-checked`, so a
    screen reader reads "on/off" rather than "checked/unchecked".
  - `RadioGroup` — the stacked sibling of `SegmentedControl`, the same `SinglePicker` +
    `RovingFocus` composition rendered `role="radiogroup"`: arrow keys move-and-check, Tab
    enters once, disabled options leave the focus group but stay selectable via
    `selectedValue`.

### Patch Changes

- d5046d0: Field: adopt the control's own `id` instead of overwriting it. A control written
  `<input id="rename-pattern" />` used to lose its id to a minted `<baseId>-control`,
  breaking the outside-in references the id exists for (a deep link, an autofill hint,
  a server-rendered error summary, a consumer's own selector). Precedence is now
  `<Field id>` → the child's own `id` → generated; the `Field` prop still wins when
  both are set (it is the outer, later declaration). The `<label htmlFor>` follows
  `controlId` as before, so the label/control pair still agrees. Reported by a consumer.
- 5a4433d: Share the slot/clone `ref` + `on*` merge primitives. `mergeRefs`, `chainHandlers`,
  `isMergeableRef`, `isEventHandlerName` and the `MergeableRef` type move into
  `@charcuterie/logic/react` (`mergeRefsAndHandlers.ts`) and become public exports of
  `@charcuterie/logic`; `@charcuterie/ui`'s `slotWiring.ts` imports them instead of
  carrying a byte-identical copy, keeping only its own `mergeSlotWiring`. No behaviour
  change — the React implementation (with its React 19 callback-ref cleanup) is the one
  kept. The Preact mirror is intentionally _not_ shared: its `mergeRefs` is genuinely
  different (Preact has no ref-cleanup return), so this is a react↔ui dedup only.
- Updated dependencies [5a4433d]
  - @charcuterie/logic@1.2.0

## 2.4.1

### Patch Changes

- 4fe17e7: Combobox: virtualized option rows are measured, not pinned to the 36px
  estimate — so a wrapping (two-line) label no longer overlaps the row below it.

  The windowed list gave each row a fixed `height: virtualRow.size` from the
  `estimateSize: 36` guess. A long option label wraps to ~56px, so the row's
  content overran its 36px box and the next row (positioned at estimate pitch)
  was drawn on top of it — the popup rendered as overlapping text in a narrow
  panel with many long entries (a media library of long folder names). Each row
  now carries `ref={rowVirtualizer.measureElement}` + `data-index` and no fixed
  height, so the virtualizer reads its real height and lays the rest out below.
  Adds a `VirtualizedLongOptions` story as the regression guard.

- Updated dependencies [fe06d02]
  - @charcuterie/tokens@1.1.3

## 2.4.0

### Minor Changes

- 2f097f9: EmptyState: widen `headingLevel` from `2 | 3 | 4` to `2 | 3 | 4 | 5 | 6`. The cap
  was a guess about document structure the consumer knows better — an empty state
  nested inside an already-deep section needs `5` or `6` to keep the outline from
  skipping, and the implementation (`` `h${headingLevel}` ``) never cared about the
  upper bound. Type-only widening; no runtime or default change (still defaults to
  `2`). Reported by a consumer; was queued for 1.1.

### Patch Changes

- 0e975b4: Listbox/Combobox: disabled options now look disabled, the Listbox active
  option is visible when opened by mouse, and a multi-select chip removes on a
  click anywhere (not only the ✕).

  - **Disabled colour was clobbered.** The option row set `text-content-primary`
    in its base class and `text-content-disabled` conditionally — equal
    specificity, base emitted last, so a disabled option rendered full-strength.
    It read as a normal row the arrow keys "wrongly" skipped. The base now sets no
    colour; one of the two applies.
  - **Listbox active row was invisible on mouse-open.** The roving focus lands on
    the first/selected option when the popup opens, but the indicator was a
    `:focus-visible` ring, which a mouse-triggered open does not match — so the
    active option had no highlight and the first ArrowDown looked like it skipped
    it. The active row now takes a fill on `:focus` (any focus), keeping the
    keyboard ring on top.
  - **Whole chip removes.** A multi-select chip is now a single remove `<button>`
    (the ✕ is decorative) rather than a label wrapping a small ✕ button — a bigger
    target, no nested interactive element, and it tints danger on hover.

- Updated dependencies [7ed1bda]
  - @charcuterie/tokens@1.1.2

## 2.3.0

### Minor Changes

- 64709dc: Combobox: add attached-input mode (`inputRef`). Combobox binds to a
  consumer-owned `<input>` instead of rendering its own — the field is both the
  value and the query — anchoring a list-only popup to it and mirroring the
  combobox ARIA onto it. Because the consumer owns `isVisible`, a select does not
  auto-dismiss in this mode, which supports drill-down (e.g. folder navigation
  that appends a segment and re-queries the new directory without closing). Also
  adds an optional `anchorRef` to `useAnchoredOverlay` for anchoring a panel to an
  existing element rather than a cloned trigger.

### Patch Changes

- 64709dc: Combobox/Listbox: fix an invisible option highlight, and make Combobox
  multi-select tags persistent.

  - The option row carried a base `bg-transparent`, a plain `background-color`
    utility Tailwind emits _after_ the `bg-intent-*-surface` state tints — so at
    equal specificity it silently won every row. Combobox's keyboard cursor
    (`aria-activedescendant`) and both components' selected fills rendered with no
    background, which read as "the arrow keys do nothing". The base class no
    longer sets a background (a button is transparent by default), so the tints
    apply.
  - The row highlight also switches from `intent-neutral-surface` to
    `intent-neutral-surface-hover`: on the `surface-overlay` panel the plain tint
    is darker than the surface in every dark scheme, so even once it applied it
    read as no change. `-hover` is the visible token there.
  - Combobox multi-select (`isMultiple`) chips now render as an always-visible,
    removable tag row above the trigger instead of inside the popup, so a picked
    value stays on screen after the popup closes. Each chip shows the option's
    human label (e.g. "English", not "eng") and an ✕ remove control.

- 64709dc: Select: drop the per-component 44px min-touch-target floor so its height
  matches Button (and every other control) at the same `size`. Height now comes
  from the shared control-size/density system only — at desktop density `md` is
  40px, not 44px; touch sizing remains the density axis's job. See the
  controls-share-one-height decision.

## 2.2.0

### Minor Changes

- 47ffef6: `ColorSchemeToggle` and `ColorSchemeSwitcher` now take an `intent` prop (the same
  `IntentName` tone union `Button`/`IconButton` accept) and forward it to the underlying
  `IconButton`.

  **Intended, non-accidental default change:** `intent` defaults to `neutral`, where the
  control previously inherited `IconButton`'s `accent` default. A scheme switcher is toolbar
  chrome, so its ghost hover now renders `hover:bg-intent-neutral-surface` and its icon
  `text-intent-neutral-content` instead of accent-violet — which is what makes it read as
  chrome on real app surfaces and removes the need for consumers to override it with an
  `!important` className. `appearance` still defaults to `ghost`. Pass `intent="accent"` (or
  any tone) to restore an accent action.

## 2.1.0

### Minor Changes

- b3be03d: Add `Swatch` — a colour presented as content, with a required accessible name.

  `Badge` and `LiveStatusIndicator` both take an `intent`, so neither can show a colour the
  design system does not own and cannot name: a controller's sticker, castkit's album accent,
  a user's tag colour. `DOT_SIZE_CLASS` is exported precisely so an app can hand-roll one of
  these, and three across the fleet did — each without a name a screen reader or `getByRole`
  could read.

  `Swatch` is that dot, named. The colour is a `color` prop that lands in an inline `style`
  (the sanctioned escape hatch for a runtime value); the meaning travels in a required
  `label`; and it renders as a `role="img"` so `getByRole("img", { name })` resolves in both
  the dot-only and labelled forms. `appearance="outline"` keeps the hue and drops the fill —
  the one state a status colour cannot borrow from `intent`, for a subject that is present but
  inactive — and its own size scale is larger than `DOT_SIZE_CLASS` because a swatch is
  content, not punctuation.

  Surfaced by `portly-controllers`, the fleet's newest consumer.

### Patch Changes

- Updated dependencies [bb55056]
  - @charcuterie/tokens@1.1.1

## 2.0.1

### Patch Changes

- 25cc0a8: `Dialog`'s `children` is optional again. M8 typed it as required, but the old
  chrome `Modal` extended `<dialog>`'s DOM props and so allowed a body-less
  dialog — a confirm whose question is its `heading` and whose answers are its
  `footer`, with nothing in between. That is a real shape (image-viewer's
  delete-confirm renders exactly it), so requiring `children` was an unintended
  break beyond the documented `Modal` → `Dialog` rename. Restored to optional.

## 2.0.0

### Major Changes

- 8de9c4d: M8 — the overlay rebuild and the picker family (`ui@2.0.0`, breaking).

  **Breaking:** `Modal` is now the **base layer** (portalled backdrop + dismiss + focus trap,
  no chrome). The old chrome-bearing component is renamed to **`Dialog`** verbatim, and
  `ModalSize` becomes `DialogSize`. Callers that used `heading`/`footer`/`size`/`headingLevel`
  move `Modal` → `Dialog` (props unchanged — mechanical).

  - **Overlays portal to `document.body`** instead of the platform top layer, so a panel is no
    longer clipped by an `overflow: hidden`/`transform` ancestor. New `Overlay/` foundation:
    `OverlayStack` (provider + one shared `bg-scrim`), `OverlayPanel`, `useAnchoredOverlay`.
    Stacking is portal append order at one `--layer-modal`; `OverlayStackProvider` gives N
    stacked modals one scrim and top-first dismissal.
  - `Popover`, `Menu`, `Tooltip` portalled; the `popover="manual"`/`showPopover()` machinery
    is gone, and `userEvent.keyboard("{Escape}")` now presses Escape for real.
  - New **`Listbox`** (single-select, rich options, roving focus + type-ahead) and
    **`Combobox`** (searchable, filtering, `aria-activedescendant`, loading/error/empty/footer,
    creatable, multiple chips, virtualized) — siblings of the native `Select`, which stays.
  - New runtime dependency `@tanstack/react-virtual` (MIT, US-origin) for `Combobox` windowing.
  - `Lightbox` migrates from `Modal` to `Dialog` (no behaviour change).
  - New export: `OverlayStackProvider`. Removed export: `ModalSize`.

## 1.1.0

### Minor Changes

- cab09e5: Add the three-mode (light / dark / system) colour-scheme switcher.

  - `@charcuterie/logic`: `createColorScheme` core + `useColorScheme` hook with an
    injectable resolver (`{ get, subscribe }`) and injectable persistence; a new
    `@charcuterie/logic/browser` subpath ships the `matchMedia` / `localStorage` /
    `data-scheme` defaults so non-browser consumers (Electron `nativeTheme`,
    React-Native `Appearance`) never import the DOM.
  - `@charcuterie/ui`: `ColorSchemeToggle` (Layer 2, presentational, controlled) and
    `ColorSchemeSwitcher` (Layer 3, connected — the only layer that touches the browser).
  - `@charcuterie/tokens`: `buildFirstPaintScript(variant, { storageKey })` — the inline
    `<head>` script that sets `data-scheme` before first paint from the persisted/OS choice
    and branches the fallback hex on the resolved scheme, sharing a storage key
    (`DEFAULT_COLOR_SCHEME_STORAGE_KEY`) with the runtime hook.

- 0daa161: Add `Lightbox` — a thumbnail that opens its own full-size view, skinned over `Modal`. The thumbnail is the trigger (and carries the accessible name; the image inside it goes `alt=""`), the enlarged view is `object-contain` clamped to the viewport, and Escape / backdrop / focus-restore / scroll-lock are all inherited from `Modal`. Supports an uncontrolled default (pass `thumbnail`) and a controlled mode (`isOpen` / `onOpenChange`) for a trigger elsewhere on the page.

### Patch Changes

- Updated dependencies [cab09e5]
  - @charcuterie/tokens@1.1.0
  - @charcuterie/logic@1.1.0

## 1.0.1

### Patch Changes

- 8f78d5b: `SelectProps.options` accepts a `readonly` array.

  A consumer's options table is usually a constant, and TypeScript will not hand a `readonly`
  array to a mutable parameter — an `as const` options list failed with `TS4104` and had to be
  copied at every call site. `Select` only ever `.map`s over the list, so the mutable parameter
  was asking for a permission it never uses.

- 8f78d5b: A slot's `ref` composes with the one already there, instead of replacing it.

  `Menu` and `Tooltip` could not share a trigger. Both clone onto it and both hand it a
  floating-ui `refs.setReference` — an anchor, not an attribute — and every merge in the
  library was last-write-wins, so the inner clone's ref replaced the outer one's. The menu was
  left with no reference element and floating-ui parked its panel at `left: 0; top: 0`, in the
  corner of the viewport. Nothing threw, the ARIA was intact and axe was clean; it read as a
  CSS bug.

  A `ref` is a subscription and an `on*` is a listener, and neither survives being replaced. So
  both are merged now, at both levels where a slot writes them:

  - **`useClonedChild`** merges with the element **you** wrote, so
    `<Menu trigger={<Button ref={buttonRef} onClick={toggle} />} />` keeps your ref _and_ your
    handler — previously it silently discarded both. React and Preact bindings alike.
  - **`mergeSlotProps`** merges the `ref` and chains the handlers between two nested slots,
    alongside the five attributes it already settled.

  Values are unaffected: a slot is still the later writer and still wins, which is what makes
  `Field`'s `id` work.

- Updated dependencies [8f78d5b]
  - @charcuterie/logic@1.0.1

## 1.0.0

### Major Changes

- a01d7a6: 1.0.0 — the API has survived contact with the fleet

  All five packages go to `1.0.0` together, as their own changeset rather than folded into a
  consumer's, so the release that stabilises the API is legible on its own in the changelog.
  [Decision](../docs/decisions/2026-07-31-one-point-oh-cuts-at-the-end-of-m6.md).

  **Nothing in this bump changes an API.** It is a promise about the ones already here: from
  now on `^1.0.0` takes every minor, and a breaking change goes to `2.0.0`, where an install
  stops and someone reads this file.

  That is not ceremony. Pre-1.0, **the minor is the breaking channel** — `^0.1.0` means
  `>=0.1.0 <0.2.0` — and it had already bitten on this very library. `tokens@0.2.0` replaced
  five of the six ePaper Spectra 6 values and its own changeset said _"breaking for anyone
  reading these literals"_, yet every consumer pinned `^0.1.0`. So the corrected palette, the
  entire point of M5b's finding, reached **none** of them, and did so **silently**: the range
  resolves happily to the old version instead of failing.

  The cut waited for the consumers rather than for a date. `@charcuterie/ui` reached exactly
  one app when M6 opened; it is now imported by **five** — mux-magic (28 files), rip-deck
  (11), gallery-downloader (19), image-viewer (14) and plex-channels (10) — and the three
  modernizations M6 had to do before any of that could happen (image-viewer off `.jsx` +
  Emotion; plex-channels and gallery-downloader onto React + Tailwind from no build system at
  all) are what it cost. castkit consumes `tokens` and `logic` only, which is M5b's finding
  standing rather than a gap: the component layer does not reach a Preact consumer. `xander`
  is deliberately not among them either — Kevin's call was to leave it alone
  (_"he's doing his own thing. I can have him use Charcuterie once we get this settled"_),
  which is why the last-consumer condition resolves here rather than at a fourth migration.

  Waiting was the point, and M6 kept proving it. M5b's _"the component layer does not reach a
  Preact consumer"_ is exactly the kind of finding that must not arrive **after** a stability
  promise — and M6f found two more of them, in `Field`/`Tooltip` nesting and in `LogViewer`
  inside a collapsed `Accordion`, both invisible to this repo's own suite and both surfaced by
  an app actually using the thing. Those are fixed in this release. A 1.0.0 cut a milestone
  earlier would have shipped both.

  Also folded in, rather than shipped as an intermediate `tokens@0.3.0` no consumer could
  have installed: the first-paint (`var()` fallback) snippet and the widened 19-colour ePaper
  flat-fill palette. Both are `minor` on a `0.x` line, which is to say both were unreachable
  behind every consumer's caret — publishing them as `0.3.0` on the way past would have been
  a release with no possible audience.

### Minor Changes

- a01d7a6: Slot components nest, `FieldGroup` labels several controls, and a `LogViewer` follows after a reveal

  Two defects, both found by a real consumer rather than by this repo's own suite, and both
  of the same shape: **two components each individually correct, wrong in composition.**

  **`Field` and `Tooltip` could not nest.** Both clone onto their one child, so
  `<Field><Tooltip><input/></Tooltip></Field>` handed `Field`'s `id`, `aria-describedby`,
  `aria-invalid` and `required` to the `Tooltip` **component**, which declares none of them.
  `cloneElement` does not care, React drops them with no warning, TypeScript never sees it
  (`Children.only` returns a `ReactElement` whose props are `any`), every test passed and the
  render was pixel-identical. The only symptom was a `<label htmlFor>` pointing at an id
  nowhere in the document — the exact unnamed-textbox defect `Field` exists to prevent, this
  time produced by the library.

  The rule now is that **a slot is a pass-through**. New `SlotProps` and `mergeSlotProps`
  (both exported) define the five keys a cloning ancestor injects and how they merge:
  last-write-wins for four, and a **join** for `aria-describedby`, which is a list — a
  `Field` naming its description and its error and a `Tooltip` naming its tip is the whole
  nesting problem in one attribute, and a plain spread keeps one and loses the other. Outer
  first. It works in both orders, and the second is not symmetrical: a `Tooltip` around a
  `Field` hands down not one attribute but a working component — floating-ui's hover, focus
  and dismiss handlers and `refs.setReference` — all of which reach the control too, or the
  tip is a floating node with no trigger and no anchor.

  **New `FieldGroup`** — a `<fieldset>` + `<legend>` for one label over several controls,
  which is where `Field` cannot go: an `id` names one element and a `<label htmlFor>` points
  at one, so a `Field` over three inputs names one of them and leaves two anonymous. Six of
  mux-magic's sixteen field components are in that position. This is the one place in the
  library where `<fieldset>` is right, because here the content really is a form-control
  grouping. `error` on a group is **described, not asserted**: `aria-invalid` has no group
  form, it belongs on the control that is actually invalid, and cloning it onto every child
  would mark the valid ones invalid. That limitation is stated rather than papered over.

  **A `LogViewer` inside a collapsed `Accordion` never followed.** `AccordionSection` renders
  its panel `hidden` rather than unmounting it, deliberately — an unmounted panel loses a
  scroll position and any subscription its content opened, and the fleet's log panes are
  exactly that. A `hidden` subtree has no layout box, so the mount effect measured
  `scrollHeight 0`, wrote `scrollTop = 0`, and never ran again: neither `isFollowing` nor the
  lines change when the section opens. Measured in mux-magic on a 60-line pane —
  `scrollHeight 0` collapsed, `scrollHeight 976 / clientHeight 254 / scrollTop 0` after
  expanding — so the log opened on its **first** line. That is this component's own `}, [])`
  bug rebuilt out of two components whose individual decisions are both right, invisible to
  both of their test suites. Fixed with a `ResizeObserver` on the pane, live only while
  following: `ResizeObserver` answers "does it have a box", which is the precondition the
  measurement needs, where an `IntersectionObserver` answers "is it on screen", which is a
  different question with two wrong answers here. mux-magic's downstream `DisclosedLogViewer`
  workaround is now deletable.

  Every fix carries a regression test proven to fail without it. `SlotProps` is a `Pick` out
  of React's `InputHTMLAttributes` rather than a hand-written shape, because three of its
  five keys are booleans whose names are the DOM's and cannot take the house `is`/`has`
  prefix.

### Patch Changes

- Updated dependencies [eeb924b]
- Updated dependencies [6694053]
- Updated dependencies [a01d7a6]
  - @charcuterie/tokens@1.0.0
  - @charcuterie/logic@1.0.0

## 0.2.0

### Minor Changes

- a1fdc38: M6's nine P1 components: `Select`, `Menu`, `Tooltip`, `Toast` (with `ToastRegion`),
  `Accordion`, `Field`, `LogViewer`, `SortableTableHeader`, and `FileDropZone`.

  Additive — nothing existing changes shape. Pre-1.0 the minor is this repo's breaking
  channel, and a caret on a `0.x` pins the minor, so a consumer wanting these must move its
  range rather than resolve into them silently.

## 0.1.1

### Patch Changes

- Updated dependencies [a653015]
  - @charcuterie/tokens@0.2.0

## 0.1.0

### Minor Changes

- Initial public release of the Charcuterie fleet library: the design tokens, the five state kinds (Visibility, VisibilityGroup, SinglePicker, MultiplePicker, RovingFocus, Status), the component set, and the shared ESLint + Biome configs.

### Patch Changes

- Updated dependencies
  - @charcuterie/tokens@0.1.0
  - @charcuterie/logic@0.1.0
