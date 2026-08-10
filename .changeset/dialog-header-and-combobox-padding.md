---
"@charcuterie/ui": patch
---

Dialog: centre the header row (`items-center`) so the Close button sits on the
heading's baseline instead of above it.

Combobox: give the internal search-input row a 0.75rem horizontal inset
(`px-3`) so the caret/placeholder line up with the option text below (each
option sits at listbox `p-1` + option `px-2` = 0.75rem). Classic mode only;
attached-input mode renders no internal input.
