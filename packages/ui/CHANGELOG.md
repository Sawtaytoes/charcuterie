# @charcuterie/ui

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
