---
"@charcuterie/ui": minor
---

Add `.charcuterie-scrollbar` to `@charcuterie/ui/styles.css` — a thin, token-tinted
scrollbar any scrolling element opts into. It pairs the standard
`scrollbar-width: thin` / `scrollbar-color` (Firefox, and Chromium from 121) with a
`::-webkit-scrollbar` fallback for older Chromium and Safari, so the rounded thumb and
track inset still draw where the standard properties cannot reach. WebKit step buttons
(`::-webkit-scrollbar-button`) are suppressed — the affordance is thumb + track only.

Both paths read the same three roles — `border-strong` (thumb), `surface-sunken`
(track), `content-muted` (thumb hover) — so the bar flips with `[data-scheme]` on the
same repaint as the rest of the page, with nothing in React observing it. This is the
fleet's `scrollbar-thin-token` (gallery-downloader) and global `::-webkit-scrollbar`
block (image-viewer) promoted to one owned copy; `Utilities/Scrollbar` in Storybook
demonstrates it on the vertical, horizontal, and both-axes cases.
