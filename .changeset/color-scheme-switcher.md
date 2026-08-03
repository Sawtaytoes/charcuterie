---
"@charcuterie/tokens": minor
"@charcuterie/logic": minor
"@charcuterie/ui": minor
---

Add the three-mode (light / dark / system) colour-scheme switcher.

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
