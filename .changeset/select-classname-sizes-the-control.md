---
"@charcuterie/ui": major
---

`Select`'s `className` now sizes the control, and `controlClassName` is the inner escape hatch

`Select` renders a wrapper around the native `<select>` because the chevron has to live
somewhere, and the chevron is positioned against that wrapper. `className` went to the
inner element only, so a caller writing `<Select className="w-44" />` got a 176px
`<select>` inside a wrapper still at `w-full`, with the chevron pinned to the wrapper's
right edge — measured **869.6px** from the control it belongs to in mux-magic's DSL rules
builder, with the control's own text clipping beside it. There was no way to size a
`Select` at all.

`className` now lands on the wrapper, matching every other component in this package, so
`className="w-44"` means "this control is 176px", chevron included. The inner `<select>`
stays `w-full` inside it, and the default is unchanged: with no `className`, the control
still fills its parent.

**Breaking, for callers passing an inner-element class.** Anything about the `<select>`
itself rather than the outer box — `font-mono` on the option text, a `text-*`, a `bg-*` —
moves to the new `controlClassName`:

```diff
-<Select className="w-44 font-mono" … />
+<Select className="w-44" controlClassName="font-mono" … />
```

Widths, margins (`ms-auto`), display and position classes need no change — those were
always meant for the outer box, and are what this fixes.
