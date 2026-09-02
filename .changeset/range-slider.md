---
"@charcuterie/ui": minor
---

`RangeSlider` — a two-thumb range control. A span picked out along a bar, with an
independently focusable handle at each end: two `role="slider"` thumbs inside a
`role="group"` that carries the label, each with its own value, its own name
(`${label} start` / `${label} end`) and the full arrow / Page / Home / End keyboard path.

It comes from QueuePilot's "play only this section of a video": a user drags two handles
over a film's runtime, and has to see the section they typed into a `TimecodeInput` beside
it. So the shape is a media timeline — `valueFormat` renders `hh:mm:ss` into
`aria-valuetext` and the shown span, and `ticks` draws a film's chapter offsets as marks.
The component never learns what a timecode or a chapter is.

**A component rather than a `Slider isRange` mode.** `Combobox`'s `isMultiple` and
`DatePicker`'s `isRange` are modes because the widget's role does not change and the shared
part is everything; both halves of that test are false here. `Slider` puts `role="slider"`,
the tab stop and the pointer target on the **track**, and two values cannot live on one
accessible object — so the role moves to the thumbs and one tab stop becomes two.

**The thumbs clamp; they do not swap.** A thumb pushed past its partner stops on it and the
range collapses to zero width, keeping its identity; each thumb reports the other as its own
`aria-valuemin` / `aria-valuemax`. A press on the bar moves the nearer thumb, and when the
two sit on one value the side of the press decides — which is what opens a collapsed range
again.

`onChange` per movement and `onChangeEnd` once, `value` seeds rather than controls, and the
drag paints locally — all as `Slider` settled them.

`Slider` is unchanged in behaviour: the bar it paints now lives in `sliderStyles.ts`, which
both components read, and the arithmetic in `sliderValue.ts` is called rather than copied.
`SliderSize` is re-exported from the same place it always was.
