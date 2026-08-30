---
"@charcuterie/ui": patch
---

Make `VirtualizedGrid` follow the nearest vertical scroll region, including `Main` inside an
app `Shell`, instead of always observing the browser window.
