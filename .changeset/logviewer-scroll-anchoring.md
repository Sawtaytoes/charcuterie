---
"@charcuterie/ui": patch
---

`LogViewer` opts a following pane out of the browser's scroll anchoring, so the
bottom stays the bottom across a relayout.

Chromium picks an anchor node inside a scroll container and moves `scrollTop` to
hold it still whenever the content is laid out again. For a log pane that is the
browser undoing the follow. `@charcuterie/tokens` ships Victor Mono with
`font-display: swap`, so a pane that mounts before the face arrives is laid out
in the fallback, scrolled to the end, and then laid out a second time in the real
face — and the anchor drags it back off the end. Measured on the 60-line
`Interactive` story with the font request held back: `scrollTop` 722 (at the end)
without anchoring, 721 (a pixel short) with it.

Whether the font swap beats the mount is a race, so the pane followed correctly on
some renders and not others. It surfaced as visual-regression flake on exactly one
story rather than as a bug report, and the existing DOM assertions could not catch
it — their four pixels of slack are there for fractional device pixel ratios, and
the drift fits inside them.

The opt-out applies **only while following**. A user who has scrolled up keeps
anchoring, which is what stops `maxLines` dropping lines off the top from shoving
the line they are reading up the pane.
