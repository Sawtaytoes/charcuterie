---
"@charcuterie/ui": minor
---

`QueryBuilder`'s combinator picker is a `Listbox`, not a native `Select`

The component shipped with a native `Select` for each group's "Match" control, one day after
[the 2026-08-10 record](../docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md)
demoted `Select` to a stated-reason exception. `charcuterie/prefer-listbox-over-select` did not
catch it: the component-choice block is scoped to app packages and exempts `@charcuterie/ui` —
correct for a primitive, wrong for a composite an app consumes whole.

**Breaking for tests, not for props.** The control is now a button that opens a listbox, so
`getByRole("combobox", { name: "Match" })` no longer finds it. Query
`getByRole("button", { name: /^Match: / })` instead. The name carries the current combinator
because the trigger's visible text is that value and WCAG 2.5.3 wants the visible text
contained in the accessible name.

Adds `labels.match` (default `"Match"`) to rename the caption.

Adds `renderCombinator`, so an app can own the group's combinator control the way it already
owns `renderLeaf`. The default single picker stays right for a combinator that is a plain
enum; it is the wrong shape for one that is a *product* — mux-magic's is a quantifier
(ANY/ALL/NO) crossed with a target (nested groups, style rows, script-info blocks), whose
legal pairs are asymmetric (`notAllScriptInfo` exists, `notAllStyle` does not). Flattened into
one list that asymmetry is invisible; split into two filtered pickers it cannot be built.
