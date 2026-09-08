# Milliseconds are optional to read as well as to type

- **Status:** Accepted
- **Date:** 2026-09-08
- **Type:** Component behaviour
- **Supersedes:** —
- **Superseded by:** —

## Decision

`TimecodeInput` writes a whole number of seconds back **without a fraction**. `1:01:00`
commits as `01:01:00`, and `1:01:00.5` still commits as `01:01:00.500`.

The mechanism is `formatTimecode`'s new `millisecondDigits: "auto"`, which prints the
fraction only when the value is not a whole number of seconds, at the same three digits when
it does print one.

**The exported default stays at `3`.** `formatTimecode` is a published export with callers
across the fleet; `TimecodeInput` opts in to `"auto"` — for the text it writes back *and* for
its own echo, so the two agree on the page. The overflow refusal keeps
`millisecondDigits: 0`, because *"type 02:30 to carry it"* is an instruction, not a position.

## Context

The grammar has always read the fraction as optional: all three accepting rules end
`(?:[.,](\d{1,3}))?`. Only the printer disagreed, so typing `01:01:00` and tabbing away
rewrote the field to `01:01:00.000`.

`timecode.ts` had also written the opposite rule down — *"the default is the canonical
`hh:mm:ss.mmm`, and that is what the field writes back on commit"* — which is why this needs
a record rather than only a fix.

## Why

**It is how a decimal number is written.** You write 3, not 3.000. A typist who appended no
fraction did not ask for one, and the field answering with three zeroes reads as the control
correcting them.

**The round trip does not need the padding.** `parseTimecodeInput` reads `01:01:00` and
`01:01:00.500` to the same numbers that produced them, so the shorter spelling costs the
re-read nothing. That was the whole argument for one canonical form, and it survives.

**Changing the export's default would have been silent.** Every direct caller of
`formatTimecode` — five hand-rolled printers were replaced by it — would have changed output
with no error and no type change. A new option value is visible in the signature.

## Evidence

The owner: *"the milliseconds could be optional as in, if you don't type them, just assume
they're `.000` like with any regular decimal number."*

Asserted in `timecode.test.ts` (`"auto"` at both ends, composed with `isHoursShown`, and the
default held at three digits) and in `TimecodeInput.test.tsx` (type-then-commit round trip).
