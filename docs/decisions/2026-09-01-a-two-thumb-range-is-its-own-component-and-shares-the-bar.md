# A two-thumb range is its own component, and it shares the bar

**Status:** Accepted
**Date:** 2026-09-01
**Type:** Component / API
**Supersedes:** —
**Superseded by:** —
**Extends:** [2026-08-22-the-slider-is-a-div-with-role-slider-not-an-input-range.md](2026-08-22-the-slider-is-a-div-with-role-slider-not-an-input-range.md)

## Decision

`RangeSlider` is a **separate component**, not an `isRange` mode on `Slider`. It answers the
note the Slider record closed with — *"Single value only. A two-thumb range is a different
widget with its own focus model, and nothing in the fleet has asked for one"* — because
something has now asked for one, and because that sentence is also the argument for the
shape.

Four rules come with it:

1. **The role moves to the thumbs, and the track becomes a `role="group"`.** Each thumb is
   its own `role="slider"` with its own `aria-valuenow` / `aria-valuemin` /
   `aria-valuemax` / `aria-valuetext`, and its own name (`${label} start`, `${label} end`).
   The group carries `label`. One tab stop becomes two.
2. **The thumbs clamp; they do not swap.** A thumb pushed past its partner stops on it, the
   range collapses to zero width, and both handles keep their identities. Each thumb
   reports the other as its own `aria-valuemin` / `aria-valuemax`.
3. **A press on the bar moves the nearer thumb.** The bar is still the pointer target. When
   the two sit on one value, the side the press landed on decides.
4. **The bar is shared, through `packages/ui/src/sliderStyles.ts`.** Track, fill, thumb and
   row height are one definition that `Slider` and `RangeSlider` both read, and the
   arithmetic in `Slider/sliderValue.ts` is **called** rather than copied.

`onChange` per movement and `onChangeEnd` once, `value` seeds rather than controls, the
drag paints from a local value, height from the shared control-size system with no touch
floor, and no `error` prop — all four are the Slider record's, unchanged. A group's error
belongs on the `FieldGroup` around the control.

## Context

QueuePilot is adding "play only this section of a video". A user drags two handles over a
film's runtime to choose where a clip starts and ends, and has to **see** the section they
typed into a `TimecodeInput` beside it. The fleet has `Slider`, which is one value, and
nothing else.

## Why a component and not a mode

The library names components by **ARIA role**, and it has twice decided that a second
shape is a *mode* rather than a sibling —
[`Combobox`'s `isMultiple`](2026-08-05-combobox-multi-select-stays-ismultiple-not-a-separate-component.md)
and [`DatePicker`'s `isRange`](2026-08-19-a-date-is-a-calendar-date-not-an-instant.md). Both
of those turned on one test, stated twice in almost the same words: **the role does not
change, and the shared part is everything.** A tag multi-select is still a combobox over a
listbox; a date range is still a dialog over a grid.

Run that test here and both halves come back false.

**The role changes.** The Slider record's first shape decision is that *"the role, the tab
stop and the pointer target are the TRACK"*, and it is right for one value: a track that
reports one number is one accessible object. Two numbers cannot live on one accessible
object — `aria-valuenow` is singular — so the role has to move to the thumbs, which is
precisely the placement the Slider record argued **against** for the single-value case. The
APG's multi-thumb pattern says the same thing. So `Slider isRange` would be a component that
rewrites its own role from a boolean: `getByRole("slider", { name })` returns one element or
two depending on a prop, and every consumer's test of the single-value one breaks the day
somebody adds a second thumb somewhere else.

**The shared part is not everything.** The value type changes from `number` to
`{ end, start }`. The tab stops go from one to two. Three behaviours have no single-value
analogue at all — the crossing rule, picking the nearer thumb, and painting a span between
two positions rather than a fill from the start.

This is the same conclusion, and the same method,
[`ActionTiles`](2026-09-01-a-tile-that-acts-is-its-own-component-and-shares-only-the-box.md)
reached last week against the choice-tile record: invert every clause of the test the mode
rested on, and if they all invert, it is a component.

**What that leaves is drift**, which is the real cost of a second component and the reason
the box is extracted rather than copied. `sliderStyles.ts` holds the track, the fill, the
thumb and the row, exactly as `tileStyles.ts` holds the tile; `sliderValue.ts` is imported
rather than re-derived, so both controls snap on a grid anchored on `min` and both get the
float-step rounding and the `NaN` guard. `RangeSlider.test.tsx` compares a range thumb and a
slider thumb as **computed** styles, so a class-name refactor cannot quietly separate them.

## Why `TimecodeInput` took `isRange` and this did not

The other half of the same consumer feature landed the same day, and it went the other way:
[`TimecodeInput`'s section is a mode](2026-09-01-a-timecode-is-milliseconds-and-a-section-is-a-mode.md).
QueuePilot's clip editor puts that field and these two thumbs over **one** value, so the
difference is worth stating rather than leaving as an inconsistency.

It comes out of the same test, applied honestly to two different widgets. A second text
field is **still a text field**: `isRange` gives `TimecodeInput` two `textbox`es, and each
one reports its own value the way one of them already did. A second thumb cannot share one
`aria-valuenow`, so the same prop on `Slider` would move the role off the element that has
it. The mode test does not care which shape is "bigger"; it asks whether the ARIA changes.

Two rules genuinely differ, and both differences are the gesture rather than the value.

**Inverted: that record swaps, this one clamps.** They agree more than they look. A typed
pair arrives **complete** — somebody who types the end first has given two real boundaries,
and throwing one away is worse than reordering them — and `snapRange` does exactly that to
a `value` prop that arrives backwards. What clamps is a *live* thumb: the pointer is still
down, so there is a handle being held and a next movement to interpret, which a committed
pair does not have.

**Zero length: that record refuses, this one draws it.** A section with no length plays
nothing, and refusing it is right for the surface where the value is **committed**. A drag
passes through zero on its way to somewhere, so the slider cannot refuse it without
refusing the gesture. The policy therefore lives at the commit, not on the bar: an app that
forbids an empty clip refuses it in the field or in its own `onChangeEnd`, and this
component has no `minimumSpan` prop precisely so the two surfaces cannot hold different
opinions about the same value.

## Why the thumbs clamp instead of swapping

Both are defensible and libraries ship both. Clamping wins here on three counts.

**The consumer names its handles.** These are a clip's start and its end, read beside a
`TimecodeInput` that says which is which. A drag that silently renamed the handle under the
pointer would change a number the user is reading somewhere else.

**Swapping breaks the keyboard outright.** With two independent tab stops, a swap means one
ArrowRight moves the *other* thumb: the element with focus is no longer the value that
changed, and the next arrow key goes to a handle the user is no longer looking at. There is
no swap behaviour that is coherent for the keyboard, and the keyboard is not optional.

**Clamping is expressible in ARIA and swapping is not.** With the clamp, the start thumb's
`aria-valuemax` *is* the end thumb's value, so a screen reader is told where this handle
stops in the only vocabulary a slider has. A swapping widget has to announce a range it
does not actually enforce.

The cost is a reachable collapsed state — both thumbs on one value, a span of zero width.
That is why the tie rule exists: a press below the pair picks the start and a press on or
above it picks the end, so a collapsed range opens again in either direction. It is a story
(`AllStates`), a node test, and a driven chromium test with an axe run on it.

## What this deliberately does not cover

- **No minimum span.** A clip of zero length is legal here and an app that forbids it
  refuses it where the value commits — `TimecodeInput` already does, and a second opinion
  living on the bar would let the two halves of one editor disagree. A `minimumSpan` prop
  is a new decision, not a call-site choice.
- **No more than two thumbs.** Three handles is a different focus model again, and nothing
  has asked.
- **Horizontal only**, as `Slider` is. `aria-orientation` is written so a vertical variant
  can arrive without changing what assistive technology already reads.
- **Ticks are a list of positions, not a chapter model.** `{ label?, value }`, drawn
  `aria-hidden` because both thumbs already announce where they are. The component never
  learns what a chapter is, for the same reason `valueFormat` is how a timecode reaches it:
  the library owns the shape, the app owns the data.

## Evidence

- The Slider record's own Notes: *"Single value only. A two-thumb range is a different
  widget with its own focus model, and nothing in the fleet has asked for one."* This record
  extends it; the Slider record is edited only to point here, and its meaning is unchanged.
- QueuePilot's clip feature is the asker, and the other half of it — the `TimecodeInput`
  the two handles are read against — landed the same day, in
  [its own record](2026-09-01-a-timecode-is-milliseconds-and-a-section-is-a-mode.md). Four
  of its choices are matched here on purpose: `value` seeds rather than controls, there is
  no `error` prop because `Field`/`FieldGroup` owns the semantic error, the height comes
  from `CONTROL_SIZE_CLASS` with no touch floor, and the app names its own units.
- `rangeSliderValue.test.ts`: 13 node cases, and the interesting half are the crossing rule
  and the tie rule.
- `RangeSlider.test.tsx`: 10 chromium cases, including both thumbs driven by keyboard, a
  drag that travels past the other handle, an axe run on the **collapsed** state, and the
  computed-style comparison against `Slider`'s thumb.
