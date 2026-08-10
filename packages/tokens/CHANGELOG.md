# @charcuterie/tokens

## 1.4.0

### Minor Changes

- d99efca: Audit interactive states, not just resting ones — and fix the three fills that failed AA
  while hovered.

  `contrastAudit.ts` contained **zero occurrences of "hover"**. It measured
  `intent.<name>.onSolid` on `solid` and `intent.<name>.content` on `surface`, and never on
  `solidHover`/`surfaceHover` — so `yarn check:contrast` reported "All variants clear WCAG
  2.2 AA" while `daylight`'s dark accent button sat at **4.47:1** against its white label for
  as long as a pointer was on it. `daylight` is the `:root` default, so that was every accent
  button in the fleet.

  Every resting pair now has its hover twin at the same threshold: **35 gated pairs per scheme
  becomes 48**. Three fills failed, and each is corrected at the _hover_ token rather than the
  resting colour or the foreground:

  | Variant / scheme | Token                      | Before             | After              |
  | ---------------- | -------------------------- | ------------------ | ------------------ |
  | daylight / dark  | `intent.accent.solidHover` | `#6A64F0` — 4.47:1 | `#534DD5` — 6.19:1 |
  | hairline / dark  | `intent.accent.solidHover` | `#6D78DC` — 3.91:1 | `#555FBD` — 5.59:1 |
  | hairline / dark  | `intent.danger.solidHover` | `#E0524C` — 3.83:1 | `#BD3E39` — 5.37:1 |

  The rule they follow is what every light scheme here already did: **a hover moves away from
  its own label's lightness** — a white-label fill deepens, a dark-label fill brightens — so
  the hovered state reads better than the resting one, not worse.

  New export `RESTING_ROLE_BY_INTENT_ROLE`, keyed by every member of `IntentRole`: adding a
  future `solidPressed` is a typecheck error until it is classified as a state of another
  role, and a test failure until `auditScheme` pairs it with a foreground.

  **Consumers will see a visual change** on the hovered accent button in dark schemes
  (`daylight`, `hairline`) and the hovered danger button in `hairline` dark. Nothing moves in
  any light scheme, and no resting colour changes anywhere. See
  `docs/decisions/2026-08-10-interactive-states-are-audited-not-just-resting-states.md`.

## 1.3.0

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

## 1.2.0

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

## 1.1.3

### Patch Changes

- fe06d02: layered + hairline (light): deepen `intent.neutral.surface` the same way daylight
  was, so a neutral `ghost`/`outline` hover reads on light chrome. `layered`
  `#EDEAF0`→`#E8E4EC` (ΔE 11→20 — it was the weakest of all four variants) and its
  `surfaceHover` `#E4E0E9`→`#DFDBE7`; `hairline` `#EFECE6`→`#ECE8E1` (ΔE 15→22,
  `surfaceHover` already deep enough so only `surface` moves). `legible` is left
  untouched — its neutral surface is already ΔE≈23. Neutral content on the new
  surfaces stays 8.2–8.4:1; all variants clear WCAG 2.2 AA. See the neutral-ghost
  -hover-swept decision.

## 1.1.2

### Patch Changes

- 7ed1bda: daylight/light: deepen `intent.neutral.surface` `#EDF0F5`→`#E6EBF2` and
  `surfaceHover` `#E3E8EF`→`#DEE4EF`. The neutral surface was only ΔE≈12 from the
  page base, so a `ghost`/`outline` neutral hover — which lands on `surface` — was
  nearly imperceptible on light chrome (the affordance the owner originally
  flagged; dark mode already read). The new surface is ΔE≈21, matching how the
  chromatic intents already read; the two-step `soft` ramp (surface at rest,
  surfaceHover on hover) is preserved and `surfaceHover` stays distinct from the
  `#DDE2EA` border so `soft`'s outline does not vanish on hover. Neutral content
  on the new surface is 8.29:1 (was 8.70:1); all variants still clear WCAG 2.2 AA.
  See the daylight-neutral-surface-deepened decision.

## 1.1.1

### Patch Changes

- bb55056: `variables.css` now emits the default density at bare `:root`, so omitting
  `data-density` degrades to `comfortable` instead of to nothing.

  Every `--control-height-*`, `--control-gap-*`, `--control-padding-inline-*` and
  `--font-size-*` was declared only under a `[data-density="…"]` selector, with no `:root`
  fallback — unlike `data-variant`, which has had one since M0. A consumer that set
  `data-scheme` and omitted `data-density` resolved `h-(--control-height-md)` and `text-2xl`
  to nothing: every control collapsed to zero height and the whole type ramp disappeared, on
  a green build with no console error.

  Measured against the published `1.1.0`, on a page with no `data-density`:
  `--control-height-md` and `--font-size-2xl` both compute to the empty string. With this
  change they are `2.5rem` and `1.625rem`, and `data-density="compact"` still overrides to
  `1.875rem`/`1.5234rem` — the default block is emitted first, and `:root` and
  `[data-density="compact"]` are the same specificity, so source order is the whole cascade.

  Found by `portly-controllers`, which rendered a segmented control with no segments.

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

- eeb924b: ePaper: widen the flat-fill palette from 6 colours to 19, and key panels by family

  **Six is what one _pixel_ can be, not what the panel can show.** The profile's docstring
  claimed its palette was "six colours … that the panel can physically render", which is
  false — a Spectra 6 panel sets each pixel to one of six inks, but a region of pixels
  renders far more, and the fleet's photo path has always depended on that. That one
  sentence is why the restriction read as arbitrary. It is retired.

  The rule is now keyed to what is being drawn: photographs get the full dithered gamut,
  **flat fills get 19 colours**, and borders / small text / icons keep the six.

  **New:**

  - **`spectra6Blends`** — the thirteen two-ink 50% checkerboards Spectra 6 can actually be
    asked for, and **`monoBlends`** — the pHAT's one. Each is reached by authoring a single
    flat hex; the panel-side quantizer produces the pattern. Fills and large areas only.
  - **`epaperPanels`** — a registry keyed by panel and discriminated on `family`.
    `fixedInk` panels carry `inks` / `emittedInks` / `blends`; `continuousTone` panels carry
    none of them. `gallery3` is listed (~50,000 colours, ACeP, `isInFleet: false`) with no
    palette, because a continuous-tone panel has none to enumerate.
  - **`getIsReachableBlend`** and **`listReachableBlendPairs`** — the derivation, exported so
    a new panel gets its blend tier without anyone guessing which pairs survive.
  - `EpaperPanelId`, `EpaperPanelFamily`, `EpaperFixedInkPanel`,
    `EpaperContinuousTonePanel`, `EpaperPanel` types.

  **Not a breaking change.** `epaperColours`, `epaperMotion` and `EpaperPalette` are
  unchanged, and the six ink values are byte-identical — they are now _derived_ from
  Pimoroni's `DESATURATED_PALETTE`/`SATURATED_PALETTE` at the fleet's `saturation = 0.5`
  rather than typed by hand, with the literals kept in `epaper.test.ts` as an independent
  pin. Role colours are still built from the six inks alone, and a test holds them there.

  Two ink pairs are **absent rather than present-and-wrong**: `blackYellow` and
  `yellowBlue` quantize to a different pair entirely. Measured, not predicted — all fifteen
  pairs were pushed through castkit's real `ditherToPanel`.

  Board: `docs/previews/2026-07-31-m6g-epaper-palette.html`.

- 6694053: Ship the first-paint (anti-flash) snippet, as a `var()` fallback.

  `buildFirstPaintRule(variant, scheme)` returns the one line an entry HTML needs before any
  stylesheet has parsed; `buildFirstPaintCss(variant)` wraps both schemes into the new
  `dist/first-paint.css`, exported as `@charcuterie/tokens/first-paint.css`. **Copy it into an
  inline `<style>` — never `<link>` it**: a stylesheet request is the round-trip the rule
  exists to beat.

  The `var()` is the point, not the packaging. An inline `<style>` is unlayered, unlayered CSS
  beats every `@layer`, and Tailwind v4's utilities live in `@layer utilities` — so the bare
  form every consumer had hand-copied (`html, body { background-color: #131822 }`) outranked
  `bg-surface-base` on `<body>` and pinned the canvas dark permanently, making
  `data-scheme="light"` unreachable. gallery-downloader, rip-deck and mux-magic all carried it.

  Consumers gate their own copy with
  `expect(indexHtml).toContain(buildFirstPaintRule(daylight, "dark"))`.
  [Decision](../docs/decisions/2026-07-31-tokens-ships-the-first-paint-snippet.md).

## 0.2.0

### Minor Changes

- a653015: The ePaper Spectra 6 palette is the one castkit measured, not the one this package invented.

  `epaperColours.spectra6` shipped plausible primaries — `#D02F2A`, `#E8C11C`, `#2B4C9B`,
  `#2E7D46`, and `#FFFFFF` for the paper — and not one of them is a colour an E6 render
  pipeline maps 1:1, so none of the six was the colour that reached a panel. The paper is
  the bigger miss: an E6 panel cannot produce `#FFFFFF`, so every contrast number ever
  computed for this profile was against a white the hardware never shows.

  Values now come from Pimoroni's `inky` driver (`inky_e673.py`) by way of
  `castkit/packages/core/src/panels/palette.ts`, at the fleet's `saturation` of 0.5:
  `#000000`, `#D0D2D2`, `#CE2426`, `#E8DF24`, `#1F1EAF`, `#1DAD23`. `mono` is unchanged in
  effect but now has its own constants — a 1-bit pHAT's white really is `#FFFFFF`.

  **Breaking for anyone reading these literals**, which is the point of a token package:
  five of the six change value. Nothing else in the package moves, and the four variants x
  two schemes are untouched.

## 0.1.0

### Minor Changes

- Initial public release of the Charcuterie fleet library: the design tokens, the five state kinds (Visibility, VisibilityGroup, SinglePicker, MultiplePicker, RovingFocus, Status), the component set, and the shared ESLint + Biome configs.
