---
"@charcuterie/ui": minor
---

`MediaTile` can be a button. `onClick` gets the same hover, focus-visible
ring and `cursor-pointer` the `href` link already had. Wrapping the tile
in a bare `<button>` is how a Collection thumbnail ended up with a text
cursor and no hover at all.

An empty `title` skips the caption (the parent already printed the name)
and the control is named from `alt`.
