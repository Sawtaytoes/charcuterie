---
"@charcuterie/ui": minor
---

`ColorSchemeToggle` and `ColorSchemeSwitcher` now take an `intent` prop (the same
`IntentName` tone union `Button`/`IconButton` accept) and forward it to the underlying
`IconButton`.

**Intended, non-accidental default change:** `intent` defaults to `neutral`, where the
control previously inherited `IconButton`'s `accent` default. A scheme switcher is toolbar
chrome, so its ghost hover now renders `hover:bg-intent-neutral-surface` and its icon
`text-intent-neutral-content` instead of accent-violet — which is what makes it read as
chrome on real app surfaces and removes the need for consumers to override it with an
`!important` className. `appearance` still defaults to `ghost`. Pass `intent="accent"` (or
any tone) to restore an accent action.
