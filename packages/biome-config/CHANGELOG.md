# @charcuterie/biome-config

## 1.3.0

### Minor Changes

- 4d0c027: `@charcuterie/biome-config/app` is a delta, and an app extends both entries.

  ```jsonc
  {
    "extends": ["@charcuterie/biome-config", "@charcuterie/biome-config/app"]
  }
  ```

  **Fixes 1.2.0, which was silently broken.** `app.json` shipped carrying
  `"extends": ["./config.json"]`, on the assumption that a package's config can extend
  its sibling. Biome does not resolve a nested `extends` inside an extended config, so a
  consumer on `/app` alone got the picker rules and **lost the entire house style** — 60
  columns, no semicolons, the Tailwind CSS parser, the VCS ignore file — with no error at
  all. The first `biome check --write` would have reformatted the repo to Biome's stock
  defaults.

  The rules are unchanged. `app.json` now carries no `extends`, and the package grows a
  test suite that runs the real CLI over real fixtures and asserts every base setting
  survives the second entry — plus one that pins `app.json` as a delta, which is the
  assertion that fails on the 1.2.0 shape.

## 1.2.0

### Minor Changes

- 28ce77c: An app repo's lint setup is now one import and one `extends`.

  `createAppConfig({ tsconfigRootDir })` composes the whole house ESLint config —
  ignores, type-aware rules, React, logical properties, the picker rules, story and
  test overrides — scoped off `@charcuterie/ui` by an `appDirectories` list rather than
  by hand-written globs. The per-`files` factories are unchanged and still exported;
  the preset is built out of them.

  `createPickerRules()` names the settled component-choice subset (`no-raw-select`,
  `prefer-listbox-over-select`, `require-suppression-reason`), which four repos were
  each hand-registering. It is the preset's default; the other five rules stay behind
  `componentChoice: "all"` and the flex family stays behind `flexOverflow`.

  `@charcuterie/biome-config/app` is the Biome half: the base config plus the same
  picker ban expressed as `noRestrictedElements` and `noRestrictedImports`, so a repo
  that lints with Biome alone can enforce it without adopting a second linter. The base
  export is unchanged and stays style-only — `@charcuterie/ui` extends it and renders a
  raw `<select>` on purpose.

  `typescript-eslint` moves from a peer dependency to a real one, so adopting the
  config is `yarn add --dev @charcuterie/eslint-config eslint`.

## 1.1.0

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
