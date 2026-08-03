# @charcuterie/ui

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
