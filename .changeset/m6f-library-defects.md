---
"@charcuterie/ui": minor
---

Slot components nest, `FieldGroup` labels several controls, and a `LogViewer` follows after a reveal

Two defects, both found by a real consumer rather than by this repo's own suite, and both
of the same shape: **two components each individually correct, wrong in composition.**

**`Field` and `Tooltip` could not nest.** Both clone onto their one child, so
`<Field><Tooltip><input/></Tooltip></Field>` handed `Field`'s `id`, `aria-describedby`,
`aria-invalid` and `required` to the `Tooltip` **component**, which declares none of them.
`cloneElement` does not care, React drops them with no warning, TypeScript never sees it
(`Children.only` returns a `ReactElement` whose props are `any`), every test passed and the
render was pixel-identical. The only symptom was a `<label htmlFor>` pointing at an id
nowhere in the document — the exact unnamed-textbox defect `Field` exists to prevent, this
time produced by the library.

The rule now is that **a slot is a pass-through**. New `SlotProps` and `mergeSlotProps`
(both exported) define the five keys a cloning ancestor injects and how they merge:
last-write-wins for four, and a **join** for `aria-describedby`, which is a list — a
`Field` naming its description and its error and a `Tooltip` naming its tip is the whole
nesting problem in one attribute, and a plain spread keeps one and loses the other. Outer
first. It works in both orders, and the second is not symmetrical: a `Tooltip` around a
`Field` hands down not one attribute but a working component — floating-ui's hover, focus
and dismiss handlers and `refs.setReference` — all of which reach the control too, or the
tip is a floating node with no trigger and no anchor.

**New `FieldGroup`** — a `<fieldset>` + `<legend>` for one label over several controls,
which is where `Field` cannot go: an `id` names one element and a `<label htmlFor>` points
at one, so a `Field` over three inputs names one of them and leaves two anonymous. Six of
mux-magic's sixteen field components are in that position. This is the one place in the
library where `<fieldset>` is right, because here the content really is a form-control
grouping. `error` on a group is **described, not asserted**: `aria-invalid` has no group
form, it belongs on the control that is actually invalid, and cloning it onto every child
would mark the valid ones invalid. That limitation is stated rather than papered over.

**A `LogViewer` inside a collapsed `Accordion` never followed.** `AccordionSection` renders
its panel `hidden` rather than unmounting it, deliberately — an unmounted panel loses a
scroll position and any subscription its content opened, and the fleet's log panes are
exactly that. A `hidden` subtree has no layout box, so the mount effect measured
`scrollHeight 0`, wrote `scrollTop = 0`, and never ran again: neither `isFollowing` nor the
lines change when the section opens. Measured in mux-magic on a 60-line pane —
`scrollHeight 0` collapsed, `scrollHeight 976 / clientHeight 254 / scrollTop 0` after
expanding — so the log opened on its **first** line. That is this component's own `}, [])`
bug rebuilt out of two components whose individual decisions are both right, invisible to
both of their test suites. Fixed with a `ResizeObserver` on the pane, live only while
following: `ResizeObserver` answers "does it have a box", which is the precondition the
measurement needs, where an `IntersectionObserver` answers "is it on screen", which is a
different question with two wrong answers here. mux-magic's downstream `DisclosedLogViewer`
workaround is now deletable.

Every fix carries a regression test proven to fail without it. `SlotProps` is a `Pick` out
of React's `InputHTMLAttributes` rather than a hand-written shape, because three of its
five keys are booleans whose names are the DOM's and cannot take the house `is`/`has`
prefix.
