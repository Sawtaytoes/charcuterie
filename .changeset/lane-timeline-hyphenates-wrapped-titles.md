---
"@charcuterie/ui": patch
---

`LaneTimeline` hyphenates a wrapped title. A column just past the wrap threshold is narrower than one long word, so it broke mid-word; with `hyphens: auto` a browser with a dictionary breaks it at a syllable, and the `overflow-wrap: anywhere` fallback stays for one without.
