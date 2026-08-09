---
"@charcuterie/ui": minor
---

Add `.charcuterie-scrollbar` to `@charcuterie/ui/styles.css` — a token-tinted
scrollbar any scrolling element opts into. The designed look is the
`::-webkit-scrollbar` path (12px bar, rounded thumb, track-coloured inset, no
step buttons) on Chromium, Edge, and Safari. Firefox gets the closest
`scrollbar-width: thin` / `scrollbar-color` match, scoped behind a
`-moz-appearance` `@supports` probe so Chromium 121+ does not prefer the thin
OS chrome over the designed bar.

Both paths read the same three roles — `border-strong` (thumb), `surface-sunken`
(track), `content-muted` (thumb hover) — so the bar flips with `[data-scheme]` on the
same repaint as the rest of the page, with nothing in React observing it. This is the
fleet's `scrollbar-thin-token` (gallery-downloader) and global `::-webkit-scrollbar`
block (image-viewer) promoted to one owned copy; `Utilities/Scrollbar` in Storybook
demonstrates it on the vertical, horizontal, and both-axes cases.
