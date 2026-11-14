---
"@charcuterie/ui": patch
---

`Avatar` and `PortraitTiles` now notice a photo that failed before a server render hydrated, and show the initials instead of a broken-image glyph. React does not repeat an image's `error` event when it hydrates, so `onError` alone missed it. `PortraitTiles` also tries a new `imageSrc` after an earlier one failed, in any app; before, a tile whose photo failed showed the initials for the rest of its life. `Avatar` already did this, so a client-rendered `Avatar` behaves as before.
