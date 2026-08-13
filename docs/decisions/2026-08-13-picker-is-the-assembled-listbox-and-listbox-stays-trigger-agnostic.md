# `Picker` is the assembled `Listbox`; `Listbox` stays trigger-agnostic

**Status:** Accepted
**Date:** 2026-08-13
**Type:** API · Component
**Supersedes:** —
**Superseded by:** —

## Decision

`@charcuterie/ui` ships **`Picker`**: a `Listbox` with its trigger already attached — a button
showing the current value, a chevron, and the open state owned internally.

`Listbox` is **unchanged**. It keeps taking a `trigger` element and owning no visibility
state, because that is what lets it hang off a tile, a table header, or anything else that is
not a button. `Picker` is the assembled default for the common case, not a replacement.

The name is **`Picker`**, chosen by the owner over `SelectListbox` (what queuepilot called
its version) and `ListboxButton`.

## Context

[The 2026-08-10 record](2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md)
demoted native `Select`, making `Listbox` the default picker. What followed was predictable in
hindsight: every app that migrated had to assemble the same trigger, and none of them shared
it.

Measured with `rg -uu` across the fleet on 2026-08-13 — **four independent implementations**:

| Repo | File | Open state | Chevron |
| --- | --- | --- | --- |
| queuepilot (renamed from plex-channels; older records here use the old name) | `web/src/components/SelectListbox.tsx` | `useVisibility` | hand-rolled |
| board-games | `packages/web/src/components/SelectMenu.tsx` | `useState` | hand-rolled |
| mux-magic | `packages/web/src/components/DslRulesBuilder/ListboxPicker.tsx` | `useVisibility` | none |
| **`@charcuterie/ui` itself** | `QueryBuilderCombinator.tsx` **and** `QueryBuilder.stories.tsx` | `useVisibility` | none |

The fourth is the one that settles it. When the library writes the wrapper **twice in its own
source**, the wrapper is not an app concern.

The owner's call, on being shown the count:

> "Let's make a shared piece then if they're all using the same logic. Good catch!"

## Why

- **A trigger-agnostic primitive plus an assembled default is the same split the package
  already makes elsewhere** — `Modal` is the base layer and `Dialog` is the component
  ([2026-08-03](2026-08-03-modal-is-the-base-layer-and-dialog-is-the-component.md)). Nothing
  about `Listbox` needs to change for `Picker` to exist.
- **The duplication was not uniform, and the differences were bugs.** board-games used
  `useState` instead of the state layer. queuepilot set `aria-label={label}` alone, so the
  accessible name did **not** contain the trigger's visible text — a WCAG 2.5.3 failure that
  four separate reviews missed. `Picker` names the trigger `"<label>: <value>"`, which fixes
  it and makes each control uniquely findable by role and name.
- **One of the four had already paid for a trap the others will hit.**
  `useAnchoredOverlay` overwrites the trigger's `id`, so an `id` passed to any of these
  wrappers is silently replaced; queuepilot discovered this through broken e2e selectors
  and moved to `data-testid`. That is now documented on the component instead of rediscovered.

## Naming, and the objection to it

`Picker` sits next to the state kinds `useSinglePicker` / `useMultiplePicker`, which invites
the reading that it is their component. It is not, and the objection was raised before the
name was chosen. `useSinglePicker` is a state kind composed by `Listbox`, `Combobox` and
`Tabs`; it has no component of its own, and `Picker` owns a `useVisibility` while delegating
selection to `Listbox`. Recorded here and in the component's docstring so the next reader does
not have to reconstruct it.

## Consequences

- `Picker` is exported from the barrel; component count in `sourceRules.test.ts` goes 44 → 45.
- **The chevron is `iconEnd`, defaulting to a chevron and overridable with `null`.** That is
  not decoration: `QueryBuilderCombinator` shipped in `2.14.0` without one, so adopting
  `Picker` there with the default would have moved pixels in eight VRT shots and made an
  extraction look like a redesign. A refactor onto a shared component should be visually
  inert; adding the affordance to `QueryBuilder` is a visual change that deserves its own PR.
- `QueryBuilderCombinator` and the `QueryBuilder` story adopt it in the same change — two of
  the four duplications are gone on landing.
- The remaining two are app-side and **not** migrated here: queuepilot's `SelectListbox` and
  board-games' `SelectMenu`. Both are drop-in shaped, but queuepilot's e2e queries its
  trigger by the bare `aria-label`, so adopting `Picker` there is a real (small) migration
  rather than a delete-and-import. Left for those repos to take deliberately.

## Evidence

Owner, 2026-08-13, on the duplication count:

> "Let's make a shared piece then if they're all using the same logic. Good catch!"

Owner, same session, on the name — asked with `SelectListbox` recommended and the
`useSinglePicker` collision flagged:

> `Picker`
