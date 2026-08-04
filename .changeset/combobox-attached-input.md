---
"@charcuterie/ui": minor
---

Combobox: add attached-input mode (`inputRef`). Combobox binds to a
consumer-owned `<input>` instead of rendering its own — the field is both the
value and the query — anchoring a list-only popup to it and mirroring the
combobox ARIA onto it. Because the consumer owns `isVisible`, a select does not
auto-dismiss in this mode, which supports drill-down (e.g. folder navigation
that appends a segment and re-queries the new directory without closing). Also
adds an optional `anchorRef` to `useAnchoredOverlay` for anchoring a panel to an
existing element rather than a cloned trigger.
