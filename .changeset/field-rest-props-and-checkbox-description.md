---
"@charcuterie/ui": minor
---

`Field`, `FieldGroup` and `Checkbox`: props instead of a `className`

**Minor, not patch and not major.** Three additive props with no behaviour change for an
existing call site — the widened types describe where the runtime already sent things — so
nothing here is a fix, and nothing here is breaking. `yarn typecheck` passes across the
workspace with the old call sites untouched.

- **`FieldProps` and `FieldGroupProps` spread their rest props.** They were closed types, so
  the only prop that reached an element was `className` — the escape hatch the "configured
  by props, not a borrowed class" rule exists to close. `Field` clones its child, so its
  props are that **control's**: `name`, `placeholder`, `autoFocus`, `aria-*` and `ref`, next
  to the `id` that has landed there since the component shipped. `className` stays on the
  wrapping `<div>` and is the only exception. `FieldGroup` wraps, so its props are the
  **`<fieldset>`'s**: `id`, `hidden`, `ref`, and the element's own `disabled`, `form` and
  `name`.
- **`FieldGroup` merges a caller's `aria-describedby`** with its description and error rather
  than replacing it, through `mergeSlotProps` — received first.
- **`Checkbox` takes a `description`**, with `Field`'s semantics and `Field`'s typography.
  It renders outside the `<label>`, so the hint is announced with the control rather than
  swallowed into its accessible name. `className` moves to the new wrapping `<div>`, which is
  still the outermost element the component renders.
- `mergeSlotProps` is generic in its received props, so a wrapping component keeps its own
  prop type on the way out.
