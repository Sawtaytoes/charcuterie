---
"@charcuterie/ui": minor
---

`Checkbox` accepts `value` — the `<input>`'s `value` attribute, i.e. which member of a
group the box is, as opposed to whether it is ticked.

A lone boolean does not need it. A group does: a group is read back with one query over
its container (`[...group.querySelectorAll("input")].filter(i => i.checked).map(i =>
i.value)`), and without a `value` every box answers the UA default `"on"`, so that read
returns N copies of one meaningless string. That gap is why queuepilot's library and
ratings pickers were still hand-rolling a raw `<input type="checkbox">` rather than
adopting this component.

Passed straight through and otherwise inert — it is not the checked state and does not
become one. `isChecked` still seeds the box and `onChange` still reports a boolean, so
nothing about the uncontrolled contract changes.
