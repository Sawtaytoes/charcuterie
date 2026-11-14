---
"@charcuterie/ui": patch
---

`Avatar` and `PortraitTiles` now notice a photo that failed before a server render hydrated, and show the initials instead of a broken-image glyph. React does not repeat an image's `error` event when it hydrates, so `onError` alone missed it. `PortraitTiles` also tries a new `imageSrc` after an earlier one failed; it used to show the initials for the rest of the tile's life. Client-rendered apps see no change.
