---
"@charcuterie/ui": patch
---

`Combobox`: the open seed's scroll now waits for a panel it can actually scroll.

Completes the previous patch, which highlighted the chosen option correctly and still
left it off screen in a real app — a fix that was half-landed, and worth naming as such.

`useAnchoredOverlay` caps the panel's height by writing `style.maxHeight` straight onto
the floating element inside floating-ui's `size` middleware. That is deliberate and
documented: a `setState` in `apply` would be a render loop, and keeping the value out of
the `floatingStyles` React manages is what stops a keystroke wiping it. The cost lands on
anything that wants to scroll the panel on open. The write arrives a frame after the
seed, announces itself with no re-render, and until it does the list stands at its **full
content height with nothing to scroll** — so the centring is dropped without a trace.

The seed now holds until the list is genuinely scrollable, retrying for a few frames and
then giving up, so a list that really does fit its panel cannot spin.

The gap was in the tests as much as the code: the story asserted the *highlight* and set
a static `max-h-48`, which made the list scrollable on first layout and removed the very
condition the bug needs. It is 62 options under floating-ui's own cap now — the shape an
app picker actually has — and there is a test that asserts the chosen row's rectangle
lies inside the list's, which is the thing a user can see.
