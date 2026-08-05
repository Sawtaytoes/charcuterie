---
"@charcuterie/ui": patch
---

Combobox/Listbox: fix an invisible option highlight, and make Combobox
multi-select tags persistent.

- The option row carried a base `bg-transparent`, a plain `background-color`
  utility Tailwind emits *after* the `bg-intent-*-surface` state tints — so at
  equal specificity it silently won every row. Combobox's keyboard cursor
  (`aria-activedescendant`) and both components' selected fills rendered with no
  background, which read as "the arrow keys do nothing". The base class no
  longer sets a background (a button is transparent by default), so the tints
  apply.
- The row highlight also switches from `intent-neutral-surface` to
  `intent-neutral-surface-hover`: on the `surface-overlay` panel the plain tint
  is darker than the surface in every dark scheme, so even once it applied it
  read as no change. `-hover` is the visible token there.
- Combobox multi-select (`isMultiple`) chips now render as an always-visible,
  removable tag row above the trigger instead of inside the popup, so a picked
  value stays on screen after the popup closes. Each chip shows the option's
  human label (e.g. "English", not "eng") and an ✕ remove control.
