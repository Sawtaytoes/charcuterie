---
"@charcuterie/logic": minor
"@charcuterie/ui": minor
---

Add `CommandPalette`, the launcher: a search field over a grouped list in a `Modal`. It lists the caller's `suggestions` before anything is typed, filters `items` by word prefix (initials and camel-case steps count; case and accents fold), routes a prefix command such as `au lego` to one of the caller's `prefixes`, and ends with the caller's `getFallbackItem` row. Arrow keys, Home, End, Enter, Ctrl or Meta Enter (a link row in a new tab), and Escape; focus stays in the field with `aria-activedescendant`. `useCommandPalette()` holds the open state and registers the global keys; `useCommandPaletteHotkeys()` is the keys alone (`Ctrl K`, `Ctrl Space`, `/`, and type-to-open). `@charcuterie/logic` gains the pure matcher: `matchWordPrefixes`, `rankWordPrefixMatches`, `parsePrefixCommand`, `toQueryWords`, and `WORD_PREFIX_TIERS`.
