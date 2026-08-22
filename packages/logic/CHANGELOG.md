# @charcuterie/logic

## 2.1.0

### Minor Changes

- 79f0124: `applySelectionClick` — shift-click range selection, as a pure reducer over a selection
  the caller holds. Gmail's rules: a plain pick anchors and remembers whether it ticked or
  un-ticked, a shift pick repeats that verdict across the whole span as drawn, and the
  anchor then walks to the item just picked. No anchor, or an anchor that has left the list,
  degrades to a plain toggle.

  Rendered order is an argument rather than something the reducer derives, because a list is
  filtered, grouped and re-sorted without remounting — which is also why this is not a
  command on `createMultiplePicker`, whose order is mount order.

  `@charcuterie/logic/browser` gains `clearTextSelection`, which drops the native text
  selection a shift-click drags along behind it.

## 2.0.0

### Major Changes

- 3ac1684: **Breaking:** the OpenAPI seam moves out of `./query` and onto its own
  `./openapi` subpath.

  `createApiClient`, `createApiHooks`, and the `ApiClient` / `ApiClientOptions` /
  `ApiHooks` / `ApiMiddleware` / `FetchResponse` types are no longer exported from
  `@charcuterie/logic/query`. Import them from `@charcuterie/logic/openapi`:

  ```diff
  -import {
  -  createApiClient,
  -  createApiHooks,
  -  QueryProvider,
  -} from "@charcuterie/logic/query"
  +import { QueryProvider } from "@charcuterie/logic/query"
  +import {
  +  createApiClient,
  +  createApiHooks,
  +} from "@charcuterie/logic/openapi"
  ```

  `createQueryClient`, `DEFAULT_QUERY_OPTIONS` and `QueryProvider` stay on
  `./query`, unchanged.

  Why: `./query`'s barrel re-exported the OpenAPI primitives, whose types
  reference `openapi-fetch` and `openapi-react-query`. TypeScript resolves the
  whole barrel to typecheck any import from it, so an app with no OpenAPI document
  had to install both libraries to typecheck a bare `QueryProvider` — which made
  those "optional" peers effectively mandatory. Now `./query` opts into
  `@tanstack/react-query` alone and `./openapi` adds the other two. See
  [the decision](../docs/decisions/2026-08-13-the-openapi-seam-is-its-own-subpath-not-part-of-query.md).

## 1.5.0

### Minor Changes

- e248b99: Add `QueryBuilder` (`@charcuterie/ui`) and `createTree` (`@charcuterie/logic`): a generic, arbitrarily-nestable group editor with an opaque leaf value **and** an opaque group combinator. `createTree` is a headless normalized-tree state core (add/remove/move/patch, stable ids, `serialize`) with React and Preact bindings; `QueryBuilder` renders nestable combinator groups with a `renderLeaf` render-prop. Built to be shared by Mail Sifter's nested mail rules (AND/OR) and mux-magic's job DSL (any/all/none).

## 1.4.0

### Minor Changes

- d32f5d3: Add `@charcuterie/logic/query` — the fleet's request/response data layer, so
  data-fetching is edited in one place like tokens and state already are.

  - `createQueryClient(config?)` — the one blessed `QueryClient` constructor. It
    keeps react-query's own defaults (**retries stay on** — a shared data layer
    should recover from a transient blip) and deep-merges any override, so a
    polling app opts out with `{ defaultOptions: { queries: { retry: false } } }`.
  - `QueryProvider` — `QueryClientProvider` pre-wired to that client.
  - `createApiClient` / `createApiHooks` — the `openapi-fetch` and
    `openapi-react-query` primitives re-exported at full type fidelity, so a
    `paths` type generated from the backend's OpenAPI spec makes every call
    path/params/body type-safe.

  `@tanstack/react-query`, `openapi-fetch`, and `openapi-react-query` are optional
  peer dependencies — a consumer that doesn't import `./query` pulls none of them.
  This is the request/response counterpart to the future RxJS-based
  `@charcuterie/streams` (push-only); the two are deliberately separate packages.

## 1.3.0

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

## 1.2.0

### Minor Changes

- 5a4433d: Share the slot/clone `ref` + `on*` merge primitives. `mergeRefs`, `chainHandlers`,
  `isMergeableRef`, `isEventHandlerName` and the `MergeableRef` type move into
  `@charcuterie/logic/react` (`mergeRefsAndHandlers.ts`) and become public exports of
  `@charcuterie/logic`; `@charcuterie/ui`'s `slotWiring.ts` imports them instead of
  carrying a byte-identical copy, keeping only its own `mergeSlotWiring`. No behaviour
  change — the React implementation (with its React 19 callback-ref cleanup) is the one
  kept. The Preact mirror is intentionally _not_ shared: its `mergeRefs` is genuinely
  different (Preact has no ref-cleanup return), so this is a react↔ui dedup only.

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

## 1.0.1

### Patch Changes

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
