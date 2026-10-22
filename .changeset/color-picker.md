---
"@charcuterie/ui": minor
---

Add `ColorPicker`: a searchable list of the app's named color presets, each a `Swatch` and its name, with an optional "Custom color…" row that opens the browser's color wheel and a hex field. An app rule, `getColorError`, can refuse a custom color with its own message. `parseHexColor` is exported for apps that store the same `#RRGGBB` form.
