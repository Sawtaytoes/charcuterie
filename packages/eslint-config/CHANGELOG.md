# @charcuterie/eslint-config

## 1.4.0

### Minor Changes

- 6e5f896: `charcuterie/prefer-listbox-over-select` now reports `Select` as **deprecated** rather than
  as a choice needing a stated reason, and names `Picker` first as the drop-in. The rule id is
  unchanged.

  There is no per-call-site exception left: the four platform cases the old message offered —
  wheel picker, autofill, `:invalid`, no-JS form post — have never applied to an app in this
  fleet, so a disable comment now cites a decision record instead of inventing its own reason.
  The block stays opt-in.

## 1.3.0

### Minor Changes

- 6a53f48: Add the opt-in flex-overflow rules: `charcuterie/no-unconstrained-flex-text` (warn) and `charcuterie/no-shrink-0-with-flex-wrap` (error).

  Four repos independently rediscovered the same CSS rule on 2026-08-11 while bumping to `@charcuterie/ui@2.11.0`. A flex item's automatic minimum size resolves against its content's **min-content width**, so one long unbreakable token — a URI, a hostname, an item name — becomes the row's floor and shoves the sibling beside it out of the container. The 17px type ramp is what consumed the slack hiding it.

  `min-w-0` alone is not enough (the text spills instead); only `overflow-wrap: anywhere` shrinks the min-content size. But the four shipped fixes were four _different_ fixes — `min-w-0 wrap-anywhere`, `flex-wrap` + `shrink-0`, `truncate` + `title`, and _removing_ `shrink-0` — so the rule flags the dangerous shape and accepts any escape.

  ```js
  import { createFlexOverflowRules } from "@charcuterie/eslint-config";

  createFlexOverflowRules({
    files: ["packages/web/**/*.tsx"],
    // "warn" by default; promote once the app is swept.
    severity: "error",
  });
  ```

  `no-unconstrained-flex-text` **warns** because it cannot know whether `{status}` is `"OK"` or a 300-character URL, and a rule that fires constantly gets switched off. `no-shrink-0-with-flex-wrap` **errors** because the two classes contradict each other outright — pointed at rip-deck it found the known `RipCard` bug plus the identical uncaught shape in `HeldBayCard` and `QuarantinedBayCard`.

  **Internal change worth knowing about:** all `charcuterie/*` rules now live in one plugin object (`src/plugin.js`, exported as `charcuteriePlugin`), so the component-choice and flex-overflow blocks can be enabled side by side without flat config's `Cannot redefine plugin` error. `componentChoicePlugin` is kept as an alias of the same reference.

## 1.2.0

### Minor Changes

- d32f5d3: Ignore generated API schemas in both shared configs, so an app that commits
  `openapi-typescript` output (for `@charcuterie/logic/query`) inherits the
  "committed but never linted/formatted" convention without wiring it per repo.

  - `@charcuterie/biome-config` adds an `overrides` entry that disables the
    linter, formatter, and assist for `**/*.gen.ts`, `**/*.gen.tsx`, and
    `**/__generated__/**`.
  - `@charcuterie/eslint-config` exports `GENERATED_SCHEMA_GLOBS` and
    `createGeneratedIgnores()`, a flat-config `{ ignores }` block to spread in so
    the type-aware pass skips the same paths.

## 1.1.0

### Minor Changes

- aac3fe5: Add `createComponentChoiceRules({ files })` — an **opt-in** block of seven rules under a
  `charcuterie/` plugin that stop app code reaching past the library for a raw element, and
  say which component to reach for instead.

  - `charcuterie/no-raw-anchor` — `<a>` → `TextLink` / `ButtonLink`, both of which render a
    real `<a href>` so middle-click and open-in-new-tab keep working.
  - `charcuterie/no-raw-button` — `<button>` → `Button`, or `IconButton` when the control is
    icon-only and would otherwise have a glyph for its accessible name.
  - `charcuterie/no-raw-select` — `<select>` → `Listbox` (short, rich) / `Combobox` (long,
    searchable).
  - `charcuterie/prefer-listbox-over-select` — `Select` is demoted to a stated-reason
    exception.
  - `charcuterie/no-clickable-non-interactive` — `onClick` on a `<div>`/`<span>`/`<li>` with
    no `role` or `tabIndex`.
  - `charcuterie/no-navigation-in-click-handler` — `navigate()` / `router.push()` /
    `location.href =` inside an `onClick`.
  - `charcuterie/require-suppression-reason` — a disable of any of the above needs a
    `-- reason`.

  Opt-in and additive: nothing changes for a consumer that does not add the block. `files`
  has no fleet-wide default, and is what keeps the rules off `@charcuterie/ui`, which renders
  those raw elements on purpose.

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

## 0.1.0

### Minor Changes

- Initial public release of the Charcuterie fleet library: the design tokens, the five state kinds (Visibility, VisibilityGroup, SinglePicker, MultiplePicker, RovingFocus, Status), the component set, and the shared ESLint + Biome configs.
