---
"@charcuterie/ui": patch
---

Listbox/Combobox: disabled options now look disabled, the Listbox active
option is visible when opened by mouse, and a multi-select chip removes on a
click anywhere (not only the ✕).

- **Disabled colour was clobbered.** The option row set `text-content-primary`
  in its base class and `text-content-disabled` conditionally — equal
  specificity, base emitted last, so a disabled option rendered full-strength.
  It read as a normal row the arrow keys "wrongly" skipped. The base now sets no
  colour; one of the two applies.
- **Listbox active row was invisible on mouse-open.** The roving focus lands on
  the first/selected option when the popup opens, but the indicator was a
  `:focus-visible` ring, which a mouse-triggered open does not match — so the
  active option had no highlight and the first ArrowDown looked like it skipped
  it. The active row now takes a fill on `:focus` (any focus), keeping the
  keyboard ring on top.
- **Whole chip removes.** A multi-select chip is now a single remove `<button>`
  (the ✕ is decorative) rather than a label wrapping a small ✕ button — a bigger
  target, no nested interactive element, and it tints danger on hover.
