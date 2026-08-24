---
"@charcuterie/ui": minor
---

`CopyButton` — a button that puts a string on the clipboard and says so.

Four repos spell this by hand and no two agree on the failure: mux-magic's YAML dialog flips
its own label on a `setTimeout` and still says `Copied!` when nothing was copied, spoolbuddy
carries a 15-line `copyToClipboard` inline, bambuddy copies a download link from two menus,
and mail-sifter's verification-code banner marks the mail done on the press.

The confirmation is the button rather than a toast, the labels are words (`Copy` → `Copied`
→ `Copy failed`) because this library ships no icons and a colour is not a message, the
outcome is also written into a `role="status"` region, and `onCopy(isCopied, value)` tells
the caller what actually happened. `copyText` is exported and injectable: it tries
`navigator.clipboard`, falls back to `execCommand` for an insecure context, and never
throws.
