---
"@charcuterie/ui": minor
---

`Board`'s move handle now wears the gesture that can actually succeed.

`moveIcon` applies **while the lanes are side by side**. Once the board collapses to one
lane and a segmented control there is nothing on screen to drop onto, so the handle says
**Move** again — the word that reads as a button, opening the same menu of the other lanes.
An app that passes no `moveIcon` is unchanged.

Both affordances are in the DOM and CSS picks between them, so there is no `ResizeObserver`
and the first paint is right. Both are `aria-hidden` and the handle's whole accessible name
is a `VisuallyHidden` sentence beside them, so the name is identical at every width and one
`getByRole` query drives both layouts.

The board's own container is now **named `board`**, which is what lets a card query past the
lane it sits in. Naming it changes nothing else: a named container still answers the
unnamed `cq-lg:` queries the lanes and the segmented control already use.

See
[the decision](https://github.com/Sawtaytoes/charcuterie/blob/master/docs/decisions/2026-08-27-the-move-handle-wears-the-gesture-that-can-succeed.md).
