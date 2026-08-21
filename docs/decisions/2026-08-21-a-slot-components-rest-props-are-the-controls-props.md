# A component's rest props land on the element it owns — for a slot, that is the control

- **Status:** Accepted
- **Date:** 2026-08-21
- **Type:** Component contract
- **Supersedes:** —
- **Superseded by:** —

## Decision

`FieldProps` and `FieldGroupProps` stop being closed types and spread their rest props, like
`Button`, `Badge` and `Picker` already do. The destination is one rule with two readings,
because the two components own different elements:

- **`Field` clones its child**, so its props are that **control's** props. `name`,
  `placeholder`, `autoFocus`, `aria-*` and `ref` land on the cloned control, next to the
  `id` that has landed there since the component shipped. `className` is the single
  exception and stays on the wrapping `<div>`.
- **`FieldGroup` wraps its children**, so its props are the **`<fieldset>`'s** — `id`,
  `hidden`, `ref`, and the element's own `disabled`, `form` and `name`. `className` is not
  an exception here, because the `<fieldset>` is also the outermost element it renders.

`Checkbox` gains a `description` in the same change, with `Field`'s semantics: bound with
`aria-describedby`, rendered outside the `<label>`, and wearing the same `text-sm` /
`content-secondary` a `Field` description wears.

## Context

The owner set a standing rule for queuepilot on 2026-08-21:

> I'd prefer not to use borrowed classes rather than component library components which have
> all the Tailwind classes built in. No className props required. It's all props.

queuepilot then adopted these components across its editors and hit a wall in `DynModal.tsx`,
which the code still carries as a comment:

> ⚠️ `className="dyn-lineup"`, not `id="dyn-lineup"`, and that is not a preference.
> `FieldGroupProps` is a closed six-key type with no rest spread, so `id`, `data-testid` and
> `hidden` cannot reach the `<fieldset>` at all — the one prop it does forward is
> `className`. Reported upstream.

Two boxes, two defects. `#dyn-lineup` became a `FieldGroup` and **gave up an `id` its
screenshot suite drives by**, falling back to a class that matches no rule and exists only as
a DOM handle. `#dyn-collections` stayed a hand-rolled `<fieldset>`, because it needs `hidden`.

That is the sharpest argument for the change and it is worth stating plainly: **a component
that accepts only `className` forces the very thing the rule forbids.** The escape hatch the
rule exists to close was the only door left open.

`Checkbox`'s missing `description` is the same shape one level down. `Field` has had one
since it shipped, so a hint after a `Field` came from the library while a hint after a
`Checkbox` had to be the app's own paragraph — and the two disagreed about how big a hint is.
One hint out of three in the queuepilot group stayed app-styled and the box carried two hint
typographies.

## Why

**Why the control and not the wrapper, for `Field`.** Three reasons, in order of weight.

1. **It is where they already go.** `SlotProps` was a closed five-key *type* over a runtime
   that spreads `...receivedSlotProps` straight into the clone. `name`, `onBlur` and every
   `aria-*` already arrived at the `<input>`; none of them type-checked. This change declares
   the existing destination rather than choosing a new one, which is why it cannot break a
   consumer.
2. **A pass-through cannot tell who wrote a prop.** One object holds both what a cloning
   ancestor injected and what the author typed. A `Tooltip` around a `Field` hands down
   `getReferenceProps()` — hover, focus and dismiss handlers, `refs.setReference`, and an
   `aria-describedby` naming the tip — and all of it must reach the control at the bottom or
   the tip is a floating node with no trigger and no anchor. Holding the author's props back
   at the `<div>` needs a **closed runtime allow-list**, and `slotProps.ts` already rejected
   one: it is mux-magic's `FieldTooltip` silent drop rebuilt inside the fix for it. The first
   slot that writes an `aria-expanded` breaks and nothing says so.
3. **`id` is settled and must not move.** The
   [2026-08-05 record](2026-08-05-field-adopts-the-childs-own-id.md) fixes its precedence as
   `<Field id>` → the child's own → generated, and the `<label htmlFor>` points at the
   result. Routing the rest to the `<div>` moves `id` with them, silently, in every consumer
   — a dangling `htmlFor` throws nothing and renders nothing.

**Why `className` is still the exception.**
[`className` is the outermost box a component renders](2026-08-19-classname-is-the-outermost-box-a-component-renders.md),
and that record's reasoning is about *layout*: width, margin, `display`, grid placement are
properties of the element a **parent** positions. That is a statement about the box, and it
is the only statement about the box a caller usually makes. Every other prop is a statement
about the control. So the rule is one sentence with one exception, rather than a split a
reader has to memorise per prop.

**Why this does not contradict that record.** It applies to `FieldGroup` unchanged — rest
props and `className` land on the same element, because that component renders one. `Field`
is the case the record does not reach: it clones rather than wraps, so "outermost element it
renders" and "the element its props describe" are not the same element, and the record was
written about the first of those.

**Why `FieldGroup` and not a second escape hatch on `Field`.** `#dyn-collections` wants
`hidden` and an `id` on a box whose label names one control. A `wrapperProps` object, or a
`boxId` beside `id`, is API for a case the library already has a component for: `FieldGroup`
wraps, so its props have nowhere else to go. Adding a second door on `Field` would also have
been the trap the owner's rule is about — two ways to say one thing, one of them a hatch.

**Why `mergeSlotProps` and not a spread.** `aria-describedby` is the one prop in the set that
is a **list**, and opening the type is exactly what lets a caller write one. `FieldGroup`
goes through `mergeSlotProps`, so a caller's value joins the group's description and error
rather than replacing them — received first, then description, then error. Its
`receivedProps` parameter is now generic in `ReceivedProps extends SlotProps` so a wrapping
component keeps its own prop type on the way out; narrowing to `SlotProps` would have dropped
`disabled`, `form`, `name` and every `data-*` from the type of the object spread onto the
`<fieldset>`, and only the type would have lied.

**Why `Checkbox`'s description is outside the `<label>`.** A `<label>`'s text content *is*
the control's accessible name. A hint inside it is announced twice — once inside the name,
once again as the description — and a pointer press on a sentence of explanation toggles the
box. So the `<label>` stops being the outermost element, a `<div>` holds the row and the
hint, and `className` moves out to it. `EmptyState` restructured for the same reason when its
container query needed an inner wrapper, and this follows it. No fleet call site passes a
`className` to a `Checkbox`, so the move costs nothing today.

**Why `opacity-60` does not dim the hint.** It was moved to the wrapper first, so the hint
would dim with its control, and this component's own axe run caught it: axe exempts a
**disabled control and its own label** from the colour-contrast rule and exempts nothing
else, so a dimmed sibling paragraph measured **3.77:1** on `midnight` against a 4.5
threshold. A hint nobody can read is worse than a hint that does not dim, and a turned-off
box is exactly when that sentence gets read.

**Why no `error` on `Checkbox`.** `Field` derives `aria-invalid` from its error. A lone
boolean is almost never the invalid thing — a *group* of them is — and a group's error
belongs on the `FieldGroup` around it, described rather than asserted, which is what the
[group's own limitation](../../packages/ui/src/Field/FieldGroup.tsx) already says.

## Evidence

- `Field.stories.tsx` → `ForwardsRestProps`, and three tests in `Field.test.tsx`:
  - `a rest prop reaches the control, not the box around it` — `name` and `placeholder` are
    on the `<input>`, and the element carrying them **is** the control the label names.
  - `a caller's aria-describedby composes with the description and the error` — three ids in
    order, the caller's first, and `aria-invalid` untouched.
  - `a rest prop reaches the fieldset, and the fieldset disables what is inside it` —
    `id="playback-lineup"` on a `FIELDSET`, the group's own `aria-describedby` intact
    beside it, and the `<input>` inside it disabled by the element.
- `Checkbox.stories.tsx` → `WithDescriptions`, and three tests in `Checkbox.test.tsx`. The
  load-bearing one is the name assertion: `checkbox.closest("label")?.textContent` is the
  label and **only** the label, which is what fails if the hint is ever moved inside it.
- Verified downstream against `queuepilot@master` with the built package: `#dyn-lineup`
  keeps `id="dyn-lineup"` on its `<fieldset>`, and `#dyn-collections` becomes a `FieldGroup`
  carrying `hidden` and its `id`. The blocking comments in `DynModal.tsx` describe both.
- Additive throughout: no existing call site changes, and `yarn typecheck` passes across the
  workspace with the widened types in place.
