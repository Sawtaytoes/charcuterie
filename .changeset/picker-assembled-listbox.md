---
"@charcuterie/ui": minor
---

`Picker` — a `Listbox` with its trigger already attached

The fleet wrote this same wrapper four separate times after `Listbox` became the default
picker: queuepilot's `SelectListbox`, board-games' `SelectMenu` (on `useState` rather than
the state layer), mux-magic's `ListboxPicker`, and twice inside this package
(`QueryBuilderCombinator` and `QueryBuilder`'s own story), each with its own hand-rolled
chevron.

```tsx
<Picker
  label="Language"
  onChange={setLanguage}
  options={[{ label: "English", value: "eng" }]}
  value={language}
/>
```

`Listbox` is **unchanged** — staying trigger-agnostic is what lets it hang off a tile or a
table header. `Picker` is the assembled default beside it.

Two things worth knowing when migrating a hand-rolled version:

- **The accessible name is `"<label>: <value>"`**, not the bare label. The trigger's visible
  text is the value, and WCAG 2.5.3 wants the visible text inside the accessible name — a
  bare `aria-label={label}` fails it. Query with `getByRole("button", { name: /^Label: / })`.
- **`id` does not survive.** `useAnchoredOverlay` overwrites the trigger's `id` so the
  portalled listbox can name itself from it; use `data-testid`, which nothing injects.
