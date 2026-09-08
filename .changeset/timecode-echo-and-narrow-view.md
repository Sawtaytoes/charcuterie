---
"@charcuterie/ui": patch
---

`TimecodeInput`: the echo leaves with the focus, and the Narrow View stacks the two fields.

The restatement under the field was derived from `activeEndpoint`, which seeds to `"start"`
and never clears — so an untouched control printed its start mark under it forever, as a
loose unlabelled timecode with nothing saying what it was. It is now a reading of the
**focused** field. Both refusals still persist: the zero-length complaint is written at the
commit, which *is* the blur, and an unparsed text keeps `aria-invalid` on the control, so
the sentence that says why has to stay with it.

Below `--cq-sm` a section stops being `[start] to [end]` in a row. The fields stack under a
"Start" caption and an "End" caption, because two `hh:mm:ss.mmm` fields and the word between
them fill a 390px modal edge to edge. It is a **container** query — the box that ran out of
room is this field's, and the same modal on a 2560px monitor is a Wide View to every media
query. The captions are `aria-hidden`, exactly as `to` always was, so the accessible name of
each control is identical in both layouts.

**Why `patch` and not `minor`**: no prop, no type and no default changed, and a caller wider
than `--cq-sm` renders exactly what it rendered before. Both halves are the component doing
what its own documentation already claimed. The one thing to know is that `TimecodeInput`
now declares `@container`, so it carries `contain: inline-size` and takes its width from its
parent rather than from its content — the same trade `Card`, `Alert` and `DataTable` make.
Give it a definite inline size.
