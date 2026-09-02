# A timecode is milliseconds, and a section of media is `isRange`

- **Status:** Accepted
- **Date:** 2026-09-01
- **Type:** Component API
- **Supersedes:** —
- **Superseded by:** —

## Decision

`TimecodeInput` is a **text field**, not an `<input type="time">`. It reads
`hh:mm:ss.mmm`, and `isRange` turns it into a section editor with a start and an end.

**The value is an integer count of milliseconds.** A media position is a duration from the
start of the file, so it is a number: not a `Date`, not a clock string, not seconds. Every
prop that carries one keeps the `Ms` suffix — `durationMs`, `maxValueMs`, `minValueMs`,
`stepMs`, `valueMs` — under the fleet's existing rule that a duration states its unit and a
`*At` timestamp does not
([2026-08-25](2026-08-25-an-outbound-http-cache-names-its-fields-fetchedat-and-expiresat.md)).

**The grammar is ordered, anchored and total.** Three accepting rules, each matched against
the whole input, first match wins:

| Rule | Example | Reads as |
| --- | --- | --- |
| `ss[.mmm]` | `90`, `1.5` | 90 seconds, 1.5 seconds |
| `mm:ss[.mmm]` | `1:30`, `90:00` | 90 seconds, 90 minutes |
| `hh:mm:ss[.mmm]` | `1:02:03.500` | 3 723 500 ms |

A leading `+` is tolerated. The fraction separator may be `.` or `,`. Surrounding and
interior whitespace is stripped.

**The largest field present is unbounded; every smaller field is 0–59.** That one sentence
is every bound in the grammar. `90` is ninety seconds, `90:00` is ninety minutes, and `1:90`
is **refused** — the minute beside it makes 90 a seconds field.

**Every refusal has a name and a reason. Nothing is a nearest guess.** Refused: a negative;
a seconds or minutes field of 60 or more with a larger field beside it; more than three
colon-separated parts; a fraction longer than three digits; anything the accepting rules do
not match. A refused value leaves the typed text **exactly as typed**, marks the field
invalid, and states the reason in the echo line.

**Nothing commits without an echo.** A `<p aria-live="polite" role="status">` under the
field is wired into the input's `aria-describedby`. It shows the resolved position in full,
or the refusal reason in the danger colour. It also states a clamp before it happens: a
position past the end of the media reads *"01:00:00.000 is outside the media, so it commits
as 00:45:12.000."*

**Commit is Enter or blur. A keystroke never commits.** Escape puts the last committed value
back.

**A section is `isRange`, a mode, not a `TimecodeRangeInput` sibling**, following
[`DatePicker`](2026-08-19-a-date-is-a-calendar-date-not-an-instant.md) and
[`Combobox`'s `isMultiple`](2026-08-05-combobox-multi-select-stays-ismultiple-not-a-separate-component.md).
`value` seeds and never controls, matching `Select`
([2026-07-31](2026-07-31-select-is-uncontrolled-because-the-platform-owns-the-value.md)).
There is no discriminated props union: Storybook's docgen renders one as an untyped `{}`
object control, which is the failure `storyControls.test.ts` exists to catch.

**Both ends of a section are independently optional**, and the four combinations are four
real states rather than three plus an error:

| `start` | `end` | Means |
| --- | --- | --- |
| `null` | `null` | no window at all |
| set | `null` | from here to the end of the media |
| `null` | set | from the beginning, stopping here |
| set | set | the window between them |

So there is no `isEndOpen` prop, and clearing one end never touches the other.

**An inverted section swaps. A zero-length section is refused.** The two are settled
differently on purpose, and the split is the one genuine departure from `DatePicker`.

**There is no `error` prop.** `Field` and `FieldGroup` own the semantic error
([2026-08-21](2026-08-21-a-slot-components-rest-props-are-the-controls-props.md), *"Why no
`error` on `Checkbox`"*). This component owns the echo and nothing else.

**Height comes from `CONTROL_SIZE_CLASS` alone**, with no `MIN_TOUCH_TARGET_CLASS`
([2026-08-05](2026-08-05-controls-share-one-height-no-per-component-touch-floor.md)).

**ArrowUp and ArrowDown step by `stepMs`, Shift multiplies that by ten, and a step commits.**
The control keeps the plain `textbox` role; it is **not** a `role="spinbutton"`.

## Context

QueuePilot is adding "play only this section of a video", which needs a start and an end
over a media file of a known length. Nothing in the fleet edits a timecode today, so the app
had a choice between `<input type="time">` and a hand-rolled field in one repo — the same
choice that brought `Slider` here in August, answered the same way.

The *printing* half is a different story: it is written at least five times already, and no
two agree.

| Where | Shape | Hour | Minute |
| --- | --- | --- | --- |
| queuepilot `lib/tileFace.ts` `clock` | ms → `h:mm:ss` / `m:ss` | hidden below an hour | padded only when an hour shows |
| queuepilot `components/NowPlayingBar.tsx` `toClock` | s → `h:mm:ss` / `m:ss` | hidden below an hour | always padded |
| castkit `slatecast/formatTime.ts` | s → `m:ss` | never | never |
| mux-magic `TagMatchModal.tsx` | s → `m:ss` | never | never |
| mux-magic `SmartMatchModal.tsx` | s → `h:mm:ss` / `m:ss` | hidden below an hour | padded only when an hour shows |

Two more repos print a duration in a different vocabulary again — rip-deck's daemon CLI
(`2h 7m`) and gallery-downloader's `formatDuration` (`3m 4s`) — which is a *different* shape
and is deliberately out of scope here. This component prints positions, not elapsed times.

That is the "same shape a fourth time" argument the fleet's build-it-in-Charcuterie rule
rests on, and it is stronger than usual: the five printers do not merely duplicate each
other, they **disagree**, so the same position renders differently in two panels of the same
app.

The `1:60` trap is written down in mux-magic's own audit
(`docs/audits/2026-06-29-pre-rename-domain-decisions.md:21`), where a duration-to-timecode
conversion was moved onto date arithmetic specifically to stop the minute field overflowing.
That is a fleet-observed failure, not a hypothetical.

## Why

**On the text field.** An `<input type="time">` cannot express this value and cannot be
styled. Its value is a wall-clock `HH:MM[:SS[.sss]]` string capped at 24 hours; a media
position is a duration, and a 26-hour concert recording is a real file. Its granularity is
one second unless `step` is fractional, and its widget is painted by the platform out of
`::-webkit-datetime-edit-*` pseudo-elements that no `--color-*` variable reaches inside.
That second half is the exact mechanism behind both of the fleet's standing hatch closures —
[the native `Select`](2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md)
and [the range input](2026-08-22-the-slider-is-a-div-with-role-slider-not-an-input-range.md)
— so this is the same decision a third time rather than a new one.

**On milliseconds rather than seconds or a string.** Seconds loses the frame: at 24 fps one
frame is 41.7 ms, and a clip boundary rounded to a second is up to 24 frames wrong. A string
makes every consumer parse before it can subtract, and subtraction is the only thing anybody
does with this value. An integer millisecond count is the type that supports the operation,
and it is what every media API in the fleet already hands over.

**On a bare number meaning seconds.** It is the smallest unit the field prints, so it is the
unit a typist gets by appending nothing. Minutes was the alternative and it is worse in both
directions: `90` would be an hour and a half, and `30` typed for "thirty seconds into the
recap" would land half an hour in with nothing to say so.

**On refusing `1:90` rather than carrying it.** Carrying is what every convenient parser
does, and it moves the position by a whole minute silently. The person typing `1:90` meant
either `2:30` or `90`, and those are 60 seconds apart — far enough that the wrong one is a
different scene. So the refusal message **offers both** and takes neither. Offering is not
picking: the typist reads two options and either is one keystroke away, whereas a carry is a
decision made on their behalf that no screen ever mentions. This is the same argument
`parseDateInput` makes about `ju` being June or July.

**On the swap and the refusal being settled differently.** `DatePicker` swaps an inverted
range, and this component follows it: a person who types the end first has given two real
boundaries, and rejecting the pair throws away the one they just typed. A zero-length
section is not that. It is not a window in the wrong order, it is **not a window at all** —
it plays nothing, so there is no correct interpretation to swap into. Swapping it would
paint a valid-looking section over a typo, and the typo is likely (`5:00` typed into the end
of a section that starts at `5:00` is one fumbled field). A date range does not have this
case at all: a single-day range is a legitimate, common thing to want, which is why the two
components can hold different lines without either being inconsistent.

**On both ends being independently optional.** "From the beginning, stopping here" and "from
here to the end" are the two things QueuePilot's users will ask for most, and treating an
open start as `0` would break both of them. It would make "stopping at 5:00" look like a
window that had been fully specified, and it would then refuse a start of `6:00` typed
afterwards as *inverted* rather than letting the person see the real complaint. So an open
end is the **absence of a choice**, never a zero, and the inverted check runs only when both
ends are set.

**On the arrow keys, and on not being a spinbutton.** Stepping is what a person reaches for
when nudging a clip boundary off a bad frame, and every media tool has it. It commits, and
that is not an exception to "a keystroke never commits" but the other side of it: typing is a
draft the echo reports on, while a step is a whole gesture applied to a value that already
exists — the same act as clicking a day in `DatePicker`'s grid, which also commits. A stepper
that needed Enter afterwards is a stepper nobody presses twice.

Nothing in the library does spinbutton behaviour, and this component deliberately does not
start. `role="spinbutton"` promises `aria-valuenow`, and this field has **no value at all**
while it is empty or while its text is refused — which are precisely the two states the echo
exists for. A spinbutton with no `aria-valuenow` is a widget that under-reports itself to a
screen reader in its most important states, and it is the shape axe's `aria-required-attr`
rule exists to catch. The field is a textbox that also happens to step, and it says so.

**On `inputMode="numeric"`, which hides the colon on iOS.** That constraint is answered by
the grammar rather than worked around: a bare seconds count is a first-class form, so `90`
and `5400` are complete timecodes and the numeric keypad is sufficient on a phone. The
alternative — `inputMode="text"` for a field that accepts no letters — puts a full alphabet
in front of a person who needs eleven keys.

**On `parseTimecodeInput` taking no options.** The proposal carried an options bag. Every
knob considered belongs somewhere else: a maximum is the field's clamp at commit rather than
a parse failure (two sources for one fact is how a control ends up `aria-invalid` with
nothing saying why — `Field`'s own argument against a separate `isInvalid`), the decimal
comma is accepted unconditionally instead of being a locale switch, and a frame rate makes
this a different widget. An empty options bag is API a consumer has to read before learning
there is nothing in it.

**On the canonical output.** `formatTimecode`'s default is `hh:mm:ss.mmm` and the field
writes that back on commit, even for a value under a minute. One spelling means a re-read of
the field parses to the number that produced it, and a screenshot of the same value is the
same picture. `isHoursShown: false` and `millisecondDigits` exist for the read-only surfaces
that want the fleet's shorter forms — and `isHoursShown: false` still round-trips, because
the largest field present is unbounded.

## Evidence

- The five fleet printers, read on `master`: queuepilot `web/src/lib/tileFace.ts:118` and
  `web/src/components/NowPlayingBar.tsx:41`, castkit
  `packages/slatecast/src/formatTime.ts`, mux-magic
  `packages/web/src/components/TagMatchModal/TagMatchModal.tsx:50` and
  `packages/web/src/components/SmartMatchModal/SmartMatchModal.tsx:125`. No repo has a
  parser.
- mux-magic, `docs/audits/2026-06-29-pre-rename-domain-decisions.md:21`: the timecode
  conversion "uses Date math to avoid the `1:60` overflow. Don't narrow the regex or
  hand-roll the minute math."
- `timecode.test.ts`: 18 cases, and the majority of them are refusals — including a
  round-trip that asserts everything `formatTimecode` prints is read back by
  `parseTimecodeInput` as the number that produced it.
- `TimecodeInput.test.tsx`: 9 chromium cases, including the swap, the zero-length refusal,
  the clamp announcement, the four states of a section, and axe on each driven state.
