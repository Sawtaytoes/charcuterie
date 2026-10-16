---
"@charcuterie/ui": minor
---

`GroupedList` takes `isHeadingSticky`: each group heading stays at the top of the nearest scrolling ancestor while its rows scroll under it. The stuck heading's background comes from `--charcuterie-grouped-list-heading-surface` (default `--color-surface-base`) and its distance from the top edge from `--charcuterie-grouped-list-heading-offset` (default `0px`), so a host on a raised pane or under a sticky `Header` can match it. Both property names are exported.
