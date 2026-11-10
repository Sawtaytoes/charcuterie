---
"@charcuterie/ui": patch
---

A list item that moves while it is still entering now slides to its new place instead of jumping. The enter animation (`charcuterie-item-enter`) fades and grows the item a little instead of raising it, so it no longer animates `translate`, which the slide writes inline and a running animation would override.
