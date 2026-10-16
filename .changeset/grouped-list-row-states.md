---
"@charcuterie/ui": minor
---

`GroupedList` rows gain per-item states. `onSelect` (named by `selectLabel`, default `label`) makes the whole row one native button with hover, press and inset focus-visible states, drawn under the row's text so `actions` stay separate targets above it. `aside` places a non-interactive figure beside the text in a wide list and under it in a narrow one. `isMuted` recedes a switched-off row with a sunken surface and a quieter label, without dropping below AA. `isHighlighted` rings the row in `highlightIntent` (default `accent`) and pulses twice; change the row's `key` to pulse it again. The pulse is a new `charcuterie-highlight` animation in `@charcuterie/ui/styles.css`, off under reduced motion.
