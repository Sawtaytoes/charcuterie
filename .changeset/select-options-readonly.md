---
"@charcuterie/ui": patch
---

`SelectProps.options` accepts a `readonly` array.

A consumer's options table is usually a constant, and TypeScript will not hand a `readonly`
array to a mutable parameter — an `as const` options list failed with `TS4104` and had to be
copied at every call site. `Select` only ever `.map`s over the list, so the mutable parameter
was asking for a permission it never uses.
