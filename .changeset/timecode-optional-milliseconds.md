---
"@charcuterie/ui": minor
---

`formatTimecode` accepts `millisecondDigits: "auto"`, and `TimecodeInput` uses it.

The grammar has always read a fraction as optional, but the printer did not write one that
way: typing `1:01:00` and tabbing away rewrote the field to `01:01:00.000`. You write 3, not
3.000. `"auto"` prints the fraction only when the value is not a whole number of seconds, and
prints all three digits when it does.

The **default is still `3`**. Changing it would have altered the output of every direct
caller of a published export, none of which this change can see. `TimecodeInput` opts in
instead — for the text it writes back on commit and for its own echo, so the two agree on the
page. The overflow refusal keeps `millisecondDigits: 0`, which is what a "type 02:30 to carry
it" message wants.

`minor` rather than `patch`: `FormatTimecodeOptions.millisecondDigits` widens from `number` to
`"auto" | number`, which is new API surface on an exported type.
