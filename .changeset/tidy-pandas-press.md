---
"@charcuterie/ui": minor
---

**`BadgeButton` — a `Badge` you can press, so a pill-shaped control stops being a hand-rolled `<button className="badge …">`.**

QueuePilot has six of them: per-entry setting tags, an Edit chip, two start-point chips, a group chip and a pool's Exclude chip. Each opens an editor or changes a value, so each has to be pressable — and `Badge` is a `<span>` with no way to become one, which left the app painting its own pill in unlayered CSS and the migration to Charcuterie stuck at six controls.

A **sibling component**, exactly as `ButtonLink` is to `Button`, rather than an `asChild` prop or a `Badge` that turns into a `<button>` when it is handed an `onClick`. This library has no polymorphism pattern and has not needed one; and an element type that changes as a side effect of a handler fails silently — forget the handler and the control ships as a `<span>`, out of the tab order and invisible to `getByRole("button")`, with no error anywhere. `onClick` is required here instead, so a pill nobody can press is a `Badge` by construction.

The paint is shared, not copied: `Badge` and `BadgeButton` both build their pill through the new `useBadgeShape`, and `BadgeButton.test.tsx` compares the two elements' **computed** styles in the browser. What the element adds is what the platform hangs off it — focus, the tab order, Enter and Space, native `:disabled`, form participation, and a role a screen reader announces as pressable.

Two defaults: `type="button"`, because these chips sit inside forms and the platform's `submit` would make a start-point chip save the dialog; and `ghost` stays excluded, inherited from `Badge`, because a pill that paints nothing until hovered has no pill left.
