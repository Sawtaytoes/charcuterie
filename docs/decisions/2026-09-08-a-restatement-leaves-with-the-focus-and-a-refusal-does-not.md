# A restatement leaves with the focus, and a refusal does not

- **Status:** Accepted
- **Date:** 2026-09-08
- **Type:** Component behaviour
- **Supersedes:** —
- **Superseded by:** —

## Decision

The line under a `TimecodeInput` is a **reading of the field that has the focus**. When the
focus leaves, a plain restatement of a value goes with it.

Two things stay up after the blur:

1. **`rangeRefusal`** — the zero-length complaint. It is written *at the commit*, and the
   commit **is** the blur.
2. **An unparsed text.** `aria-invalid` stays true while the field holds something the
   grammar cannot read, so the sentence that says why stays with it.

`activeEndpoint` is **not** the focus state and must not be repurposed as one. It answers
*which endpoint the arrow steps and the echo belong to*, and it has to survive blur for both
cases above. A separate `isFocused` answers *whether anybody is typing*, and only that one
may hide the line.

## Context

`TimecodeInput` shipped in `@charcuterie/ui@4.0.0` deriving the echo from
`texts[activeEndpoint]`, with `activeEndpoint` seeded to `"start"`. Nothing cleared it, so a
field the reader had never touched printed its start mark underneath itself, permanently.

On screen that is an unlabelled `00:05:00` floating below two inputs. The owner reviewed the
component in QueuePilot's section editor and called it a defect.

## Why

**A restatement with no focus has no subject.** The line exists to say *what the text you are
typing resolves to*. Nobody is typing, so there is no text it is about, and a bare timecode
with no caption reads as a value the control holds rather than as a report on one.

**A refusal has a subject either way.** It names a fault in a value that is still in the
field, and the control still carries `aria-invalid`. Removing the message would leave an
invalid control with nothing saying why — worse than the stray line this rule deletes.

**The zero-length complaint would otherwise be unreachable.** It is produced by the commit
path, and blur is one of the two commits. A rule of *"clear the echo on blur"* written
without this exception would have made a message that can never be read on the interaction
that produces it.

**The live region costs nothing here.** Emptying a `role="status"` region announces nothing,
so hiding the line on every blur adds no screen-reader chatter. What is forbidden is a
transition that *writes* and then clears, because that one does announce.

## Evidence

The owner, reviewing the field in QueuePilot: the line under an untouched section is *"a
loose, unlabelled timecode floating under the fields"*.

Asserted in `TimecodeInput.test.tsx`:

- the echo leaves on blur while the committed value stays,
- an unparsed text keeps both `aria-invalid` and its message after the blur,
- the zero-length refusal survives the blur that wrote it.
