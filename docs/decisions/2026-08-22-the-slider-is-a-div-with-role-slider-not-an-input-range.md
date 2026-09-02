# The Slider is a `div` with `role="slider"`, not an `<input type="range">`

**Status:** Accepted
**Date:** 2026-08-22
**Type:** Component / platform hatch
**Supersedes:** —
**Superseded by:** —
**Extended by:** [2026-09-01-a-two-thumb-range-is-its-own-component-and-shares-the-bar.md](2026-09-01-a-two-thumb-range-is-its-own-component-and-shares-the-bar.md) — the two-thumb range named below as absent is now `RangeSlider`
**Extends:** [2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md](2026-08-20-native-select-is-deprecated-and-the-platform-hatch-is-closed.md)

## Decision

`Slider` is a focusable `div` carrying `role="slider"`, the ARIA APG's own pattern. The
library does **not** wrap `<input type="range">`, and an app may not reach for one.

Three shape decisions come with it:

1. **The role, the tab stop and the pointer target are the TRACK**, not the thumb.
2. **`onChange` fires per movement; `onChangeEnd` fires once**, on pointer release or key up.
   During a drag the component paints from its own local value rather than from `value`.
3. **`isReadOnly` is not `isDisabled`.** Read-only keeps full contrast and stays focusable.

## Context

QueuePilot's Now-playing bar needed a seek scrubber and the fleet had no component for
"pick a value along a range". `ProgressBar` is the nearest thing and is not it: it is
output, it takes no input, and `role="progressbar"` states that to assistive technology.

The choice in front of the app was a native range input or a hand-rolled slider in one repo.
Both are the failure the library exists to prevent, so the component comes here.

## Why not `<input type="range">`

Exactly the reason `Select` is deprecated, and it is the same mechanism rather than an
analogy.

A range input's thumb and track are **UA pseudo-elements** — `::-webkit-slider-thumb`,
`::-webkit-slider-runnable-track`, `::-moz-range-thumb`, `::-moz-range-track`,
`::-moz-range-progress`. They are not one surface and the engines do not agree on what is in
them: Firefox has a pseudo-element for the *filled* portion and Chromium does not, so the
fill is drawn by a gradient on the track in one engine and by a real element in the other. A
token-styled range is therefore two stylesheets that drift apart, and neither of them is
reachable by the `--color-*` variables every other component reads.

Windows paints its own regardless, which is the owner's original objection to the native
`<select>` and applies here unchanged.

`role="slider"` on a `div` has the same AT support, is what the APG specifies, and every
pixel of it is ours.

## Why the track owns the role

A hand-rolled slider usually puts the role and the tab stop on the **thumb**, because the
thumb is the part that looks draggable. That makes the widget a 16px box:

- a press on the bar does nothing, because the bar is not the control;
- `getByRole("slider")` returns the handle, so a Playwright bounding box is 16px wide and a
  test that clicks "the middle of the slider" clicks the thumb;
- the accessible object's position no longer describes the range it reports.

This is the same correction [`ProgressBar` made against rip-deck's](../2026-07-30-m5-ripdeck-the-first-consumer.md)
— the role goes on the track, not the fill — arrived at independently for the input case.

The hit area is a row taller than the bar, because a 2px track is not a pointer target and a
finger is 44px.

## Why drag does not commit

The expensive consumer of a slider is almost never the paint.

A seek scrubber calling the network from `onChange` sends one request per pointer sample and
arrives at the **right offset last**, behind a queue of stale ones — the classic scrubber
bug, and the reason the split is in the component rather than left to each caller to
rediscover.

The local-value half is what makes the split usable. A controlled slider whose owner commits
only on `onChangeEnd` never receives a new `value` during the drag, so painting from the prop
would pin the thumb under the finger at the old position: the drag would look broken while
behaving correctly.

## Evidence

- The fleet has no range control. QueuePilot's Now-playing bar was blocked on it, and the
  owner chose to add the component here rather than hand-roll one in the app
  (chat 2026-08-22).
- Steps anchor on `min`, not zero — a 7–19 range stepping by 4 anchored on zero reaches 8, 12
  and 16, and neither end of its own range is one of them. Asserted in `sliderValue.test.ts`.
- `fromFraction` takes `isRtl` because `getBoundingClientRect()` is physical. Without it a
  right-to-left slider runs backwards under the pointer while its keyboard path stays
  correct.
- The thumb offsets with `margin-inline-start`, not `translate: -50%`. `translate` is
  physical, so in RTL it shifts the thumb the wrong way and 0% hangs off the start edge —
  the one bug a logical `inset-inline-start` looks like it has already solved.

## Notes

- Single value only. A two-thumb range is a different widget with its own focus model, and
  nothing in the fleet has asked for one. **QueuePilot asked on 2026-09-01, and that
  sentence is the argument for the shape it got**: `RangeSlider` is its own component
  ([2026-09-01](2026-09-01-a-two-thumb-range-is-its-own-component-and-shares-the-bar.md)),
  sharing this one's arithmetic and its bar and nothing else. `Slider` is unchanged.
- Horizontal only. `aria-orientation` is written so a vertical variant can arrive without
  changing what AT already reads.
