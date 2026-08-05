---
"@charcuterie/ui": minor
---

Polish the boolean-input family (`Checkbox`, `RadioGroup`, `Switch`) and add read-only.

- **`isReadOnly`** on all three — shows the value at full contrast but refuses to change
  it (`aria-readonly`, toggle blocked on pointer and keyboard; a read-only `RadioGroup`
  severs selection-follows-focus so focus can still travel to read). It wears the
  **neutral** intent instead of the accent, so it reads as an informational value rather
  than an actionable control — distinct from both enabled (accent) and disabled.
- **Disabled is visible again.** The token scale has no step between `border-default`
  and `border-strong`, so a muted outline was either invisible or looked enabled;
  disabled now dims the whole control with `opacity-60`, keeping full shape and colour.
- **Unified border weight.** The `Checkbox` box, `RadioGroup` ring, and `Switch` track
  all carry a 2px edge, and the radio ring is now the same diameter as the switch knob,
  so the three read as one set.
