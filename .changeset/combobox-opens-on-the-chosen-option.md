---
"@charcuterie/ui": patch
---

`Combobox` opens on the chosen option, not the top of the list.

`Listbox` has always followed the APG rule — *"a reopened one resumes on the current
value rather than the top"*, in its own words. `Combobox` seeded its highlight at index
0 instead, so a picker with a value set opened on the head of its list with the chosen
row scrolled out of sight. Two costs, and the report named both: correcting a misclick
meant scrolling the list again to find the value you had just set, and a panel that
shows no trace of your choice reads as though nothing were chosen at all.

Opening now lands on the chosen row, **centred** rather than merely in view — `nearest`
would park it against the panel's bottom edge with nothing after it, so the neighbours
the list was reopened to reach would still be off screen.

Three things deliberately did **not** change:

- **Typing still reseeds to the top match.** A live query owns the highlight; the seed
  only runs while the query is empty.
- **A chosen value that has not loaded yet keeps waiting.** A picker that fetches its
  options when it opens holds at the top and seeds when the rows arrive.
- **Attached-input mode is unaffected** — the consumer owns the value there, so there
  is nothing to seed.

Also fixed, and found by the a11y gate while proving the above: in a **windowed** list
`aria-activedescendant` could name a row outside the rendered window — an idref a
screen reader cannot resolve, and an `aria-valid-attr-value` failure. The virtualizer
moves its window a tick after the scroll offset changes, so the reference now waits one
frame for its row instead of dangling. The highlight and every commit still run off the
resolved index, so only the announcement waits, never the behaviour.
