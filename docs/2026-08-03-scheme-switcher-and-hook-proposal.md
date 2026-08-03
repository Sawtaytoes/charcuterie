# Scheme switcher + `useScheme` hook — proposal (design pass, awaiting sign-off)

**Status:** Proposal — NOT built. Design + preview only.
**Date:** 2026-08-03
**Preview:** `docs/previews/2026-08-03-scheme-switcher.html` (served this session at
`https://charcuterie-scheme-switcher-aba3.temp.t3code.octen.dev` — session-scoped, dies
with the container). Screenshots in `__screenshots__/2026-08-03-scheme-switcher-*.png`.

A three-mode (**light / dark / system**) scheme control, split into layers so the browser
dependency is isolated and a non-browser runtime (Electron `nativeTheme`, RN `Appearance`)
can be dropped in. Every choice below is anchored to an existing charcuterie decision; the
genuine open questions are collected in **§9 Owner decisions**.

---

## 1. Vocabulary — why `mode` ≠ `scheme`

Charcuterie's theming axis is `data-scheme`, and it has exactly two values: `light` and
`dark` (`variables.css` only ever emits `[data-scheme="light"]` / `[data-scheme="dark"]`).
**`system` is not a scheme** — it is a *preference* that resolves to one. So the API keeps
two words apart, and this distinction drives every name:

| Term | Type | Meaning |
| --- | --- | --- |
| **mode** | `"light" \| "dark" \| "system"` | what the user *picked* (the 3-way preference) |
| **scheme** / **resolvedScheme** | `"light" \| "dark"` | what actually gets written to `data-scheme` |

`Scheme` is already an exported type in `@charcuterie/tokens` (`buildFirstPaintRule(variant,
scheme: Scheme)`). We add `SchemeMode = Scheme | "system"`.

---

## 2. The three layers + the hook (where each lives)

```
Layer 1  icons            consumer-supplied ReactNodes        (NOT owned by the library)
Layer 2  presentational   @charcuterie/ui   SchemeToggle / SchemePicker   (controlled, no browser)
Layer 3  connected        @charcuterie/ui   SchemeSwitcher                (holds the browser dep)
hook     state            @charcuterie/logic  useScheme  ← createScheme core   (injectable seams)
browser  default seams    @charcuterie/logic/browser                     (optional subpath adapter)
```

This mirrors the package split already in force: `SegmentedControl` (ui) is a thin view over
`useSinglePicker`/`useRovingFocus` (logic); `logic/jotai` and `logic/signals` are optional
adapter subpaths. `logic/browser` is a new adapter subpath in the same spirit.

---

## 3. Layer 1 — icons (the library ships none)

Decision [`2026-07-29-ship-no-icons-and-no-symbol-glyphs`] is absolute: `@charcuterie/ui`
contains zero SVG assets, and a component default may not be a symbol glyph either
(`⚙`/`↶`/`▨` all measure blank in the sandbox's headless Chromium). So:

- **Layer 2 takes the icons as props** — a `ReactNode` per mode, exactly like `IconButton`'s
  `children` and `EmptyState`'s `icon`. A consuming app passes lucide `Sun` / `Moon` /
  `Monitor` (lucide is the standing fleet recommendation, still unadopted in the library).
- The preview's sun/moon/monitor are hand-drawn inline SVGs from the
  `icons.storyHelpers.tsx` convention (`stroke="currentColor"`, `viewBox="0 0 24 24"`,
  `strokeWidth 1.75`, `aria-hidden`). Those are **story-only** and never reach `dist`.

Proposed prop shape (both forms):

```ts
type SchemeIcons = { light: ReactNode; dark: ReactNode; system: ReactNode }
```

**No default icons.** Like `IconButton`, the icon is required and un-defaultable — a
text-glyph default is exactly what the decision forbids. (Open question in §9: whether Layer 2
should fall back to the *words* "Light/Dark/System" when an icon is omitted — text is allowed
where a glyph is not — or require all three. The preview shows icon+word together, which
sidesteps it.)

---

## 4. Layer 2 — presentational, controlled, browser-free

Two candidate forms (owner picks one, or we ship both — see §9). **Neither touches
`matchMedia`, `localStorage`, or `document`.** They render `mode`, they call back on intent.
They are *controlled* here in the component sense (value in, event out) — this does not
contradict [`logic-hooks-are-uncontrolled`], which is about the *logic hooks*; a presentational
component that owns no state and simply renders a prop is the allowed controlled surface that
decision explicitly points to ("if a component-level controlled mode is ever needed, it belongs
there — in a component that can compare props across renders — not in the state layer").

### Form A — `SchemeToggle` (cycling single button)

The owner's description. One `IconButton`; shows the current mode's icon; each activation
advances **light → dark → system → light**.

```ts
type SchemeToggleProps = {
  mode: SchemeMode                       // current mode (rendered; not stored)
  onCycle: (nextMode: SchemeMode) => void
  icons: SchemeIcons
  /** Accessible-name builder. Default announces current + next mode. */
  label?: (mode: SchemeMode) => string   // → IconButton `label` (becomes aria-label)
  order?: readonly SchemeMode[]          // default ["light","dark","system"]
  size?: ControlSize
  className?: string
}
```

- Renders `<IconButton label={label(mode)} onClick={() => onCycle(next(mode, order))}>{icons[mode]}</IconButton>`.
- Default `label`: `"Colour scheme: {mode}. Activate to switch to {next}."` — so
  `getByRole("button", { name: /colour scheme/i })` resolves and the announced name states the
  current mode. (British "Colour" matches the repo's token vocabulary —
  [`colour-in-typescript-color-in-css`].)

### Form B — `SchemePicker` (all three visible)

Charcuterie's `SegmentedControl` (a `radiogroup`), one option per mode.

```ts
type SchemePickerProps = {
  mode: SchemeMode
  onChange: (mode: SchemeMode) => void
  icons: SchemeIcons
  label?: string                         // group name, default "Colour scheme"
  size?: ControlSize
  className?: string
}
```

- Thin wrapper: `items = [{value:"light",label:<>{icons.light} Light</>}, …]`, `selectedValue={mode}`.
- Inherits `SegmentedControl`'s full keyboard model (arrow = move + select, roving tabindex,
  Space) and its `radiogroup` a11y for free.

**Tradeoff:** Form A is one control-height square (right for a 16-bay toolbar / kiosk header);
Form B is ~3 labels wide but shows all states at once and needs no "what does the monitor icon
mean" legend.

---

## 5. The hook — `useScheme` (logic) over a pure `createScheme` core

Follows the `createVisibility` / `useVisibility` pattern exactly: a pure core in
`logic/core`, a React adapter in `logic/react`, a Preact adapter in `logic/preact`. The core
has **no React and no hard browser dependency** (the Satori / framework-free path forbids it —
[`store-injection-not-a-jotai-dependency`]), so every environment seam is *injected*, with
browser defaults living in the optional `logic/browser` subpath.

### 5.1 Core state + options

```ts
type SchemeState = { mode: SchemeMode; resolvedScheme: Scheme }

type SchemeOptions = StoreOptions & {          // StoreOptions = { createStore? } — same as every core
  mode?: SchemeMode                             // INITIAL only, read once (uncontrolled)
  resolver?: SchemeResolver                     // injectable OS resolver — THE "out"
  onChange?: (state: SchemeState) => void        // fires on mode intent change + on resolver flips
}

type Scheme = "light" | "dark"                  // from @charcuterie/tokens
type SchemeMode = Scheme | "system"

type Cycle = { order: readonly SchemeMode[] }    // default ["light","dark","system"]
```

### 5.2 The injectable resolver seam — the whole point

Deliberately shaped like `CharcuterieStore` (minimal, two members), and it is exactly the
shape `matchMedia`, Electron `nativeTheme`, and RN `Appearance` all satisfy:

```ts
type SchemeResolver = {
  get: () => Scheme                              // the OS's current answer
  subscribe: (listener: () => void) => () => void // OS-change notifications → re-resolve
}
```

`resolvedScheme = mode === "system" ? resolver.get() : mode`. When `mode === "system"` the core
subscribes to `resolver`; a flip re-resolves and fires `onChange`. When `mode` is concrete the
resolver is ignored (and unsubscribed).

If no `resolver` is injected the core defaults to a **static `light` resolver** (get → `light`,
subscribe → no-op) so `logic/core` stays pure and SSR/Satori-safe. Real apps inject one:

### 5.3 Default browser seams — `@charcuterie/logic/browser`

```ts
matchMediaResolver(): SchemeResolver            // matchMedia("(prefers-color-scheme: dark)") + "change" listener
localStoragePersistence(key?): SchemePersistence // default key "charcuterie-scheme"
dataSchemeApplier(el?): SchemeApplier           // el.setAttribute("data-scheme", scheme); default = document.documentElement
```

```ts
type SchemePersistence = { read: () => SchemeMode | null; write: (mode: SchemeMode) => void }
type SchemeApplier = (scheme: Scheme) => void
```

### 5.4 The React hook

```ts
const { mode, resolvedScheme, setMode, cycleMode } = useScheme({
  mode: persistence.read() ?? "system",   // initial only
  resolver: matchMediaResolver(),          // injected — swap for Electron/RN
  persistence: localStoragePersistence(),  // injected — write on change
  apply: dataSchemeApplier(),              // injected — writes data-scheme on <html>
  order: ["light", "dark", "system"],
  onChange: ({ mode }) => { /* consumer's own effect */ },
})
```

Returned surface matches the uncontrolled convention (imperative setters, no controlled prop):

| Member | |
| --- | --- |
| `mode` / `resolvedScheme` | current state (from `useStoreValue`) |
| `setMode(mode)` | push a concrete choice (persists + applies) |
| `cycleMode()` | advance by `order` (what `SchemeToggle.onCycle` calls) |

- **`mode` is INITIAL only**, read once (lazy `useState(() => createScheme(...))`, StrictMode-safe),
  exactly like `useVisibility`'s `isVisible`. No effect syncs a prop back into the core.
- **`onChange` fires on intent changes only** (a `setMode`/`cycleMode`, or a real resolver flip
  while in system mode) — never on registration churn — per [`logic-hooks-are-uncontrolled`],
  which prevents the echo loop.
- **Persistence + apply are side effects wired in the hook**, not in the pure core — same reason
  React `useState` is not allowed in `logic/core`. This keeps `createScheme` conformance-testable
  with `runConformanceSuite` against the default/Jotai/signals stores.

### 5.5 Layer 3 — `SchemeSwitcher` (thin wrapper, holds the browser dep)

```ts
type SchemeSwitcherProps = {
  as?: "toggle" | "picker"                 // which Layer-2 form; default per §9
  icons: SchemeIcons
  storageKey?: string
  // resolver/persistence/apply overridable for Electron/RN/tests; default to logic/browser
}
```

```tsx
export const SchemeSwitcher = ({ as = "toggle", icons, ...opts }: SchemeSwitcherProps) => {
  const { mode, cycleMode, setMode } = useScheme({
    mode: /* persisted */, resolver: matchMediaResolver(),
    persistence: localStoragePersistence(opts.storageKey), apply: dataSchemeApplier(), ...opts,
  })
  return as === "picker"
    ? <SchemePicker mode={mode} onChange={setMode} icons={icons} />
    : <SchemeToggle mode={mode} onCycle={cycleMode} icons={icons} />
}
```

This is the only piece that imports `logic/browser`. Layers 1–2 and the core stay
runtime-agnostic.

---

## 6. Non-browser consumer — Electron `nativeTheme`, concretely

The image-viewer (Electron) passes its own resolver; nothing else changes:

```ts
// Electron renderer/preload
import { nativeTheme } from "electron"

const nativeThemeResolver: SchemeResolver = {
  get: () => (nativeTheme.shouldUseDarkColors ? "dark" : "light"),
  subscribe: (listener) => {
    nativeTheme.on("updated", listener)
    return () => nativeTheme.off("updated", listener)
  },
}

useScheme({ mode: "system", resolver: nativeThemeResolver, /* persistence/apply as usual */ })
```

React-Native (future) is the same three lines over `Appearance.getColorScheme()` /
`Appearance.addChangeListener`, with an `apply` that sets a context value instead of a DOM
attribute. The seam's two members are all any of them need.

---

## 7. First-paint (flash-of-wrong-theme)

Today [`2026-07-31-tokens-ships-the-first-paint-snippet`] ships `buildFirstPaintRule(variant,
scheme)` → `html, body { background-color: var(--color-surface-base, <hex>); color-scheme: <scheme>; }`
and each app pins **one** scheme's line inline. Following the OS/persisted choice breaks that
"pin one scheme" assumption two ways:

1. The `<html data-scheme>` attribute must be set **before first paint**, from the persisted /
   OS choice, so `variables.css` selects the right block.
2. The inline hex fallback (the instant before `variables.css` loads) must branch on the
   *resolved* scheme, not be a fixed dark `#131822`.

### Proposed addition to `@charcuterie/tokens`: `buildFirstPaintScript(variant, { storageKey })`

Generates an inline **`<head>` script + style** (still copy-me, never `<link>` — the round-trip
is the enemy). The script reproduces the hook's resolution using the **same storage key**, sets
the attribute, and writes the correct fallback hex from the token source:

```html
<!-- Generated by @charcuterie/tokens — paste into <head> BEFORE any stylesheet. -->
<script>
  (function () {
    var KEY = "charcuterie-scheme";
    var mode = localStorage.getItem(KEY) || "system";
    var dark = mode === "dark" ||
      (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    var scheme = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-scheme", scheme);
    var bg = dark ? "#131822" : "#F5F7FA";           // daylight surface.base, from token source
    var s = document.createElement("style");
    s.textContent = "html,body{background-color:var(--color-surface-base,"+bg+");color-scheme:"+scheme+"}";
    document.head.appendChild(s);
  })();
</script>
```

**How it stays in sync with the runtime hook** — three shared constants, all generated from one
source so drift is a failed test, not a silent flash:

- **Storage key** — `buildFirstPaintScript`'s `storageKey` and `localStoragePersistence`'s key
  are the same value; a consumer passes one constant to both.
- **Hexes** — `#131822` / `#F5F7FA` come from `daylight.schemes[scheme].surface.base`, the same
  token `buildFirstPaintRule` already reads; `distFreshness.test.ts` fails if the artifact drifts.
- **Resolution rule** — `mode==="system" ? OS : mode` is identical in the snippet and the core.

The `var()` fallback stays load-bearing and unchanged (an unlayered inline literal must still
win the pre-token instant). This is a strict superset of today's rule: an app that never offers
`system` and hard-pins dark can still paste the old one-line `buildFirstPaintRule` output.

**Open item (§9):** whether this ships now as part of the switcher work, or is filed as a
follow-up token change — it touches every consumer's `index.html` and belongs to a `tokens`
minor, separate from the `ui`/`logic` component work.

---

## 8. Accessibility

- **Form A** is a `<button>` (via `IconButton`, which forces a non-empty `label` → `aria-label`).
  The label states the current mode, so the control is agent-drivable
  (`getByRole("button", { name: /colour scheme/i })`) and a screen reader announces the current
  mode on focus. Optional enhancement: a `VisuallyHidden` `role="status"` that echoes the new
  mode after a cycle — if added it carries **both** text content and a matching `aria-label`
  per [`2026-07-29-status-regions-carry-an-aria-label`].
- **Form B** inherits `SegmentedControl`'s `radiogroup` + per-option `radio` semantics and its
  required group `label`. Already drivable; each option is `getByRole("radio", { name: "System" })`.
- The icons are `aria-hidden` (IconButton wraps `children` in an `aria-hidden` span; the segmented
  option's accessible name is its text label), so a missing/again-blank glyph never becomes the
  accessible name.

---

## 9. Owner decisions (please pick)

1. **Form:** ship **A (cycling `SchemeToggle`)**, **B (`SchemePicker` segmented)**, or **both**
   with `SchemeSwitcher as="toggle"|"picker"`? (Recommendation: ship both Layer-2 forms; default
   `SchemeSwitcher` to `toggle`, matching the owner's original description and the tight kiosk/toolbar slot.)
2. **Names.** Three internally-consistent sets, all grounded in the `data-scheme` vocabulary and
   the existing `use*`/`*Control`/`*Picker` nomenclature. **Pick a row (or mix):**

   | | Layer 2 (cycle) | Layer 2 (segmented) | Layer 3 connected | Hook |
   | --- | --- | --- | --- | --- |
   | **A (recommended)** | `SchemeToggle` | `SchemePicker` | `SchemeSwitcher` | `useScheme` |
   | **B** | `SchemeCycle` | `SchemeControl` | `SchemeSwitcher` | `useScheme` |
   | **C** | `SchemeToggle` | `SchemeSegmented` | `ColorSchemeControl` | `useColorScheme` |

   Rationale for A: `SchemePicker` parallels `SinglePicker`; `SchemeToggle` reads as the
   single-button form; `SchemeSwitcher` is the batteries-included drop-in; `useScheme` parallels
   `useVisibility`. Note `useColorScheme` (C) leaks the CSS spelling `color` where the repo's
   TS/vocabulary is `scheme`/`Colour` — flagged, not recommended.
3. **Cycle order:** `light → dark → system` (recommended, matches the icon reading order) vs
   `dark → light → system` (the fleet default scheme is `dark`, so this starts "where you are").
4. **Default initial mode:** `system` (follow OS out of the box) vs `dark` (today's hard-pinned
   fleet default). Recommendation: `system`, since the point of this work is to make OS-follow real.
5. **Icon omission:** require all three icon nodes (like `IconButton`), or allow a **text**
   ("Light/Dark/System") fallback? (Text is allowed where a glyph is not.)
6. **First-paint script (§7):** land it in this effort, or file as a separate `@charcuterie/tokens`
   minor (it edits every consumer's `index.html`)?

Nothing is built. On sign-off this becomes a milestone doc + a decision record, then the
component/hook/tokens work proceeds.
